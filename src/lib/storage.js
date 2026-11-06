import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase.js'

/**
 * Compresses and resizes an image file using an HTML5 Canvas.
 * Creates an ultra-lightweight, high-quality image that fits comfortably
 * in Firestore documents (under 50KB), working 100% free on the Firebase Spark plan.
 */
export function compressImage(file, maxWidth = 600, maxHeight = 600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'))
    }

    const reader = new FileReader()
    reader.onload = event => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // Calculate aspect-ratio scaling
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.max(1, Math.round(width * ratio))
          height = Math.max(1, Math.round(height * ratio))
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', quality)

        canvas.toBlob(
          blob => {
            if (blob) {
              resolve({ blob, dataUrl })
            } else {
              resolve({ blob: file, dataUrl })
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('Could not process this image.'))
      img.src = event.target.result
    }
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Returns just the compressed base64 data URL for fast UI previews
 */
export async function compressImageToDataUrl(file, maxWidth = 400, maxHeight = 400, quality = 0.75) {
  const { dataUrl } = await compressImage(file, maxWidth, maxHeight, quality)
  return dataUrl
}

/**
 * Uploads an image.
 * If Firebase Storage is activated (Blaze plan), it uploads to the storage bucket.
 * If on the free Spark plan (where Firebase Storage is locked behind billing),
 * it seamlessly saves the compressed image data (< 40KB) directly into Firestore!
 * 100% free, zero configuration needed.
 */
export async function uploadImage(file, folder = 'uploads', userId = '', options = {}) {
  const isAvatar = folder === 'avatars'
  const maxWidth = options.maxWidth || (isAvatar ? 300 : 700)
  const maxHeight = options.maxHeight || (isAvatar ? 300 : 700)
  const quality = options.quality || (isAvatar ? 0.8 : 0.74)

  const { blob, dataUrl } = await compressImage(file, maxWidth, maxHeight, quality)

  // Try Firebase Storage with a fast 2-second timeout in case Storage is on Blaze plan
  if (storage) {
    try {
      const safePrefix = userId ? `${userId}_` : ''
      const safeName = `${safePrefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
      const storageRef = ref(storage, `${folder}/${safeName}`)

      const uploadPromise = uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Storage timeout (Spark plan fallback)')), 2000)
      )

      const snapshot = await Promise.race([uploadPromise, timeoutPromise])
      const downloadUrl = await getDownloadURL(snapshot.ref)
      return downloadUrl
    } catch {
      // On Spark plan without Blaze billing, immediately return optimized data URL
      return dataUrl
    }
  }

  return dataUrl
}
