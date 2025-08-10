const express = require('express');
const auth = require('../middleware/auth');
const { hasProjectAccess } = require('../middleware/rbac');
const Task = require('../models/Task');
const Board = require('../models/Board');
const User = require('../models/User');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const axios = require('axios');
require('dotenv').config();

module.exports = function (io) {
    const router = express.Router();

    // =========================
    // Create a new task
    // =========================
    router.post('/', auth, async (req, res) => {
        const { title, description, projectId, boardId, assignedTo, dueDate, priority, labels } = req.body;
        try {
            const board = await Board.findById(boardId);
            if (!board) {
                return res.status(404).json({ msg: 'Board not found' });
            }

            const newTask = new Task({
                title,
                description,
                projectId,
                boardId,
                assignedTo,
                dueDate,
                priority,
                labels,
                createdBy: req.user.id
            });

            const task = await newTask.save();
            board.tasks.push(task._id);
            await board.save();

            // ✅ Send email notifications
            if (task.assignedTo && task.assignedTo.length > 0) {
                const assignedUsers = await User.find({ _id: { $in: task.assignedTo } });
                for (const user of assignedUsers) {
                    try {
                        await sendTaskAssignmentEmail(user.email, task);
                    } catch (emailErr) {
                        console.error(`Failed to send task email to ${user.email}:`, emailErr.message);
                    }
                }
            }

            io.to(projectId).emit('taskCreated', task);
            res.status(201).json(task);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // =========================
    // Update a task
    // =========================
    router.put('/:id', auth, async (req, res) => {
        try {
            const task = await Task.findById(req.params.id);
            if (!task) {
                return res.status(404).json({ msg: 'Task not found' });
            }

            const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
            io.to(updatedTask.projectId.toString()).emit('taskUpdated', updatedTask);
            res.json(updatedTask);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // =========================
    // Delete a task
    // =========================
    router.delete('/:id', auth, async (req, res) => {
        try {
            const task = await Task.findById(req.params.id);
            if (!task) {
                return res.status(404).json({ msg: 'Task not found' });
            }

            await Board.findByIdAndUpdate(task.boardId, { $pull: { tasks: task._id } });
            await task.deleteOne();

            io.to(task.projectId.toString()).emit('taskDeleted', req.params.id);
            res.json({ msg: 'Task removed' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // =========================
    // Advanced Search & Filtering
    // =========================
    router.get('/:projectId', auth, hasProjectAccess(), async (req, res) => {
        try {
            const { q, priority, assignedTo, dueDate } = req.query;
            let filter = { projectId: req.params.projectId };

            if (q) {
                filter.$or = [
                    { title: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } }
                ];
            }
            if (priority) {
                filter.priority = priority;
            }
            if (assignedTo) {
                filter.assignedTo = assignedTo;
            }
            if (dueDate) {
                filter.dueDate = { $lte: new Date(dueDate) };
            }

            const tasks = await Task.find(filter)
                .populate('assignedTo', 'name')
                .populate('createdBy', 'name');

            res.json(tasks);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // =========================
    // Send task update to Slack
    // =========================
    router.post('/:taskId/send-to-slack', auth, hasProjectAccess(), async (req, res) => {
        try {
            const task = await Task.findById(req.params.taskId).populate('createdBy', 'name');
            if (!task) return res.status(404).json({ msg: 'Task not found' });

            const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

            await axios.post(slackWebhookUrl, {
                text: `📌 *Task Update*  
*From:* ${task.createdBy.name}  
*Title:* ${task.title}`
            });

            res.json({ msg: '✅ Task sent to Slack successfully' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    return router;
};
