const fs = require("fs");
const path = require("path");

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

const logDirectory = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const logFilePath = path.join(logDirectory, "wakejs-api.log");

if (!fs.existsSync(logDirectory)) {
  try {
    fs.mkdirSync(logDirectory, { recursive: true });
  } catch (err) {
    console.error(`\x1b[31m[LOGGER_ERROR]\x1b[0m`, err);
  }
}

const getTimestamp = () =>
  new Date().toLocaleString("fr-FR", { hour12: false });

const stripColors = (str) => str.replace(/\x1b\[[0-9;]*m/g, "");

const saveToFile = (content) => {
  try {
    fs.appendFileSync(logFilePath, stripColors(content) + "\n");
  } catch (err) {
    console.error(`\x1b[31m[LOGGER_ERROR] Write failed\x1b[0m`);
  }
};

const formatLog = (level, service, message, color) => {
  const ts = `[${getTimestamp()}]`;
  const svc = `[${service.padEnd(7)}]`;
  const lvl = `${level.padEnd(7)}`;

  const consoleMsg = `${COLORS.gray}${ts}${COLORS.reset} ${COLORS.magenta}${svc}${COLORS.reset} ${color}${lvl}${COLORS.reset} | ${message}`;
  console.log(consoleMsg);

  saveToFile(`${ts} ${svc} ${lvl} | ${message}`);
};

const logger = {
  info: (svc, msg) => formatLog("INFO", svc, msg, COLORS.cyan),
  success: (svc, msg) => formatLog("SUCCESS", svc, msg, COLORS.green),
  warn: (svc, msg) => formatLog("WARN", svc, msg, COLORS.yellow),
  error: (svc, msg, err = "") => {
    formatLog("ERROR", svc, msg, COLORS.red);
    if (err) {
      saveToFile(`[${getTimestamp()}] [ERROR_DETAILS] | ${err}`);
      console.error(`${COLORS.red}${err}${COLORS.reset}`);
    }
  },
};

module.exports = logger;
