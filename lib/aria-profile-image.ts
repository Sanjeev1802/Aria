/** Produces the small raster image accepted by the profile API. */
export async function avatarFromFile(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5_000_000) {
    throw new Error("Choose a PNG, JPEG, or WebP image under 5 MB.");
  }
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the image.");
    const side = Math.min(image.width, image.height);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 128, 128);
    const data = canvas.toDataURL("image/png");
    if (data.length > 130_000) throw new Error("This image could not be saved. Try another photo.");
    return data;
  } finally {
    image.close();
  }
}
