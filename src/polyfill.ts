import { isRequiredPolyfill } from './utils/feature-detection'

const msgPrefix = 'marpitSVGPolyfill:setZoomFactor,'

type PolyfillsRawArray = Array<(opts: PolyfillOption) => void>
type PolyfillsArray = PolyfillsRawArray & PromiseLike<PolyfillsRawArray>

export type PolyfillOption = {
  /** The parent node to observe. It's useful for observing Marpit slides inside shadow DOM. */
  target?: ParentNode
}

export const observerSymbol = Symbol()
export const zoomFactorRecieverSymbol = Symbol()

/**
 * Start observing DOM to apply polyfills.
 *
 * @param target The parent node to observe. It's useful for observing Marpit
 *     slides inside shadow DOM. Default is `document`.
 * @returns A function for stopping and cleaning up observation.
 */
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

  let polyfillsArray: PolyfillsRawArray = []
  let polyfillsPromiseDone = false

  ;(async () => {
    try {
      polyfillsArray = await polyfills()
    } finally {
      polyfillsPromiseDone = true
    }
  })()

  const observer = () => {
    for (const polyfill of polyfillsArray) polyfill({ target })

    if (polyfillsPromiseDone && polyfillsArray.length === 0) return
    if (enableObserver) window.requestAnimationFrame(observer)
  }
  observer()

  return cleanup
}

/**
 * Returns an array of polyfill functions that must call for the current browser
 * environment.
 *
 * Including polyfills in the returned array are simply determined by the kind of
 * browser. If you want detailed polyfills that were passed accurate feature
 * detections, call asyncronous version by `polyfills().then()` or
 * `await polyfills()`.
 *
 * ```js
 * import { polyfills } from '@marp-team/marpit-svg-polyfill'
 *
 * polyfills().then((polyfills) => {
 *  for (const polyfill of polyfills) polyfill()
 * })
 * ```
 *
 * @returns A thenable array including polyfill functions
 */
export const polyfills = (): PolyfillsArray => {
  const isSafari = navigator.vendor === 'Apple Computer, Inc.'

  // Sync version of polyfills() has no feature detection. Detect only by the
  // kind of browser.
  const polyfillsSync: PolyfillsRawArray = isSafari ? [webkit] : []

  const polyfillsPromiseLike: PromiseLike<PolyfillsRawArray> = {
    then: ((resolve) => {
      if (isSafari) {
        isRequiredPolyfill().then((required) => {
          resolve?.(required ? [webkit] : [])
        })
      } else {
        resolve?.([])
      }

      return polyfillsPromiseLike
    }) as PolyfillsArray['then'],
  }

  return Object.assign(polyfillsSync, polyfillsPromiseLike)
}

let previousZoomFactor: number
let zoomFactorFromParent: number | undefined

export const _resetCachedZoomFactor = () => {
  previousZoomFactor = 1
  zoomFactorFromParent = undefined
}

_resetCachedZoomFactor()

export function webkit(
  opts?:
    | number
    | (PolyfillOption & {
        /** A zoom factor applied in the current view. You have to specify manually because there is not a reliable way to get the actual zoom factor in the browser. */
        zoom?: number
      })
) {
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

      // Safari 16.3 and eariler versions had applied the current scale factor
      // of the view to `currentScale` property. In others, it becomes `1` as
      // long as not set the custom scale to SVG element.
      const zoomFactor = zoom || zoomFactorFromParent || svg.currentScale || 1

      if (previousZoomFactor !== zoomFactor) {
        previousZoomFactor = zoomFactor
        changedZoomFactor = zoomFactor
      }

      const svgRect = svg.getBoundingClientRect()
      const { length } = svg.children

      for (let i = 0; i < length; i += 1) {
        const fo = svg.children[i] as SVGForeignObjectElement

        if (fo.getScreenCTM) {
          const matrix = fo.getScreenCTM()

          if (matrix) {
            const x = fo.x?.baseVal.value ?? 0
            const y = fo.y?.baseVal.value ?? 0

            const foChildrenLength = fo.children.length

            for (let j = 0; j < foChildrenLength; j += 1) {
              const section = fo.children[j] as Element

              if (section.tagName === 'SECTION') {
                const { style } = section as HTMLElement

                if (!style.transformOrigin)
                  style.transformOrigin = `${-x}px ${-y}px`

                // translateZ with non-zero value is required to work interactive
                // content such as animation GIF, but it gets blurry text.
                style.transform = `scale(${zoomFactor}) matrix(${matrix.a}, ${
                  matrix.b
                }, ${matrix.c}, ${matrix.d}, ${matrix.e - svgRect.left}, ${
                  matrix.f - svgRect.top
                }) translateZ(0.0001px)`

                break
              }
            }
          }
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
