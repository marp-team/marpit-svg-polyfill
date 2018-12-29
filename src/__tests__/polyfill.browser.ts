import polyfill from '../polyfill'

jest.mock('../polyfill')

describe('Browser bundle', () => {
  it('executes polyfill', () => {
    require('../polyfill.browser')
    expect(polyfill).toBeCalledTimes(1)
  })
})
