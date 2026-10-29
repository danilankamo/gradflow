const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { message, statusCode: 400 };
  }

  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file is too large. The maximum size is 10 MB.'
        : 'File upload failed. Please try a different file.';
    error = { message, statusCode: 400 };
  }

  if (err.type === 'entity.parse.failed') error = { statusCode: 400, message: 'Invalid JSON body' };
  if (err.type === 'entity.too.large') error = { statusCode: 413, message: 'Request body is too large' };
  const status = error.statusCode || 500;
  res.status(status).json({
    success: false,
    error: status >= 500 ? 'Server Error' : error.message || 'Request failed',
  });
};

module.exports = errorHandler;
