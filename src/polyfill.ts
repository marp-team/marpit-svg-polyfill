import { detect } from 'detect-browser'

let memoizedPolyfills: (() => void)[] | undefined

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

export function webkit() {
  Array.from(document.getElementsByTagName('svg'), svg => {
    if (svg.hasAttribute('data-marpit-svg')) {
      const { clientHeight, clientWidth } = svg
      if (!svg.style.transform) svg.style.transform = 'translateZ(0)'

      const { width, height } = svg.viewBox.baseVal
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
