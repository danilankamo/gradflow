const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { MAX_FILE_SIZE, isAllowedFile } = require('../utils/submissionWorkflow');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!isAllowedFile(file)) {
    const error = new Error(
      'Unsupported file type. Allowed: PDF, Word, PowerPoint, Excel, ZIP, text and images.'
    );
    error.statusCode = 400;
    return cb(error);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 10, fieldSize: 20000, parts: 12 },
  fileFilter,
});

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );

const uploadToCloudinary = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({ secure: true });
    const baseName = path.parse(filename).name;
    const extension = path.extname(filename).replace('.', '');
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'gradflow/submissions',
        resource_type: 'auto',
        public_id: baseName,
        format: extension,
      },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });

const persistFile = async (file) => {
  if (!file || !file.buffer) return null;

  if (!isAllowedFile(file) || file.buffer.length > MAX_FILE_SIZE || !hasValidContent(file)) {
    const error = new Error('File content does not match an allowed file type or size');
    error.statusCode = 400;
    throw error;
  }

  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const extension = path.extname(file.originalname || '').toLowerCase();
  const safeName = `${uniqueName}${extension}`;

  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(file.buffer, safeName);
  }

  await fs.promises.mkdir(uploadsDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadsDir, safeName), file.buffer);
  return `/uploads/${safeName}`;
};

const hasValidContent = (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const data = file.buffer;
  if (!Buffer.isBuffer(data) || !data.length) return false;
  const starts = (...bytes) => data.subarray(0, bytes.length).equals(Buffer.from(bytes));
  if (extension === '.pdf') return data.subarray(0, 5).toString() === '%PDF-';
  if (extension === '.png') return starts(137, 80, 78, 71, 13, 10, 26, 10);
  if (['.jpg', '.jpeg'].includes(extension)) return starts(255, 216, 255);
  if (['.zip', '.docx', '.pptx', '.xlsx'].includes(extension)) return starts(80, 75, 3, 4);
  if (['.doc', '.ppt', '.xls'].includes(extension)) return starts(208, 207, 17, 224, 161, 177, 26, 225);
  if (extension === '.txt') return !data.includes(0) && !data.toString('utf8').includes('\ufffd');
  return false;
};

module.exports = { upload, persistFile, uploadsDir, hasValidContent };
