import { afterEach, describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  calculateImageGeometry,
  compressImageToWebP,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_DIMENSION,
  IMAGE_WEBP_QUALITY,
} from '../src/utils/imageCompression';

const originalCreateImageBitmap = globalThis.createImageBitmap;
const originalDocument = globalThis.document;
const originalFileReader = globalThis.FileReader;

afterEach(() => {
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: originalCreateImageBitmap });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: originalFileReader });
});

describe('Compression WebP', () => {
  test('conserve l’orientation et limite le plus grand côté à 1080 px', () => {
    assert.deepEqual(calculateImageGeometry(2000, 3550), {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 2000,
      sourceHeight: 3550,
      targetWidth: 608,
      targetHeight: 1080,
    });
    assert.deepEqual(calculateImageGeometry(3550, 2000), {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 3550,
      sourceHeight: 2000,
      targetWidth: 1080,
      targetHeight: 608,
    });
  });

  test('recadre les avatars au centre sans agrandir les petites images', () => {
    assert.deepEqual(calculateImageGeometry(1600, 900, 1080, true), {
      sourceX: 350,
      sourceY: 0,
      sourceWidth: 900,
      sourceHeight: 900,
      targetWidth: 900,
      targetHeight: 900,
    });
  });

  test('applique réellement WebP, qualité 80 %, orientation et poids maximum', async () => {
    const generatedCanvases: Array<{ width: number; height: number }> = [];
    const qualities: number[] = [];
    let bitmapClosed = false;

    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: async () => ({ width: 2400, height: 1600, close: () => { bitmapClosed = true; } }),
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => {
          const canvas = {
            width: 0,
            height: 0,
            getContext: () => ({
              imageSmoothingEnabled: false,
              imageSmoothingQuality: 'low',
              drawImage: () => undefined,
            }),
            toBlob: (callback: (blob: Blob) => void, type: string, quality: number) => {
              generatedCanvases.push({ width: canvas.width, height: canvas.height });
              qualities.push(quality);
              callback(new Blob([new Uint8Array(900)], { type }));
            },
          };
          return canvas;
        },
      },
    });
    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      value: class {
        result: string | null = null;
        onload: null | (() => void) = null;
        onerror: null | (() => void) = null;
        readAsDataURL(blob: Blob) {
          this.result = `data:${blob.type};base64,dGVzdA==`;
          queueMicrotask(() => this.onload?.());
        }
      },
    });

    const result = await compressImageToWebP(new File([new Uint8Array(20)], 'photo.jpg', { type: 'image/jpeg' }));
    assert.equal(result.blob.type, 'image/webp');
    assert.ok(result.blob.size <= IMAGE_MAX_BYTES);
    assert.equal(result.width, IMAGE_MAX_DIMENSION);
    assert.equal(result.height, 720);
    assert.equal(result.dataUrl.startsWith('data:image/webp;base64,'), true);
    assert.deepEqual(generatedCanvases, [{ width: 1080, height: 720 }]);
    assert.deepEqual(qualities, [IMAGE_WEBP_QUALITY]);
    assert.equal(bitmapClosed, true);
  });

  test('refuse un fichier non image et des options invalides', async () => {
    await assert.rejects(
      compressImageToWebP(new File(['texte'], 'note.txt', { type: 'text/plain' })),
      /n’est pas une image valide/,
    );
    await assert.rejects(
      compressImageToWebP(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), { quality: 2 }),
      /qualité WebP/,
    );
    assert.throws(() => calculateImageGeometry(0, 100), /Dimensions/);
  });
});
