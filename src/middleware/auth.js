const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '❌ يجب تسجيل الدخول أولاً' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.owner = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: '❌ Token غير صالح' });
  }
};

module.exports = authMiddleware;