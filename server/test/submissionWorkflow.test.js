const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateGithubUrl,
  validateSubmissionInput,
  isAllowedFile,
  canSubmitToMilestone,
  isValidReviewAction,
  REVIEW_ACTION_STATUS,
  MAX_FILE_SIZE,
} = require('../utils/submissionWorkflow');

test('accepts a valid GitHub repository URL', () => {
  const result = validateGithubUrl('https://github.com/danilankamo/gradflow');
  assert.equal(result.valid, true);
  assert.equal(result.value, 'https://github.com/danilankamo/gradflow');
});

test('rejects a non-GitHub URL', () => {
  const result = validateGithubUrl('https://gitlab.com/danilankamo/gradflow');
  assert.equal(result.valid, false);
  assert.match(result.message, /github\.com/);
});

test('rejects a malformed URL', () => {
  const result = validateGithubUrl('not-a-url');
  assert.equal(result.valid, false);
  assert.match(result.message, /valid URL/);
});

test('treats an empty GitHub URL as optional', () => {
  const result = validateGithubUrl('');
  assert.equal(result.valid, true);
  assert.equal(result.value, '');
});

test('requires a file or a GitHub URL for a deliverable', () => {
  const result = validateSubmissionInput({ githubUrl: '', description: '', hasFile: false });
  assert.equal(result.valid, false);
  assert.match(result.message, /Attach a deliverable file or provide a GitHub URL/);
});

test('accepts a deliverable with only a GitHub URL', () => {
  const result = validateSubmissionInput({
    githubUrl: 'https://github.com/danilankamo/gradflow',
    description: '  Final report  ',
    hasFile: false,
  });
  assert.equal(result.valid, true);
  assert.equal(result.description, 'Final report');
  assert.equal(result.githubUrl, 'https://github.com/danilankamo/gradflow');
});

test('accepts a deliverable with only an uploaded file', () => {
  const result = validateSubmissionInput({ githubUrl: '', description: '', hasFile: true });
  assert.equal(result.valid, true);
});

test('allows supported deliverable file types', () => {
  assert.equal(isAllowedFile({ mimetype: 'application/pdf', originalname: 'report.pdf' }), true);
  assert.equal(
    isAllowedFile({
      mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      originalname: 'slides.pptx',
    }),
    true
  );
  assert.equal(isAllowedFile({ mimetype: 'application/zip', originalname: 'code.zip' }), true);
});

test('rejects unsupported or executable file types', () => {
  assert.equal(isAllowedFile({ mimetype: 'application/x-msdownload', originalname: 'virus.exe' }), false);
  assert.equal(isAllowedFile({ mimetype: 'application/pdf', originalname: 'script.sh' }), false);
  assert.equal(isAllowedFile({ mimetype: '', originalname: 'report.pdf' }), false);
});

test('exposes a 10 MB upload limit', () => {
  assert.equal(MAX_FILE_SIZE, 10 * 1024 * 1024);
});

test('only pending or revision milestones accept new deliverables', () => {
  assert.equal(canSubmitToMilestone('pending'), true);
  assert.equal(canSubmitToMilestone('revision'), true);
  assert.equal(canSubmitToMilestone('submitted'), false);
  assert.equal(canSubmitToMilestone('approved'), false);
});

test('only approve and revision are valid review actions', () => {
  assert.equal(isValidReviewAction('approve'), true);
  assert.equal(isValidReviewAction('revision'), true);
  assert.equal(isValidReviewAction('reject'), false);
  assert.equal(REVIEW_ACTION_STATUS.approve, 'approved');
  assert.equal(REVIEW_ACTION_STATUS.revision, 'revision');
});
