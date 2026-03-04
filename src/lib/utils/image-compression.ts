import imageCompression from 'browser-image-compression'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.8,
}

export async function compressImage(file: File): Promise<File> {
  // Skip non-image files (PDFs, DWGs)
  if (!file.type.startsWith('image/')) {
    return file
  }

  const compressed = await imageCompression(file, COMPRESSION_OPTIONS)

  // Rename to .webp extension
  const newName = file.name.replace(/\.[^.]+$/, '.webp')
  return new File([compressed], newName, { type: 'image/webp' })
}
