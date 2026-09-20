import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Use uploads/ locally, os.tmpdir() in production (Render has ephemeral filesystem)
const uploadDir = process.env.NODE_ENV === 'production' ? os.tmpdir() : 'uploads';

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sessionId = req.params.id || 'unknown';
    cb(null, `${sessionId}-${Date.now()}${ext}`);
  },
});

const filefilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('application/octet-stream')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: filefilter,
  limits: { fileSize: 1024 * 1024 * 100 }, // 100MB
});

const uploadSingleAudio = upload.single('audio');
export { uploadSingleAudio };