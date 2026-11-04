/**
 * Photos in the demo live in this browser, so they are shrunk before they are kept: the long side to
 * `max` pixels, as JPEG. In M2 the original goes to Storage through a signed upload URL instead.
 */
export const PHOTO_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const MAX_BYTES = 20 * 1024 * 1024;

export class PhotoError extends Error {}

export async function shrinkPhoto(file: File, max = 1280, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new PhotoError(`${file.name} is not a photo.`);
  if (file.size > MAX_BYTES) throw new PhotoError(`${file.name} is over 20 MB.`);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {
      throw new PhotoError(`${file.name} could not be opened. Try a JPEG or PNG.`);
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    if (!g) throw new PhotoError("This browser can't prepare photos.");
    g.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** shrink several, keeping the ones that work and the reasons for the ones that don't */
export async function shrinkPhotos(files: Iterable<File>, max?: number): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];
  for (const f of files) {
    try {
      urls.push(await shrinkPhoto(f, max));
    } catch (e) {
      errors.push(e instanceof PhotoError ? e.message : `${f.name} could not be added.`);
    }
  }
  return { urls, errors };
}
