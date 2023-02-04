let _isRequiredPolyfill: boolean | undefined

export const isRequiredPolyfill = async () => {
  if (_isRequiredPolyfill === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx = canvas.getContext('2d')!

    const svgImg = new Image(10, 10)
    const svgOnLoadPromise = new Promise<void>((resolve) => {
      svgImg.addEventListener('load', () => resolve())
    })

    svgImg.crossOrigin = 'anonymous'
    svgImg.src =
      'data:image/svg+xml;charset=utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%201%201%22%3E%3CforeignObject%20width%3D%221%22%20height%3D%221%22%20requiredExtensions%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22width%3A%201px%3B%20height%3A%201px%3B%20background%3A%20red%3B%20position%3A%20relative%22%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E'

    await svgOnLoadPromise
    ctx.drawImage(svgImg, 0, 0)

    _isRequiredPolyfill = ctx.getImageData(5, 5, 1, 1).data[3] < 128
  }
  return _isRequiredPolyfill
}
