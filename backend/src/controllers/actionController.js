const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");
const ping = require("ping");
const logger = require("../services/loggerService");
const dhcpService = require("../services/dhcpServices");
const wolService = require("../services/wolServices");
const sshService = require("../services/sshServices");

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

exports.login = (req, res, config) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!AUTH_ENABLED) {
    logger.info("AUTH", `BYPASS  | IP: ${ip} | Mode: Guest Access`);
    const token = jwt.sign(
      { username: "anonymous", method: "none" },
      JWT_SECRET,
      { expiresIn: "24h" },
    );
    return res.json({ token, method: "none" });
  }

  const { username, password } = req.body;
  logger.info("AUTH", `TRY     | User: ${username} | IP: ${ip}`);

  const client = ldap.createClient({
    url: config.adConfig.url,
    connectTimeout: 5000,
    timeout: 5000,
  });

  let responseSent = false;
  const upn = username.includes("@")
    ? username
    : `${username}${config.adConfig.domainSuffix}`;

  client.bind(upn, password, (err) => {
    if (responseSent) return;
    if (err) {
      responseSent = true;
      logger.error(
        "AUTH",
        `FAILED  | User: ${username} | IP: ${ip} | Reason: Invalid Credentials`,
      );
      client.destroy();
      return res.status(401).json({ error: "Authentication failed" });
    }

    const shortUsername = username.split("@")[0];
    const searchOptions = {
      scope: "sub",
      filter: `(sAMAccountName=${shortUsername})`,
      attributes: ["dn"],
    };

    client.search(
      config.adConfig.searchBase,
      searchOptions,
      (err, searchRes) => {
        if (err) {
          logger.error(
            "AUTH",
            `ERROR   | User: ${username} | IP: ${ip} | Search failed`,
            err,
          );
          client.destroy();
          return res.status(500).json({ error: "Directory search failed" });
        }

        let userFullDN = "";
        searchRes.on("searchEntry", (entry) => {
          userFullDN = entry.objectName
            ? entry.objectName.toString()
            : entry.dn.toString();
        });

        searchRes.on("error", (sErr) => {
          if (!responseSent) {
            responseSent = true;
            logger.error(
              "AUTH",
              `LDAP ERR| User: ${username} | IP: ${ip}`,
              sErr,
            );
            res.status(500).json({ error: "LDAP search error" });
          }
        });

        searchRes.on("end", () => {
          if (responseSent) return;
          responseSent = true;

          if (!userFullDN) {
            logger.warn("AUTH", `NOTFOUND| User: ${username} | IP: ${ip}`);
            client.unbind();
            return res.status(404).json({ error: "User not found" });
          }

          const userDNLower = userFullDN.toLowerCase();
          const banned = config.adConfig.bannedOUs || [];
          const allowed = config.adConfig.authorizedOUs || [];

          const isBanned = banned.some((ou) =>
            userDNLower.includes(ou.toLowerCase()),
          );
          if (isBanned) {
            logger.warn(
              "AUTH",
              `BANNED  | User: ${username} | IP: ${ip} | OU: ${userFullDN}`,
            );
            client.unbind();
            return res.status(403).json({ error: "Access denied: Banned OU" });
          }

          const isAllAllowed = allowed
            .map((ou) => ou.toLowerCase())
            .includes("all");
          const isAuthorized =
            isAllAllowed ||
            allowed.some((ou) => userDNLower.includes(ou.toLowerCase()));

          if (!isAuthorized) {
            logger.warn(
              "AUTH",
              `FORBID  | User: ${username} | IP: ${ip} | OU: ${userFullDN}`,
            );
            client.unbind();
            return res
              .status(403)
              .json({ error: "Access denied: Unauthorized OU" });
          }

          logger.success(
            "AUTH",
            `SUCCESS | User: ${username} | IP: ${ip} | Token Issued`,
          );
          const token = jwt.sign({ username, method: "ad" }, JWT_SECRET, {
            expiresIn: config.jwtExpiration || "8h",
          });

          client.unbind();
          res.json({ token, method: "ad" });
        });
      },
    );
  });
};

exports.search = (req, res, config) => {
  const query = req.query.q?.toLowerCase();
  if (!query) return res.json([]);

  const results = dhcpService
    .parseDhcp(config)
    .filter((h) => h.id.toLowerCase().includes(query))
    .slice(0, 5);

  res.json(results);
};

exports.executeAction = async (req, res, config) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const user = req.user?.username || "unknown";
  const { type, name, action, credentials } = req.body;

  logger.info(
    "ACTION",
    `EXEC    | User: ${user} | Action: ${action} | Target: ${type}:${name} | IP: ${ip}`,
  );

  const allHosts = dhcpService.parseDhcp(config);
  let targets =
    type === "Hosts"
      ? allHosts.filter((h) => name.split(",").includes(h.id))
      : allHosts.filter((h) => h.room.toLowerCase() === name.toLowerCase());

  if (action === "ping") {
    const results = await Promise.all(
      targets.map(async (h) => {
        const status = await ping.promise.probe(h.ip, { timeout: 2 });
        return { ...h, online: status.alive };
      }),
    );
    return res.json({ action, results });
  }

  if (action === "awake") {
    const results = await wolService.wakeInBatches(
      targets,
      config,
      dhcpService.getBroadcast,
    );
    logger.success(
      "ACTION",
      `WOL     | Sent magic packets to ${targets.length} targets`,
    );
    return res.json({ action, results });
  }

  if (action === "shutdown") {
    const results = await Promise.all(
      targets.map((h) => sshService.runShutdown(h, credentials, config)),
    );
    logger.success(
      "ACTION",
      `SSH     | Shutdown command sent to ${targets.length} targets`,
    );
    return res.json({ action, results });
  }

  logger.warn("ACTION", `UNKNOWN | Action: ${action} attempted by ${user}`);
  res.status(400).json({ error: "Unknown action" });
};

exports.health = (req, res, config) => {
  res.json({
    status: "up",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    auth_enabled: AUTH_ENABLED,
    settings: { checkInterval: config.statusCheckInterval || 30 },
  });
};

exports.verifyToken = (req, res) => {
  res.json({
    authenticated: true,
    user: req.user.username,
    method: req.user.method,
  });
};
