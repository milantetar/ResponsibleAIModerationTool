const jwt = require('jsonwebtoken');
const database = require('../database');

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await database.getUserById(decoded.userId);
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

module.exports = { authenticateToken, requireAuth };