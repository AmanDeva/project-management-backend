// routes/taskDetailsRoutes.js

const express = require('express');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Subtask = require('../models/Subtask');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

module.exports = function(io) {
    const router = express.Router();

    // @route   POST api/tasks/:taskId/comments
    // @desc    Add a comment to a task
    // @access  Private
    router.post('/:taskId/comments', auth, async (req, res) => {
        const { content } = req.body;
        try {
            const newComment = new Comment({
                content,
                taskId: req.params.taskId,
                createdBy: req.user.id,
            });
            const comment = await newComment.save();

            // Add comment to the task's comments array
            const task = await Task.findById(req.params.taskId);
            task.comments.push(comment._id);
            await task.save();

            // Populate comment with user info for real-time update
            const populatedComment = await comment.populate('createdBy', 'name email');

            // Emit real-time event
            io.to(task.projectId.toString()).emit('commentAdded', { taskId: task._id, comment: populatedComment });

            res.status(201).json(comment);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   POST api/tasks/:taskId/subtasks
    // @desc    Add a subtask to a task
    // @access  Private
    router.post('/:taskId/subtasks', auth, async (req, res) => {
        const { title } = req.body;
        try {
            const newSubtask = new Subtask({
                title,
                taskId: req.params.taskId,
            });
            const subtask = await newSubtask.save();

            // Add subtask to the task's subtasks array
            const task = await Task.findById(req.params.taskId);
            task.subtasks.push(subtask._id);
            await task.save();

            // Emit real-time event
            io.to(task.projectId.toString()).emit('subtaskAdded', { taskId: task._id, subtask });

            res.status(201).json(subtask);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   POST api/tasks/:taskId/upload
    // @desc    Upload a file to a task
    // @access  Private
    router.post('/:taskId/upload', auth, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ msg: 'No file uploaded' });
            }

            const task = await Task.findById(req.params.taskId);
            if (!task) {
                return res.status(404).json({ msg: 'Task not found' });
            }

            const newAttachment = {
                fileName: req.file.originalname,
                filePath: req.file.path,
                fileType: req.file.mimetype,
            };

            task.attachments.push(newAttachment);
            await task.save();

            // Emit real-time event
            io.to(task.projectId.toString()).emit('attachmentAdded', { taskId: task._id, attachment: newAttachment });

            res.status(200).json(newAttachment);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    return router;
};