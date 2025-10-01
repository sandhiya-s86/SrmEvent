import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../types';
import { config } from '../config/config';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = config.UPLOAD_PATH;
    
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and documents
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Only images and documents are allowed', 400));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE
  },
  fileFilter
});

// Upload single file
router.post('/single', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: fileUrl
    }
  });
}));

// Upload multiple files
router.post('/multiple', authenticateToken, upload.array('files', 5), asyncHandler(async (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const files = req.files as Express.Multer.File[];
  const uploadedFiles = files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `/uploads/${file.filename}`
  }));

  res.json({
    success: true,
    message: `${files.length} files uploaded successfully`,
    data: uploadedFiles
  });
}));

// Upload profile image
router.post('/profile-image', authenticateToken, upload.single('profileImage'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  // Validate it's an image
  if (!req.file.mimetype.startsWith('image/')) {
    // Delete the uploaded file
    fs.unlinkSync(req.file.path);
    throw new AppError('Only image files are allowed for profile images', 400);
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  // Update user profile image in database
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { profileImage: fileUrl }
  });

  res.json({
    success: true,
    message: 'Profile image updated successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl
    }
  });
}));

// Upload event image
router.post('/event-image', authenticateToken, upload.single('eventImage'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  // Validate it's an image
  if (!req.file.mimetype.startsWith('image/')) {
    // Delete the uploaded file
    fs.unlinkSync(req.file.path);
    throw new AppError('Only image files are allowed for event images', 400);
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  res.json({
    success: true,
    message: 'Event image uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl
    }
  });
}));

// Delete file
router.delete('/:filename', authenticateToken, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(config.UPLOAD_PATH, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new AppError('File not found', 404);
  }

  // Delete file
  fs.unlinkSync(filePath);

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
}));

// Serve uploaded files
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(config.UPLOAD_PATH, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }

  // Set appropriate headers
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);

  // Stream file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

export default router;

