const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'revision'],
      default: 'pending',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

MilestoneSchema.index({ projectId: 1, order: 1, dueDate: 1 });

module.exports = mongoose.model('Milestone', MilestoneSchema);
