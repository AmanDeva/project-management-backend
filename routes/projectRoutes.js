// routes/projectRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task'); // Ensure Task model is imported
const auth = require('../middleware/auth');
const { hasProjectAccess } = require('../middleware/rbac');
const { Parser } = require('json2csv'); // CSV export

module.exports = function(io) {
    const router = express.Router();

    /**
     * @route   POST api/projects
     * @desc    Create a new project
     * @access  Private
     */
    router.post('/', auth, async (req, res) => {
        try {
            const newProject = new Project({
                name: req.body.name,
                description: req.body.description,
                owner: req.user.id,
                members: [req.user.id],
            });

            const project = await newProject.save();
            io.emit('projectCreated', project);

            res.status(201).json(project);
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    });

    /**
     * @route   PUT api/projects/:projectId
     * @desc    Update a project (Only manager or admin)
     * @access  Private
     */
    router.put('/:projectId', auth, hasProjectAccess(['manager', 'admin']), async (req, res) => {
        try {
            const updatedProject = await Project.findByIdAndUpdate(
                req.params.projectId,
                req.body,
                { new: true }
            );

            if (!updatedProject) {
                return res.status(404).json({ msg: 'Project not found' });
            }

            io.to(req.params.projectId).emit('projectUpdated', updatedProject);
            res.json(updatedProject);
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    });

    /**
     * @route   DELETE api/projects/:projectId
     * @desc    Delete a project (Only admin)
     * @access  Private
     */
    router.delete('/:projectId', auth, hasProjectAccess(['admin']), async (req, res) => {
        try {
            const project = await Project.findById(req.params.projectId);

            if (!project) {
                return res.status(404).json({ msg: 'Project not found' });
            }

            await Project.findByIdAndDelete(req.params.projectId);
            io.emit('projectDeleted', { projectId: req.params.projectId });

            res.json({ msg: 'Project deleted successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    });

    /**
     * @route   GET api/projects/:projectId/analytics
     * @desc    Get analytics for a specific project
     * @access  Private
     */
    router.get('/:projectId/analytics', auth, hasProjectAccess(), async (req, res) => {
        try {
            const projectAnalytics = await Task.aggregate([
                { $match: { projectId: new mongoose.Types.ObjectId(req.params.projectId) } },
                {
                    $group: {
                        _id: '$boardId',
                        taskCount: { $sum: 1 },
                    }
                },
                {
                    $lookup: {
                        from: 'boards',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'boardDetails'
                    }
                },
                { $unwind: '$boardDetails' },
                {
                    $project: {
                        _id: 0,
                        boardName: '$boardDetails.name',
                        taskCount: 1
                    }
                }
            ]);

            res.json(projectAnalytics);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    /**
     * @route   GET api/projects/:projectId/export/tasks
     * @desc    Export all tasks from a project as a CSV file
     * @access  Private
     */
    router.get('/:projectId/export/tasks', auth, hasProjectAccess(), async (req, res) => {
        try {
            const tasks = await Task.find({ projectId: req.params.projectId }).lean();
            if (tasks.length === 0) {
                return res.status(404).json({ msg: 'No tasks found for this project' });
            }

            const fields = ['title', 'description', 'priority', 'dueDate', 'createdAt'];
            const opts = { fields };

            const parser = new Parser(opts);
            const csv = parser.parse(tasks);

            res.header('Content-Type', 'text/csv');
            res.attachment('tasks.csv');
            res.send(csv);

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    return router;
};
