const logger = require("../services/loggerService");

const sanitize = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[^a-zA-Z0-9.@\-_,]/g, "").trim();
};

exports.validateLogin = (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const { username, password } = req.body;

  if (!username || !password) {
    logger.auth(
      "FAILED",
      "Unknown",
      ip,
      "Missing login fields",
      logger.COLORS.red,
    );
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const cleanUser = sanitize(username);
  if (cleanUser !== username) {
    logger.auth(
      "TRY",
      "Unknown",
      ip,
      `Sanitized: ${username} -> ${cleanUser}`,
      logger.COLORS.yellow,
    );
  }

  req.body.username = cleanUser.substring(0, 50);

  if (!req.body.username) {
    logger.auth(
      "FAILED",
      "Unknown",
      ip,
      "Invalid username format after sanitization",
      logger.COLORS.red,
    );
    return res.status(400).json({ error: "Invalid username format" });
  }

  next();
};

exports.validateAction = (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const user = req.user?.username || "API";
  const { type, name, action } = req.body;
  const allowedActions = ["ping", "awake", "shutdown"];

  if (!type || !name || !action) {
    logger.action(
      "FAILED",
      user,
      ip,
      action || "none",
      "Incomplete action parameters",
      logger.COLORS.red,
    );
    return res.status(400).json({ error: "Missing action parameters" });
  }

  if (!allowedActions.includes(action)) {
    logger.action(
      "FORBID",
      user,
      ip,
      action,
      "Invalid action type denied",
      logger.COLORS.red,
    );
    return res.status(400).json({ error: "Invalid action type" });
  }

  req.body.name = sanitize(name);
  next();
};
