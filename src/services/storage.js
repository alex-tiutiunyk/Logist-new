import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebase/storage.js'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Недозволений тип файлу. Дозволено: JPG, PNG, PDF')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Файл перевищує максимальний розмір 10 МБ')
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getExtension(file) {
  const parts = file.name.split('.')
  return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Upload a trip document to Firebase Storage
 * @param {string} tripId
 * @param {File} file
 * @returns {Promise<string>} download URL
 */
export async function uploadTripDocument(tripId, file) {
  validateFile(file)
  const filename = `${generateUUID()}${getExtension(file)}`
  const path = `trips/${tripId}/documents/${filename}`
  const ref = storageRef(storage, path)
  await uploadBytes(ref, file, { contentType: file.type })
  return getDownloadURL(ref)
}

/**
 * Upload a photo for a trip
 * @param {string} tripId
 * @param {File} file
 * @returns {Promise<string>} download URL
 */
export async function uploadPhoto(tripId, file) {
  validateFile(file)
  const filename = `${generateUUID()}${getExtension(file)}`
  const path = `trips/${tripId}/photos/${filename}`
  const ref = storageRef(storage, path)
  await uploadBytes(ref, file, { contentType: file.type })
  return getDownloadURL(ref)
}
