import { Marpit } from '@marp-team/marpit'
import detectBrowser from 'detect-browser'
import {
  observe,
  resetPolyfills,
  symbolObserver,
  webkit,
} from '../src/polyfill'

beforeEach(() => {
  resetPolyfills()
  window[symbolObserver] = false
})

afterEach(() => jest.restoreAllMocks())

describe('Marpit SVG polyfill', () => {
  const browseWith = name =>
    jest.spyOn(detectBrowser, 'detect').mockImplementation(() => ({ name }))

  describe('#observe', () => {
    it('has no operations when running in not supported browser', () => {
      const spy = jest.spyOn(window, 'requestAnimationFrame')

      observe()
      expect(spy).not.toBeCalled()
    })

    it('applies polyfill once when running in WebKit browser', () => {
      browseWith('safari')
      const spy = jest.spyOn(window, 'requestAnimationFrame')

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
        svg.viewBox = { baseVal: { width: 1280, height: 720 } }

        const foreignObjects = Array.from(
          svg.querySelectorAll('foreignObject'),
          (foreignObject: any) => {
            foreignObject.x = { baseVal: { value: 0 } }
            foreignObject.y = { baseVal: { value: 0 } }

            // mock for unsupported `:scope` selector
            jest
              .spyOn(foreignObject, 'querySelectorAll')
              .mockImplementation(() => document.querySelectorAll('section'))

            return foreignObject
          }
        )

        // mock for unsupported `:scope` selector
        jest
          .spyOn(svg, 'querySelectorAll')
          .mockImplementation(() => foreignObjects)
      })
    })

    it('applies transform style to SVG element for repainting', () => {
      const svg = <SVGElement>document.querySelector('svg[data-marpit-svg]')
      expect(svg.style.transform).not.toContain('translateZ(0)')

      webkit()
      expect(svg.style.transform).toContain('translateZ(0)')
    })

    it('applies calculated transform style to section elements for scaling', () => {
      const sections = document.getElementsByTagName('section')

      Array.from(sections, section => {
        const { transform, transformOrigin } = section.style

        expect(transformOrigin).toBeUndefined()
        expect(transform).not.toContain('translate3d')
        expect(transform).not.toContain('scale')
      })

      webkit()

      Array.from(sections, section => {
        const { transform, transformOrigin } = section.style

        expect(transformOrigin).toBe('0 0')
        expect(transform).toContain('translate3d')
        expect(transform).toContain('scale')
      })
    })
  })
})
