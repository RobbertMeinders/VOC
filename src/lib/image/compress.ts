"use client";

// Downscales and re-encodes an image in the browser before upload, so large
// phone photos don't hit server-side size limits or eat mobile data. Keeps
// the original file untouched if compression fails or doesn't help (GIFs,
// already-small files, unsupported browsers).

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

// Nieuwsbriefafbeeldingen tonen hoogstens 552px breed (zie render.ts) — de
// generieke 1920px hierboven is bedoeld voor foto's die veel groter op het
// scherm komen (activiteitdetail, feed) en leverde in de nieuwsbrief een
// nodeloos groot bestand op (tot 3,5x meer pixels dan ooit getoond worden).
// 1100px is ruim genoeg voor een scherp beeld op een 2x-scherm.
export const NEWSLETTER_IMAGE_DIMENSION = 1100;

// Performance-audit #1: avatars/logo's worden in lijsten (ledenlijst,
// bedrijvengids, Beheer-overzichten) als icoon van 32-72px getoond, maar tot
// nu toe altijd op volle (tot 1920px) grootte gedownload — dat was 75-90% van
// de bytes per paginaweergave. 160px is ruim genoeg voor een 72px-weergave op
// een 2x-scherm; de volledige foto blijft daarnaast bestaan voor het
// bewerkformulier/detailweergave. Activiteit-/feedfoto's staan in kaarten van
// 112-366px (audit sectie H) — daarvoor 800px, ruim genoeg op 2x-schermen.
export const AVATAR_LOGO_THUMBNAIL_DIMENSION = 160;
export const CARD_THUMBNAIL_DIMENSION = 800;
const THUMBNAIL_QUALITY = 0.8;

type ResizeResult = { blob: Blob; outputType: string } | null;

async function resizeToCanvas(file: File, maxDimension: number, quality: number): Promise<ResizeResult> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0, width, height);

    // PNGs stay PNG (keeps transparency); everything else becomes JPEG,
    // which compresses photos far better than the original format.
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));
    return blob ? { blob, outputType } : null;
  } finally {
    bitmap.close();
  }
}

export async function compressImageFile(file: File, maxDimension: number = MAX_DIMENSION): Promise<File> {
  // GIF (animatie) en SVG (vector) mogen niet door canvas gerasterd worden —
  // dat verliest precies waarom je dat formaat koos.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  try {
    const result = await resizeToCanvas(file, maxDimension, JPEG_QUALITY);
    if (!result || result.blob.size >= file.size) {
      return file;
    }

    const extension = result.outputType === "image/png" ? "png" : "jpg";
    const name = `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
    return new File([result.blob], name, { type: result.outputType });
  } catch {
    return file;
  }
}

/**
 * Maakt een klein tweede bestand voor gebruik in lijsten/kaarten — zie
 * AVATAR_LOGO_THUMBNAIL_DIMENSION/CARD_THUMBNAIL_DIMENSION hierboven. Geeft
 * `null` terug voor SVG (al vectorklein, niet te rasteren) of als het
 * genereren om wat voor reden ook mislukt; de aanroeper laat de *_thumb_url-
 * kolom dan gewoon leeg en de kaart valt terug op de volledige afbeelding.
 */
export async function createThumbnailFile(
  file: File,
  maxDimension: number = AVATAR_LOGO_THUMBNAIL_DIMENSION
): Promise<File | null> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return null;
  }

  try {
    const result = await resizeToCanvas(file, maxDimension, THUMBNAIL_QUALITY);
    if (!result) return null;

    const extension = result.outputType === "image/png" ? "png" : "jpg";
    const name = `${file.name.replace(/\.[^/.]+$/, "")}-thumb.${extension}`;
    return new File([result.blob], name, { type: result.outputType });
  } catch {
    return null;
  }
}

/**
 * Compresses the first selected file on a file input and writes the result
 * back onto `input.files`, so a normal form submit (and useActionState) picks
 * up the smaller file without any other wiring.
 */
export async function compressInputFile(input: HTMLInputElement, maxDimension: number = MAX_DIMENSION): Promise<File | null> {
  const file = input.files?.[0];
  if (!file) return null;

  const compressed = await compressImageFile(file, maxDimension);
  if (compressed !== file) {
    const transfer = new DataTransfer();
    transfer.items.add(compressed);
    input.files = transfer.files;
  }
  return compressed;
}
