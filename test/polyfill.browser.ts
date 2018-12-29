import { observe } from '../src/polyfill'

jest.mock('../src/polyfill')

describe('Browser bundle', () => {
  it('observes to apply polyfill', () => {
    require('../src/polyfill.browser')
    expect(observe).toBeCalledTimes(1)
  })
})
