// middleware/auth.js

const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from the Authorization header
  const authHeader = req.header('Authorization');

  // Check if the header exists
  if (!authHeader) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Split the header to get the token part
  // The header format is "Bearer <token>"
  const token = authHeader.split(' ')[1];

  // Check if the token is present
  if (!token) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }

  // Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};