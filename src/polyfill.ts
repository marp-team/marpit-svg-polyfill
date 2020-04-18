export const observerSymbol = Symbol()

export function observe() {
  if (window[observerSymbol]) return

  Object.defineProperty(window, observerSymbol, {
    configurable: true,
    value: true,
  })

  const observedPolyfills = polyfills()

  if (observedPolyfills.length > 0) {
    const observer = () => {
      for (const polyfill of observedPolyfills) polyfill()
      window.requestAnimationFrame(observer)
    }
    observer()
  }
}

export const polyfills = () =>
  navigator.vendor === 'Apple Computer, Inc.' ? [webkit] : []

export function webkit(zoom?: number) {
  Array.from(document.getElementsByTagName('svg'), (svg) => {
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
        (foreignObject) => {
          const x = foreignObject.x.baseVal.value
          const y = foreignObject.y.baseVal.value

          Array.from(
            foreignObject.querySelectorAll<HTMLElement>(':scope > section'),
            (section) => {
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
