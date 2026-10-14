const path = require('path');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.zip',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

const SUBMITTABLE_MILESTONE_STATUSES = ['pending', 'revision'];
const REVIEW_ACTION_STATUS = {
  approve: 'approved',
  revision: 'revision',
};

const normalizeDescription = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  return value.trim();
};

const validateGithubUrl = (value) => {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: '' };
  }
  if (typeof value !== 'string') {
    return { valid: false, message: 'GitHub URL must be a string' };
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch (error) {
    return { valid: false, message: 'GitHub URL must be a valid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, message: 'GitHub URL must use http or https' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com' && !hostname.endsWith('.github.com')) {
    return { valid: false, message: 'GitHub URL must point to github.com' };
  }

  return { valid: true, value: parsed.href };
};

const validateSubmissionInput = ({ githubUrl, description, hasFile = false }) => {
  const normalizedDescription = normalizeDescription(description);
  if (normalizedDescription === null) {
    return { valid: false, message: 'Description must be text' };
  }

  const githubResult = validateGithubUrl(githubUrl);
  if (!githubResult.valid) {
    return githubResult;
  }

  if (!hasFile && !githubResult.value) {
    return {
      valid: false,
      message: 'Attach a deliverable file or provide a GitHub URL',
    };
  }

  return {
    valid: true,
    description: normalizedDescription,
    githubUrl: githubResult.value,
  };
};

const isAllowedFile = ({ mimetype, originalname } = {}) => {
  const extension = path.extname(originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return false;
  if (!mimetype) return false;
  if (ALLOWED_MIME_TYPES.has(mimetype)) return true;
  return mimetype === 'application/octet-stream';
};

const canSubmitToMilestone = (status) => SUBMITTABLE_MILESTONE_STATUSES.includes(status);

const isValidReviewAction = (action) =>
  Object.prototype.hasOwnProperty.call(REVIEW_ACTION_STATUS, action);

module.exports = {
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  SUBMITTABLE_MILESTONE_STATUSES,
  REVIEW_ACTION_STATUS,
  validateGithubUrl,
  validateSubmissionInput,
  isAllowedFile,
  canSubmitToMilestone,
  isValidReviewAction,
};
