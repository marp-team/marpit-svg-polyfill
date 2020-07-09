import { Marpit } from '@marp-team/marpit'
import { observe, observerSymbol, webkit } from '../src/polyfill'

let vendor: jest.SpyInstance

beforeEach(() => {
  window[observerSymbol] = false
  vendor = jest.spyOn(navigator, 'vendor', 'get').mockImplementation(() => '')
})

describe('Marpit SVG polyfill', () => {
  describe('#observe', () => {
    let spy: jest.SpyInstance

    beforeEach(() => {
      spy = jest.spyOn(window, 'requestAnimationFrame')
    })

    it('has no operations when running in not supported browser', () => {
      observe()
      expect(spy).not.toBeCalled()
    })

    it('applies polyfill once when running in WebKit browser', () => {
      vendor.mockImplementation(() => 'Apple Computer, Inc.')

      observe()
      expect(spy).toBeCalledTimes(1)

      // Call requestAnimationFrame only once
      observe()
      expect(spy).toBeCalledTimes(1)
    })
  })

  describe('#webkit', () => {
    beforeEach(() => {
      const marpit = new Marpit({ inlineSVG: true })
      document.body.innerHTML = marpit.render('').html

      Array.from(document.querySelectorAll('svg'), (svg: any) => {
        jest.spyOn(svg, 'clientWidth', 'get').mockImplementation(() => 640)
        jest.spyOn(svg, 'clientHeight', 'get').mockImplementation(() => 360)
        svg.viewBox = { baseVal: { width: 1280, height: 720 } }
      })
    })

    it('applies transform style to SVG element for repainting', () => {
      const svg = <SVGElement>document.querySelector('svg[data-marpit-svg]')
      expect(svg.style.transform).not.toContain('translateZ(0)')

      webkit()
      expect(svg.style.transform).toContain('translateZ(0)')
    })

    it('applies calculated transform style to section elements for scaling', () => {
      expect.hasAssertions()

      const sections = document.getElementsByTagName('section')

      Array.from(sections, ({ style }) => {
        expect(style.transformOrigin).toBeFalsy()
        expect(style.transform).not.toContain('scale')
      })

      webkit()

      Array.from(sections, ({ style }) => {
        expect(style.transformOrigin).toBe('0 0')
        expect(style.transform).toContain('scale(0.5)')
      })
    })

    it("takes account of SVG's currentScale property", () => {
      expect.hasAssertions()

      Array.from(document.querySelectorAll('svg'), (svg) => {
        svg.currentScale = 1.25
      })

      webkit()

      Array.from(document.getElementsByTagName('section'), ({ style }) =>
        expect(style.transform).toContain('scale(0.625)')
      )
    })

    it('prefers the zoom factor defined in parent.marpitSVGPolyfillZoomFactor', () => {
      expect.hasAssertions()

      jest.spyOn(window, 'parent', 'get').mockImplementation((): any => ({
        marpitSVGPolyfillZoomFactor: 2,
      }))

      webkit()

      Array.from(document.getElementsByTagName('section'), ({ style }) =>
        expect(style.transform).toContain('scale(1)')
      )
    })
  })
})
