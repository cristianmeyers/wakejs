const logger = require("../services/loggerService");

const sanitize = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[^a-zA-Z0-9.@\-_,]/g, "").trim();
};

exports.validateLogin = async (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const { username, password } = req.body;

  if (!username || !password) {
    await logger.auth("FAILED", "unknown", ip, "Missing credentials");
    return res.status(400).json({ error: "Username and password required" });
  }

  req.body.username = sanitize(username).substring(0, 50);
  if (!req.body.username) {
    await logger.auth("FAILED", "unknown", ip, "Invalid username");
    return res.status(400).json({ error: "Invalid username" });
  }

  next();
};

exports.validateAction = async (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const user = req.user?.username || "api";
  const { type, name, action, credentials } = req.body;
  const allowedActions = ["ping", "awake", "shutdown"];

  if (!type || !name || !action) {
    await logger.action(
      "FAILED",
      user,
      ip,
      action || "none",
      "none",
      "Missing parameters",
    );
    return res.status(400).json({ error: "Missing parameters" });
  }

  if (!allowedActions.includes(action)) {
    await logger.action("FORBID", user, ip, action, name, "Invalid action");
    return res.status(400).json({ error: "Invalid action type" });
  }

  req.body.name = sanitize(name);
  if (credentials) {
    if (credentials.user)
      req.body.credentials.user = sanitize(credentials.user);
    if (credentials.os) req.body.credentials.os = sanitize(credentials.os);
  }

  next();
};
