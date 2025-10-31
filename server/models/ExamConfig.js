const mongoose = require('mongoose');

const ExamConfigSchema = new mongoose.Schema({
  branch: { type: String, required: true },
  year: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  numberOfQuestions: { type: Number, required: true, default: 20 },
  timeLimit: { type: Number, required: true, default: 60 }, // Store in minutes
  createdAt: { type: Date, default: Date.now },
  section: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('ExamConfig', ExamConfigSchema);