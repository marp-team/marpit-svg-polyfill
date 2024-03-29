import { Marpit } from '@marp-team/marpit'
import {
  _resetCachedZoomFactor,
  observe,
  observerSymbol,
  webkit,
} from '../src/polyfill'

let vendor: jest.SpyInstance

beforeEach(() => {
  delete document[observerSymbol]
  vendor = jest.spyOn(navigator, 'vendor', 'get').mockImplementation(() => '')
  _resetCachedZoomFactor()
})

describe('Marpit SVG polyfill', () => {
  describe('#observe', () => {
    let spy: jest.SpyInstance

    beforeEach(() => {
      document.body.innerHTML = '<svg data-marpit-svg></svg>'
      spy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation()
    })

    it('has no operations when running in not supported browser', async () => {
      observe()
      expect(spy).toHaveBeenCalledTimes(1)

      // Wait for detecting whether polyfill is required
      await new Promise((res) => setTimeout(res, 0))
      spy.mock.calls[0][0]()

      const svg = document.querySelector<SVGElement>('svg[data-marpit-svg]')
      expect(svg?.style.transform).toBeFalsy()
    })

    it('applies polyfill once when running in WebKit browser', async () => {
      vendor.mockImplementation(() => 'Apple Computer, Inc.')

      observe()
      expect(spy).toHaveBeenCalledTimes(1)

      const observer = spy.mock.calls[0][0]

      // Wait for detecting whether polyfill is required
      await new Promise((res) => setTimeout(res, 0))
      observer()

      // And wait canvas rendering for feature detection
      await new Promise((res) => setTimeout(res, 0))
      observer()

      const svg = document.querySelector<SVGElement>('svg[data-marpit-svg]')
      expect(svg?.style.transform).toBeTruthy()
    })

    describe('Clean-up function', () => {
      it('returns function for clean-up', () => {
        vendor.mockImplementation(() => 'Apple Computer, Inc.')

        const cleanup = observe()
        expect(cleanup).toStrictEqual(expect.any(Function))

        // Observer can enable again after cleaning up
        cleanup()
        observe()
        expect(spy).toHaveBeenCalledTimes(2)
      })
    })

    describe('Different target', () => {
      it('availables observation for different target', async () => {
        vendor.mockImplementation(() => 'Apple Computer, Inc.')

        const element = document.createElement('div')
        const querySpy = jest.spyOn(element, 'querySelectorAll')
        const cleanup = observe(element)
        expect(spy).toHaveBeenCalledTimes(1)

        // Wait for detecting whether polyfill is required
        await new Promise((res) => setTimeout(res, 0))
        spy.mock.calls[0][0]()

        expect(element[observerSymbol]).toStrictEqual(cleanup)
        expect(querySpy).toHaveBeenCalled()

        // Returns always same clean-up function even if observing some times
        expect(observe(element)).toStrictEqual(cleanup)
      })
    })
  })

  describe('#webkit', () => {
    beforeEach(() => {
      const marpit = new Marpit({ inlineSVG: true })
      document.body.innerHTML = marpit.render('').html

      jest
        .spyOn<any, any>(SVGElement.prototype, 'getBoundingClientRect')
        .mockReturnValue({ left: 0, top: 0, width: 640, height: 360 })

      const matrix = { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0 }
      ;(SVGElement.prototype as any).getScreenCTM = () => matrix
    })

    it('applies transform style to SVG element for repainting', () => {
      const svg = document.querySelector<SVGElement>('svg[data-marpit-svg]')
      expect(svg?.style.transform).not.toContain('translateZ(0)')

      webkit()
      expect(svg?.style.transform).toContain('translateZ(0)')
    })

    it('applies calculated transform style to section elements for scaling', () => {
      expect.hasAssertions()

      const sections = document.getElementsByTagName('section')

      Array.from(sections, ({ style }) => {
        expect(style.transformOrigin).toBeFalsy()
        expect(style.transform).not.toContain('matrix')
      })

      webkit()

      Array.from(sections, ({ style }) => {
        expect(style.transformOrigin).toBe('0px 0px')
        expect(style.transform).toContain('matrix(0.5, 0, 0, 0.5, 0, 0)')
      })
    })

    it('applies calculated transform style even if prepended unknown element before the section', () => {
      expect.hasAssertions()

      const section = document.getElementsByTagName('section')[0]
      section.insertAdjacentHTML('beforebegin', '<div>unknown</div>')

      webkit()

      expect(section.style.transformOrigin).toBe('0px 0px')
      expect(section.style.transform).toContain('matrix(0.5, 0, 0, 0.5, 0, 0)')
    })

    it("takes account of SVG's currentScale property", () => {
      expect.hasAssertions()

      Array.from(document.querySelectorAll('svg'), (svg) => {
        svg.currentScale = 1.25
      })

      webkit()

      Array.from(document.getElementsByTagName('section'), ({ style }) =>
        expect(style.transform).toContain('scale(1.25)')
      )
    })

    it('prefers the zoom factor that received in specific protocol', () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: 'marpitSVGPolyfill:setZoomFactor,2',
          origin: window.origin,
        })
      )

      webkit()

      Array.from(document.getElementsByTagName('section'), ({ style }) =>
        expect(style.transform).toContain('scale(2)')
      )
    })

    it('sends message into children iframes when the zoom factor had changed', () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)

      const spy = jest.spyOn<any, any>(iframe.contentWindow, 'postMessage')

      webkit()
      expect(spy).not.toHaveBeenCalled()

      Array.from(document.querySelectorAll('svg'), (svg) => {
        svg.currentScale = 2.5
      })

      webkit()
      expect(spy).toHaveBeenCalledWith(
        'marpitSVGPolyfill:setZoomFactor,2.5',
        window.origin
      )
    })
  })
})
