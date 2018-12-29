import { detect } from 'detect-browser'

const symbolObserver = Symbol('MarpitSVGWebkitPolyfillObserver')

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

export function observe() {
  if (window[symbolObserver]) return

  const { name } = detect()
  if (!webkitBrowsers.includes(name)) return

  window[symbolObserver] = true

  const observer = () => {
    polyfill()
    window.requestAnimationFrame(observer)
  }
  observer()
}

export function polyfill() {
  Array.from(document.getElementsByTagName('svg'), svg => {
    if (svg.hasAttribute('data-marpit-svg')) {
      const { clientHeight, clientWidth } = svg
      if (!svg.style.transform) svg.style.transform = 'translateZ(0)'

      const foreignObject = <SVGForeignObjectElement>svg.childNodes[0]
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
    }
  })
}

export default observe
