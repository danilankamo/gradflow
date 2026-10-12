const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    abstract: {
      type: String,
      trim: true,
    },
    problemStatement: {
      type: String,
      trim: true,
    },
    objectives: [String],
    methodology: {
      type: String,
      trim: true,
    },
    technologies: [String],
    keywords: [String],
    category: {
      type: String,
      trim: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Submitted',
        'Under Review',
        'Approved',
        'Rejected',
        'Revision',
        'Resubmitted',
        'In Progress',
        'Final Submission',
        'Defense Scheduled',
        'Evaluated',
        'Completed',
        'Archived',
      ],
      default: 'Draft',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    coordinatorComment: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', ProjectSchema);
