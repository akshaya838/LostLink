// Verifies the JWT sent as "Authorization: Bearer <token>".
// Every service has its own copy of this file and shares only JWT_SECRET,
// so services can check logins without calling each other on every request.
const jwt = require('jsonwebtoken');

function readUser(req) {
  const header = req.header('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    return { id: p.sub, name: p.name, email: p.email, role: p.role };
  } catch {
    return null;
  }
}

// Sets req.user when a valid token is present, but never blocks the request
function optionalAuth(req, res, next) {
  req.user = readUser(req);
  next();
}

// Blocks the request unless the caller is logged in (optionally with a given role)
function requireAuth(...roles) {
  return (req, res, next) => {
    const user = readUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to do this.' });
    }
    req.user = user;
    next();
  };
}

module.exports = { optionalAuth, requireAuth };
