import { detect } from 'detect-browser'

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

  const { name } = detect() || <any>{}
  const polyfills: (() => void)[] = []

  if (webkitBrowsers.includes(name)) polyfills.push(webkit)
  if (polyfills.length === 0) return

  const observer = () => {
    for (const polyfill of polyfills) polyfill()
    window.requestAnimationFrame(observer)
  }

  observer()
}

export function webkit() {
  Array.from(document.getElementsByTagName('svg'), svg => {
    if (svg.hasAttribute('data-marpit-svg')) {
      const { clientHeight, clientWidth } = svg
      if (!svg.style.transform) svg.style.transform = 'translateZ(0)'

      Array.from(svg.getElementsByTagName('foreignObject'), foreignObject => {
        const foWidth = foreignObject.clientWidth
        const foHeight = foreignObject.clientHeight
        const scale = Math.min(clientHeight / foHeight, clientWidth / foWidth)

        Array.from(foreignObject.getElementsByTagName('section'), section => {
          if (!section.style.transformOrigin) {
            section.style.transformOrigin = '0 0'
          }

          section.style.transform = `translate3d(${clientWidth / 2 -
            (scale * foWidth) / 2}px,${clientHeight / 2 -
            (scale * foHeight) / 2}px,0) scale(${scale})`
        })
      })
    }
  })
}
