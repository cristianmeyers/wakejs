const jwt = require("jsonwebtoken");
const logger = require("../services/loggerService");
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    await logger.auth("REJECTED", "unknown", ip, "No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    await logger.auth("FORBID", "unknown", ip, "Invalid token");
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
