const jwt = require("jsonwebtoken");
const logger = require("../services/loggerService");
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("AUTH", `REJECTED | IP: ${ip} | No token provided`);
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.error("AUTH", `FORBID   | IP: ${ip} | Invalid or expired token`);
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = user;
    next();
  });
};

module.exports = authMiddleware;
