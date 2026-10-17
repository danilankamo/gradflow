const mongoose = require('mongoose');

const EvaluationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    defenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Defense',
    },
    examinerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scores: {
      implementation: { type: Number, min: 0, max: 100, default: 0 },
      documentation: { type: Number, min: 0, max: 100, default: 0 },
      presentation: { type: Number, min: 0, max: 100, default: 0 },
      problemUnderstanding: { type: Number, min: 0, max: 100, default: 0 },
      functionality: { type: Number, min: 0, max: 100, default: 0 },
    },
    total: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    comments: {
      type: String,
    },
    manuscriptAmendments: {
      type: String,
    },
    verdict: {
      type: String,
      enum: ['distinction', 'minor-corrections', 'major-revisions', 'fail', 'Approved', 'Revision', 'Rejected'],
      default: 'minor-corrections',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

EvaluationSchema.index({ defenseId: 1, examinerId: 1 });
EvaluationSchema.index({ projectId: 1, examinerId: 1 });

module.exports = mongoose.model('Evaluation', EvaluationSchema);
