/**
 * Compresses a base64 image data URL using a canvas element.
 * Resizes to max `maxSize` px on the longest side, re-encodes as JPEG at `quality`.
 * Brings typical AI-generated PNGs (1–3 MB) down to ~100–250 KB.
 */
export function compressImage(
  dataUrl: string,
  maxSize = 1024,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}
