const msgPrefix = 'marpitSVGPolyfill:setZoomFactor,'

export type PolyfillOption = { target?: ParentNode }

export const observerSymbol = Symbol()
export const zoomFactorRecieverSymbol = Symbol()

export function observe(target: ParentNode = document): () => void {
  if (target[observerSymbol]) return target[observerSymbol]

  let enableObserver = true

  const cleanup = () => {
    enableObserver = false
    delete target[observerSymbol]
  }

  Object.defineProperty(target, observerSymbol, {
    configurable: true,
    value: cleanup,
  })

  const observedPolyfills = polyfills()

  if (observedPolyfills.length > 0) {
    const observer = () => {
      for (const polyfill of observedPolyfills) polyfill({ target })
      if (enableObserver) window.requestAnimationFrame(observer)
    }
    observer()
  }

  return cleanup
}

export const polyfills = (): Array<(opts: PolyfillOption) => void> =>
  navigator.vendor === 'Apple Computer, Inc.' ? [webkit] : []

let previousZoomFactor: number
let zoomFactorFromParent: number | undefined

export const _resetCachedZoomFactor = () => {
  previousZoomFactor = 1
  zoomFactorFromParent = undefined
}

_resetCachedZoomFactor()

export function webkit(opts?: number | (PolyfillOption & { zoom?: number })) {
  const target = (typeof opts === 'object' && opts.target) || document
  const zoom = typeof opts === 'object' ? opts.zoom : opts

  if (!window[zoomFactorRecieverSymbol]) {
    Object.defineProperty(window, zoomFactorRecieverSymbol, {
      configurable: true,
      value: true,
    })

    window.addEventListener('message', ({ data, origin }) => {
      if (origin !== window.origin) return

      try {
        if (data && typeof data === 'string' && data.startsWith(msgPrefix)) {
          const [, value] = data.split(',')
          const parsed = Number.parseFloat(value)

          if (!Number.isNaN(parsed)) zoomFactorFromParent = parsed
        }
      } catch (e) {
        console.error(e)
      }
    })
  }

  let changedZoomFactor: false | number = false

  Array.from(
    target.querySelectorAll<SVGSVGElement>('svg[data-marpit-svg]'),
    (svg) => {
      if (!svg.style.transform) svg.style.transform = 'translateZ(0)'

      // NOTE: Safari reflects a zoom level to SVG's currentScale property, but
      // the other browsers will always return 1. You have to specify the zoom
      // factor manually if used in outdated Blink engine. (e.g. Electron)
      const zoomFactor = zoom || zoomFactorFromParent || svg.currentScale || 1

      if (previousZoomFactor !== zoomFactor) {
        previousZoomFactor = zoomFactor
        changedZoomFactor = zoomFactor
      }

      const svgRect = svg.getBoundingClientRect()
      const { length } = svg.children

      for (let i = 0; i < length; i += 1) {
        const fo = svg.children[i] as SVGForeignObjectElement
        const matrix = fo.getScreenCTM()

        if (matrix) {
          const x = fo.x?.baseVal.value ?? 0
          const y = fo.y?.baseVal.value ?? 0

          const section = fo.firstChild as HTMLElement
          const { style } = section

          if (!style.transformOrigin) style.transformOrigin = `${-x}px ${-y}px`

          // translateZ with non-zero value is required to work interactive
          // content such as animation GIF, but it gets blurry text.
          style.transform = `scale(${zoomFactor}) matrix(${matrix.a}, ${
            matrix.b
          }, ${matrix.c}, ${matrix.d}, ${matrix.e - svgRect.left}, ${
            matrix.f - svgRect.top
          }) translateZ(0.0001px)`
        }
      }
    }
  )

  if (changedZoomFactor !== false) {
    Array.from(
      target.querySelectorAll<HTMLIFrameElement>('iframe'),
      ({ contentWindow }) => {
        contentWindow?.postMessage(
          `${msgPrefix}${changedZoomFactor}`,
          window.origin === 'null' ? '*' : window.origin
        )
      }
    )
  }
}
