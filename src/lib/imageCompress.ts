/**
 * Compress and resize images using canvas before upload.
 * Phone photos are 3-8MB; we need to compress them to under 200KB
 * for reliable Supabase storage in text fields.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, JPEG quality
  maxSizeKB?: number; // target max file size
}

/**
 * Compress an image File to a resized JPEG base64 data URL.
 * Default: 400x400px max, 85% quality.
 */
export function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.85,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get approximate file size of a base64 data URL in KB.
 */
export function getBase64SizeKB(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  const bytes = (base64.length * 3) / 4;
  return Math.round(bytes / 1024);
}
