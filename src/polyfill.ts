import { detect } from 'detect-browser'

let memoizedPolyfills: ((...args: any[]) => void)[] | undefined

const webkitBrowsers = [
  'android',
  'bb10',
  'crios',
  'facebook',
  'fxios',
  'instagram',
  'ios-webview',
  'ios',
  'phantomjs',
  'safari',
]

export const symbolObserver = Symbol('MarpitSVGWebkitPolyfillObserver')

export function observe() {
  if (window[symbolObserver]) return
  window[symbolObserver] = true

  if (polyfills().length === 0) return

  const observer = () => {
    for (const polyfill of polyfills()) polyfill()
    window.requestAnimationFrame(observer)
  }

  observer()
}

export function polyfills() {
  if (!memoizedPolyfills) {
    memoizedPolyfills = []

    const { name } = detect() || <any>{}
    if (webkitBrowsers.includes(name)) memoizedPolyfills.push(webkit)
  }
  return memoizedPolyfills
}

export function resetPolyfills() {
  // Reset memoized polyfills for test
  memoizedPolyfills = undefined
}

export function webkit(zoom?: number) {
  Array.from(document.getElementsByTagName('svg'), svg => {
    if (svg.hasAttribute('data-marpit-svg')) {
      const { clientHeight, clientWidth } = svg
      if (!svg.style.transform) svg.style.transform = 'translateZ(0)'

      // NOTE: Safari reflects a zoom level to SVG's currentScale property, but
      // the other browsers will always return 1. You have to specify the zoom
      // factor manually if it is used in Blink engine. (e.g. Electron)
      const zoomFactor = zoom || svg.currentScale || 1

      const width = svg.viewBox.baseVal.width / zoomFactor
      const height = svg.viewBox.baseVal.height / zoomFactor
      const scale = Math.min(clientHeight / height, clientWidth / width)

      Array.from(
        svg.querySelectorAll<SVGForeignObjectElement>(':scope > foreignObject'),
        foreignObject => {
          const x = foreignObject.x.baseVal.value
          const y = foreignObject.y.baseVal.value

          Array.from(
            foreignObject.querySelectorAll<HTMLElement>(':scope > section'),
            section => {
              if (!section.style.transformOrigin) {
                section.style.transformOrigin = '0 0'
              }

              const tx = (clientWidth - scale * width) / 2 - x
              const ty = (clientHeight - scale * height) / 2 - y

              section.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${scale}) translate(${x}px,${y}px)`
            }
          )
        }
      )
    }
  })
}
