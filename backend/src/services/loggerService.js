const fs = require("fs").promises;
const path = require("path");

const logDirectory = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const logFilePath = path.join(logDirectory, "wakejs-api.log");

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

const getTimestamp = () => {
  return new Date()
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
};

const formatColumn = (text, width) =>
  (text || "").toString().padEnd(width).substring(0, width);

const writeLog = async (
  method,
  status,
  user,
  ip,
  message,
  action = "",
  target = "",
) => {
  const ts = getTimestamp();
  const mth = formatColumn(method, 8);
  const sta = formatColumn(status, 12);
  const usr = formatColumn(user, 15);
  const net = formatColumn(ip, 18);

  const actionPart = action ? ` [ ${formatColumn(action, 10)} ] ` : "";
  const targetPart = target ? ` Target: ${target} | ` : "";

  const line = `[${ts}] | ${mth} [ ${sta} ] [ ${usr} ] [ ${net} ]${actionPart}${targetPart}${message}`;

  try {
    await fs.appendFile(logFilePath, line + "\n");
  } catch (err) {
    console.error("Logger error:", err);
  }

  const color =
    status.includes("FAILED") ||
    status.includes("FORBID") ||
    status.includes("ERROR") ||
    status.includes("REJECTED")
      ? COLORS.red
      : status.includes("SUCCESS") || status.includes("OK")
        ? COLORS.green
        : COLORS.cyan;

  console.log(
    `${COLORS.gray}[${ts}]${COLORS.reset} | ${COLORS.magenta}${mth}${COLORS.reset} [ ${color}${sta}${COLORS.reset} ] [ ${usr} ] [ ${net} ]${actionPart}${targetPart}${message}`,
  );
};

const logger = {
  auth: (status, user, ip, msg) =>
    writeLog("AUTH", status, user, ip, ` ${msg}`),
  action: (status, user, ip, action, target, msg) =>
    writeLog("ACTION", status, user, ip, msg, action, target),
  init: async () => {
    try {
      await fs.mkdir(logDirectory, { recursive: true });
      const exists = await fs
        .access(logFilePath)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        const header =
          "---------------------------------------------------------------------------------------\n" +
          "[        Date       ] | Method   [ Status       ] [ USER          ] [ IP               ]\n";
        await fs.writeFile(logFilePath, header);
      }
    } catch (err) {
      console.error("Logger init failed:", err);
    }
  },
};

module.exports = logger;
