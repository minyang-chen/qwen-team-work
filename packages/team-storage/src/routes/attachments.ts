import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';

const router = Router();

// NFS base path
const NFS_BASE_PATH = process.env.NFS_BASE_PATH || '../../infrastructure/nfs-data';

// Configure multer for memory storage (we'll write to NFS manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * Upload attachment to NFS
 * POST /api/attachments/upload
 * Body: multipart/form-data with files, userId, sessionId
 */
router.post('/upload', upload.array('files', 10), async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, sessionId } = req.body;
    
    if (!userId || !sessionId) {
      res.status(400).json({ error: 'userId and sessionId are required' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    // Create attachment directory: /nfs-data/individual/{userId}/attachments/{sessionId}/
    const attachmentDir = path.join(
      NFS_BASE_PATH,
      'individual',
      userId,
      'attachments',
      sessionId
    );

    await fs.mkdir(attachmentDir, { recursive: true });

    // Save files and create references
    const attachments = await Promise.all(
      files.map(async (file) => {
        const fileId = nanoid();
        const ext = path.extname(file.originalname);
        const filename = `${fileId}${ext}`;
        const filePath = path.join(attachmentDir, filename);

        // Write file to NFS
        await fs.writeFile(filePath, file.buffer);

        return {
          id: fileId,
          name: file.originalname,
          filename: filename,
          type: getAttachmentType(file.mimetype),
          mimeType: file.mimetype,
          size: file.size,
          path: filePath,
          url: `/api/attachments/${userId}/${sessionId}/${filename}`,
        };
      })
    );

    res.json({ attachments });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ error: 'Failed to upload attachments' });
  }
});

/**
 * Retrieve attachment from NFS
 * GET /api/attachments/:userId/:sessionId/:filename
 */
router.get('/:userId/:sessionId/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, sessionId, filename } = req.params;

    const filePath = path.join(
      NFS_BASE_PATH!,
      'individual',
      userId!,
      'attachments',
      sessionId!,
      filename!
    );

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Get file stats for content-length
    const stats = await fs.stat(filePath);

    // Determine content type from extension
    const ext = path.extname(filename!).toLowerCase();
    const contentType = getContentType(ext);

    // Set headers with CORS
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream file
    const fileStream = await fs.readFile(filePath);
    res.send(fileStream);
  } catch (error) {
    console.error('Error retrieving attachment:', error);
    res.status(500).json({ error: 'Failed to retrieve attachment' });
  }
});

/**
 * Delete attachment from NFS
 * DELETE /api/attachments/:userId/:sessionId/:filename
 */
router.delete('/:userId/:sessionId/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, sessionId, filename } = req.params;

    const filePath = path.join(
      NFS_BASE_PATH!,
      'individual',
      userId!,
      'attachments',
      sessionId!,
      filename!
    );

    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

/**
 * List attachments for a session
 * GET /api/attachments/:userId/:sessionId
 */
router.get('/:userId/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, sessionId } = req.params;

    const attachmentDir = path.join(
      NFS_BASE_PATH!,
      'individual',
      userId!,
      'attachments',
      sessionId!
    );

    try {
      const files = await fs.readdir(attachmentDir);
      const attachments = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(attachmentDir, filename);
          const stats = await fs.stat(filePath);
          const ext = path.extname(filename);

          return {
            filename,
            size: stats.size,
            mimeType: getContentType(ext),
            url: `/api/attachments/${userId}/${sessionId}/${filename}`,
          };
        })
      );

      res.json({ attachments });
    } catch {
      res.json({ attachments: [] });
    }
  } catch (error) {
    console.error('Error listing attachments:', error);
    res.status(500).json({ error: 'Failed to list attachments' });
  }
});

// Helper functions
function getAttachmentType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

function getContentType(ext: string): string {
  const types: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
  };

  return types[ext] || 'application/octet-stream';
}

export default router;
