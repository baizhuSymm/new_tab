import type { WallpaperAsset } from "../../domain/types";
export function validateImageFile(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("请选择 PNG、JPEG 或 WebP 图片");
  if (file.size > 20_000_000) throw Error("原始图片不能超过 20 MB");
  if (!file.size) throw Error("图片文件为空");
}
export async function prepareWallpaper(file: File): Promise<WallpaperAsset> {
  validateImageFile(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw Error("无法读取这张图片，文件可能已损坏");
  }
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw Error("图片尺寸不能超过 4000 万像素");
    const scale = Math.min(1, 2560 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw Error("浏览器无法处理图片");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.75, 0.6, 0.45]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (!blob || blob.type !== "image/webp") throw Error("图片压缩失败");
      if (blob.size <= 1_500_000) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(Error("图片保存失败"));
          reader.readAsDataURL(blob);
        });
        return {
          id: crypto.randomUUID(),
          dataUrl,
          mimeType: blob.type,
          byteLength: blob.size,
          positionX: 50,
          positionY: 50,
        };
      }
    }
    throw Error("压缩后仍超过 1.5 MB，请选择尺寸更小的图片");
  } finally {
    bitmap.close();
  }
}
