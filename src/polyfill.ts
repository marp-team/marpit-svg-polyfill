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
  Array.from(
    document.querySelectorAll<SVGSVGElement>('svg[data-marpit-svg]'),
    (svg) => {
      const { children, clientHeight, clientWidth, viewBox } = svg
      if (!svg.style.transform) svg.style.transform = 'translateZ(0)'

      // NOTE: Safari reflects a zoom level to SVG's currentScale property, but
      // the other browsers will always return 1. You have to specify the zoom
      // factor manually if it is used in outdated Blink engine. (e.g. Electron)
      const zoomFactor = zoom || svg.currentScale || 1

      const width = viewBox.baseVal.width / zoomFactor
      const height = viewBox.baseVal.height / zoomFactor
      const scale = Math.min(clientHeight / height, clientWidth / width)

      for (let i = 0; i < children.length; i += 1) {
        const { style } = children[i].firstChild as HTMLElement

        if (!style.position) style.position = 'fixed'
        if (!style.transformOrigin) style.transformOrigin = '0 0'

        style.transform = `scale(${scale}) translateZ(0)`
      }
    }
  )
}
