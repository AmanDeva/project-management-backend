// middleware/rbac.js

const Project = require('../models/Project');

exports.hasProjectAccess = (roles = []) => {
  // Ensure roles is always an array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ msg: 'Project ID is required' });
      }

      const project = await Project.findById(projectId).populate('owner');
      if (!project) {
        return res.status(404).json({ msg: 'Project not found' });
      }

      const user = req.user; // User from the auth middleware

      // Check if user is a member of the project
      const isMember = project.members.some(memberId => memberId.toString() === user.id);
      if (!isMember) {
        return res.status(403).json({ msg: 'Forbidden: You are not a member of this project' });
      }

      // Check if user's role is allowed for the action
      if (roles.length > 0) {
        const userRole = req.user.role || 'member'; // Default to member role
        if (!roles.includes(userRole) && project.owner.id.toString() !== user.id) {
          return res.status(403).json({ msg: 'Forbidden: Insufficient permissions' });
        }
      }

      // If the user is the owner, they always have access
      if (project.owner.id.toString() === user.id) {
          return next();
      }

      next();
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };
};