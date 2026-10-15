// Protects internal endpoints that only other microservices may call.
// The caller must send the shared secret in the "x-service-key" header.
module.exports = function serviceAuth(req, res, next) {
  const key = req.header('x-service-key');
  if (!process.env.SERVICE_KEY || key !== process.env.SERVICE_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized service call' });
  }
  next();
};
