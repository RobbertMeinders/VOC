"use client";

// Downscales and re-encodes an image in the browser before upload, so large
// phone photos don't hit server-side size limits or eat mobile data. Keeps
// the original file untouched if compression fails or doesn't help (GIFs,
// already-small files, unsupported browsers).

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export async function compressImageFile(file: File): Promise<File> {
  // GIF (animatie) en SVG (vector) mogen niet door canvas gerasterd worden —
  // dat verliest precies waarom je dat formaat koos.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // PNGs stay PNG (keeps transparency); everything else becomes JPEG,
    // which compresses photos far better than the original format.
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, JPEG_QUALITY)
    );

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const extension = outputType === "image/png" ? "png" : "jpg";
    const name = `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
    return new File([blob], name, { type: outputType });
  } catch {
    return file;
  }
}

/**
 * Compresses the first selected file on a file input and writes the result
 * back onto `input.files`, so a normal form submit (and useActionState) picks
 * up the smaller file without any other wiring.
 */
export async function compressInputFile(input: HTMLInputElement): Promise<File | null> {
  const file = input.files?.[0];
  if (!file) return null;

  const compressed = await compressImageFile(file);
  if (compressed !== file) {
    const transfer = new DataTransfer();
    transfer.items.add(compressed);
    input.files = transfer.files;
  }
  return compressed;
}
