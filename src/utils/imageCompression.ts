export const IMAGE_MAX_DIMENSION = 1080;
export const IMAGE_WEBP_QUALITY = 0.8;
export const IMAGE_MAX_BYTES = 1024 * 1024;

interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  maxBytes?: number;
  cropSquare?: boolean;
}

export interface CompressedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== 'image/webp') {
        reject(new Error("Ce navigateur ne peut pas convertir l’image en WebP."));
        return;
      }
      resolve(blob);
    }, 'image/webp', quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de préparer l’image."));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function sourceToBlob(source: File | string): Promise<Blob> {
  if (source instanceof File) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error("Impossible de lire l’image sélectionnée.");
  return response.blob();
}

export async function compressImageToWebP(
  source: File | string,
  options: CompressImageOptions = {},
): Promise<CompressedImage> {
  const maxDimension = options.maxDimension ?? IMAGE_MAX_DIMENSION;
  const quality = options.quality ?? IMAGE_WEBP_QUALITY;
  const maxBytes = options.maxBytes ?? IMAGE_MAX_BYTES;
  const sourceBlob = await sourceToBlob(source);

  if (!sourceBlob.type.startsWith('image/')) {
    throw new Error("Le fichier sélectionné n’est pas une image valide.");
  }

  const bitmap = await createImageBitmap(sourceBlob, { imageOrientation: 'from-image' });
  try {
    const cropSquare = options.cropSquare === true;
    const sourceWidth = cropSquare ? Math.min(bitmap.width, bitmap.height) : bitmap.width;
    const sourceHeight = cropSquare ? Math.min(bitmap.width, bitmap.height) : bitmap.height;
    const sourceX = cropSquare ? Math.max(0, (bitmap.width - sourceWidth) / 2) : 0;
    const sourceY = cropSquare ? Math.max(0, (bitmap.height - sourceHeight) / 2) : 0;
    const initialScale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    let targetWidth = Math.max(1, Math.round(sourceWidth * initialScale));
    let targetHeight = Math.max(1, Math.round(sourceHeight * initialScale));

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error("Impossible de préparer l’image.");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      const blob = await canvasToWebP(canvas, quality);
      if (blob.size <= maxBytes) {
        return {
          blob,
          dataUrl: await blobToDataUrl(blob),
          width: targetWidth,
          height: targetHeight,
        };
      }

      targetWidth = Math.max(320, Math.round(targetWidth * 0.88));
      targetHeight = Math.max(320, Math.round(targetHeight * 0.88));
    }

    throw new Error("L’image reste supérieure à 1 Mo après optimisation.");
  } finally {
    bitmap.close();
  }
}
