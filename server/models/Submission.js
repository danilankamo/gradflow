const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema(
  {
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
    },
    githubUrl: {
      type: String,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['submitted', 'approved', 'revision'],
      default: 'submitted',
    },
    feedback: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Submission', SubmissionSchema);
