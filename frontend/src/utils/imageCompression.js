// src/utils/imageCompression.js
// ─── Konprese foto AVAN yo vin base64 ────────────────────────
// Poukisa: nou estoke foto yo dirèkteman kòm base64 nan baz done a
// (pa gen sèvis Cloudinary/S3 konfigire). San konprese, yon senp
// foto telefòn (3-5 MB) vin yon string 4-7 MB nan JSON, e li re-voye
// ANTYE chak fwa yon lis pwodui/meni chaje — sa manje anpil bandwidth
// Render (limit 5GB gratis pa mwa).
//
// Sa a redwi dimansyon (max 800px lajè) AK kalite JPEG (~75%) anvan
// konvèsyon base64, ki tipikman diminye gwosè a pa 80-95% san moun
// pa wè gwo diferans sou yon ti vinyèt pwodui.

/**
 * Konprese yon fichye imaj epi retounen yon base64 data URL.
 * @param {File} file - Fichye imaj (soti nan yon <input type="file">)
 * @param {Object} opts
 * @param {number} opts.maxWidth - Lajè maksimòm an pixel (default 800)
 * @param {number} opts.quality - Kalite JPEG 0-1 (default 0.75)
 * @returns {Promise<string>} base64 data URL (image/jpeg)
 */
export function compressImage(file, { maxWidth = 800, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        let { width, height } = img

        // Redwi dimansyon si li pi laj pase maxWidth, gade menm pwopòsyon
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Konvèti an JPEG konprese (menm si orijinal la se PNG/WebP) —
        // JPEG toujou pi piti pou foto pwodui/manje, e yo pa bezwen
        // fon transparan.
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }

      img.onerror = () => reject(new Error('Enposib chaje imaj la pou konprese.'))
      img.src = e.target.result
    }

    reader.onerror = () => reject(new Error('Enposib li fichye a.'))
    reader.readAsDataURL(file)
  })
}
