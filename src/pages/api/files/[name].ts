import type { APIRoute } from 'astro'
import fs from 'node:fs/promises'
import path from 'node:path'

// Test with http://localhost:4321/api/files/placeholder.png

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
}

export const GET: APIRoute = async ({ params }) => {
  const imageName = params.name

  if (!imageName) {
    return new Response('Image name is required', { status: 400 })
  }

  const currentDir = process.cwd()
  //   console.log('Current working directory:', currentDir)

  // Prevent directory traversal (e.g., passing "../../etc/passwd")
  const sanitizedName = path.basename(imageName)

  const imagePath = path.resolve(currentDir, 'file_storage', sanitizedName)
  //   console.log('Image path:', imagePath)

  try {
    const stat = await fs.stat(imagePath)
    if (!stat.isFile()) {
      return new Response('Not a valid image file', { status: 400 })
    }
    const imageBuffer = await fs.readFile(imagePath)
    const ext = path.extname(sanitizedName).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    return new Response('Image not found', { status: 404 })
  }
}
