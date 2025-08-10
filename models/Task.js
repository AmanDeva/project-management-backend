// models/Task.js

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dueDate: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  labels: [String],
  subtasks: [{ // New field for subtasks
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subtask',
  }],
  comments: [{ // New field for comments
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  attachments: [{ // New field for attachments
    fileName: String,
    filePath: String,
    fileType: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);