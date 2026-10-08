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
    },
    problemStatement: {
      type: String,
    },
    objectives: [String],
    methodology: {
      type: String,
    },
    technologies: [String],
    category: {
      type: String,
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
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', ProjectSchema);
