export function comprimirFoto(file, maxW = 800, quality = 0.65) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio  = Math.min(maxW / img.width, maxW / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = URL.createObjectURL(file)
  })
}
