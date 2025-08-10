// routes/boardRoutes.js

const express = require('express');
const auth = require('../middleware/auth');
const { hasProjectAccess } = require('../middleware/rbac');
const Board = require('../models/Board');
const Project = require('../models/Project');

module.exports = function(io) {
  const router = express.Router();

  // @route   POST api/boards
  // @desc    Create a new board in a project
  // @access  Private
  router.post('/', auth, hasProjectAccess(), async (req, res) => {
    const { name, projectId } = req.body;
    try {
      const newBoard = new Board({
        name,
        projectId
      });
      const board = await newBoard.save();

      // Add board to the project's boards array
      await Project.findByIdAndUpdate(projectId, { $push: { boards: board._id } });

      // Emit real-time event
      io.to(projectId).emit('boardCreated', board);

      res.status(201).json(board);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  return router;
};