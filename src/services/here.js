/**
 * HERE Maps REST API service
 * Uses REST APIs only — no HERE JS SDK
 */

const API_KEY = import.meta.env.VITE_HERE_API_KEY

// ─── HERE Flexible Polyline Decoder ─────────────────────────────────────────

const ENCODING_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

// Build decode lookup table: char code → 0-63
const DECODING = new Uint8Array(256)
for (let i = 0; i < ENCODING_CHARS.length; i++) {
  DECODING[ENCODING_CHARS.charCodeAt(i)] = i
}

function toSigned(val) {
  return val & 1 ? ~(val >> 1) : val >> 1
}

function decodeVarint(encoded, index) {
  let result = 0
  let shift = 0
  let byte
  do {
    byte = DECODING[encoded.charCodeAt(index++)]
    result |= (byte & 0x1F) << shift
    shift += 5
  } while (byte >= 0x20)
  return { result, index }
}

/**
 * Decode HERE flexible polyline to array of [lat, lng] pairs
 * @param {string} encoded
 * @returns {[number, number][]}
 */
export function decodeFlexiblePolyline(encoded) {
  if (!encoded) return []

  let index = 0

  // HERE Router v8 format: two separate header varints
  //   varint 1 = version (always 1)
  //   varint 2 = precision (decimal places for lat/lng, typically 5 or 6)
  const versionV = decodeVarint(encoded, index)
  index = versionV.index

  const precisionV = decodeVarint(encoded, index)
  index = precisionV.index

  const factor = Math.pow(10, precisionV.result)

  const coords = []
  let accLat = 0
  let accLng = 0

  while (index < encoded.length) {
    const latDelta = decodeVarint(encoded, index)
    index = latDelta.index
    accLat += toSigned(latDelta.result)

    const lngDelta = decodeVarint(encoded, index)
    index = lngDelta.index
    accLng += toSigned(lngDelta.result)

    coords.push([accLat / factor, accLng / factor])
  }

  return coords
}

// ─── Autosuggest ─────────────────────────────────────────────────────────────

/**
 * Autocomplete address search via HERE Autosuggest API
 * @param {string} query
 * @param {number} centerLat
 * @param {number} centerLng
 * @returns {Promise<Array<{title: string, position: {lat: number, lng: number}, address: object}>>}
 */
export async function autosuggest(query) {
  if (!query || query.length < 3) return []

  const url = new URL('https://autosuggest.search.hereapi.com/v1/autosuggest')
  url.searchParams.set('q', query)
  // Use a bounding box covering Europe + CIS instead of a fixed center point
  // to avoid biasing results toward any specific city
  url.searchParams.set('in', 'bbox:-10,35,60,72')
  url.searchParams.set('limit', '6')
  url.searchParams.set('lang', 'uk-UA,ru,en')
  url.searchParams.set('apiKey', API_KEY)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`HERE Autosuggest error: ${res.status}`)
    const data = await res.json()
    // Filter to items that have a position (lat/lng)
    return (data.items || []).filter(
      item => item.position && typeof item.position.lat === 'number' && typeof item.position.lng === 'number'
    )
  } catch (e) {
    console.error('HERE autosuggest failed:', e)
    return []
  }
}

// ─── Truck Route Calculation ──────────────────────────────────────────────────

/**
 * Calculate truck route between two points using HERE Router v8
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {{ heightCm?: number, widthCm?: number, lengthCm?: number, grossWeightKg?: number }} vehicleParams
 * @returns {Promise<{ polyline: [number, number][], distanceM: number, durationS: number } | null>}
 */
export async function calculateTruckRoute(origin, destination, vehicleParams = {}) {
  // Base params via URLSearchParams (safe for normal values)
  const base = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    transportMode: 'truck',
    return: 'polyline,summary',
    apiKey: API_KEY,
  })

  // Vehicle dimension params use bracket notation which must NOT be percent-encoded.
  // HERE Router v8 expects centimeters as integers for height/width/length,
  // and kilograms as integer for grossWeight.
  const vehicleParts = []
  if (vehicleParams.heightCm)     vehicleParts.push(`vehicle[height]=${Math.round(vehicleParams.heightCm)}`)
  if (vehicleParams.widthCm)      vehicleParts.push(`vehicle[width]=${Math.round(vehicleParams.widthCm)}`)
  if (vehicleParams.lengthCm)     vehicleParts.push(`vehicle[length]=${Math.round(vehicleParams.lengthCm)}`)
  if (vehicleParams.grossWeightKg) vehicleParts.push(`vehicle[grossWeight]=${Math.round(vehicleParams.grossWeightKg)}`)

  const urlStr = `https://router.hereapi.com/v8/routes?${base.toString()}${vehicleParts.length ? '&' + vehicleParts.join('&') : ''}`

  try {
    const res = await fetch(urlStr)
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`HERE Router error ${res.status}: ${errText}`)
    }
    const data = await res.json()

    const section = data.routes?.[0]?.sections?.[0]
    if (!section) return null

    const polyline = decodeFlexiblePolyline(section.polyline)
    const distanceM = section.summary?.length ?? 0
    const durationS = section.summary?.duration ?? 0

    return { polyline, distanceM, durationS }
  } catch (e) {
    console.error('HERE calculateTruckRoute failed:', e)
    return null
  }
}
