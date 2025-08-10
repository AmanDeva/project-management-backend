// models/Project.js

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  boards: [{ // Add the boards field here
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);