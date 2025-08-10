// models/Board.js

const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  // Later, we'll add tasks here
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }]
}, { timestamps: true });

module.exports = mongoose.model('Board', boardSchema);