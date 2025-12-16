import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.use(authenticateToken);

// Upload file to action
router.post('/action/:actionId', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Verify action belongs to user
    const action = await prisma.action.findFirst({
      where: {
        id: req.params.actionId,
        userId: req.userId
      }
    });

    if (!action) {
      // Delete uploaded file
      fs.unlinkSync(file.path);
      return res.status(404).json({
        success: false,
        error: 'Action not found'
      });
    }

    const attachment = await prisma.attachment.create({
      data: {
        actionId: req.params.actionId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`
      }
    });

    res.status(201).json({
      success: true,
      data: attachment
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// Delete attachment
router.delete('/attachment/:attachmentId', async (req: AuthRequest, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.attachmentId },
      include: {
        action: {
          select: { userId: true }
        }
      }
    });

    if (!attachment || attachment.action.userId !== req.userId) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    // Delete file from disk
    const filePath = path.join(uploadDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.attachment.delete({
      where: { id: req.params.attachmentId }
    });

    res.json({
      success: true,
      message: 'Attachment deleted'
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attachment'
    });
  }
});

// Serve uploaded files
router.get('/:filename', async (req: AuthRequest, res) => {
  try {
    const filePath = path.join(uploadDir, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve file'
    });
  }
});

export default router;

