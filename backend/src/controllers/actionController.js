const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");
const ping = require("ping");
const logger = require("../services/loggerService");
const dhcpService = require("../services/dhcpServices");
const wolService = require("../services/wolServices");
const sshService = require("../services/sshServices");

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

exports.login = async (req, res, config) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  if (!AUTH_ENABLED) {
    await logger.auth("SUCCESS", "anonymous", ip, "Bypass mode access");
    const token = jwt.sign(
      { username: "anonymous", method: "none" },
      JWT_SECRET,
      { expiresIn: "24h" },
    );
    return res.json({ token, method: "none" });
  }

  const { username, password } = req.body;
  await logger.auth("TRY", username, ip, "Login attempt");

  const client = ldap.createClient({
    url: config.adConfig.url,
    connectTimeout: 5000,
    timeout: 5000,
  });

  const upn = username.includes("@")
    ? username
    : `${username}${config.adConfig.domainSuffix}`;

  try {
    await new Promise((resolve, reject) => {
      client.bind(upn, password, (err) => (err ? reject(err) : resolve()));
    });

    const shortUsername = username.split("@")[0];
    const searchOptions = {
      scope: "sub",
      filter: `(sAMAccountName=${shortUsername})`,
      attributes: ["dn"],
    };

    const userFullDN = await new Promise((resolve, reject) => {
      let dn = "";
      client.search(
        config.adConfig.searchBase,
        searchOptions,
        (err, searchRes) => {
          if (err) return reject(err);
          searchRes.on("searchEntry", (entry) => {
            dn = entry.objectName
              ? entry.objectName.toString()
              : entry.dn.toString();
          });
          searchRes.on("error", (sErr) => reject(sErr));
          searchRes.on("end", () => resolve(dn));
        },
      );
    });

    if (!userFullDN) {
      await logger.auth("FAILED", username, ip, "User not found in directory");
      client.unbind();
      return res.status(404).json({ error: "User not found" });
    }

    const userDNLower = userFullDN.toLowerCase();
    const banned = config.adConfig.bannedOUs || [];
    const allowed = config.adConfig.authorizedOUs || [];

    if (banned.some((ou) => userDNLower.includes(ou.toLowerCase()))) {
      await logger.auth("FORBID", username, ip, `Banned OU: ${userFullDN}`);
      client.unbind();
      return res.status(403).json({ error: "Access denied: Banned OU" });
    }

    const isAuthorized =
      allowed.map((ou) => ou.toLowerCase()).includes("all") ||
      allowed.some((ou) => userDNLower.includes(ou.toLowerCase()));

    if (!isAuthorized) {
      await logger.auth(
        "FORBID",
        username,
        ip,
        `Unauthorized OU: ${userFullDN}`,
      );
      client.unbind();
      return res.status(403).json({ error: "Access denied: Unauthorized OU" });
    }

    await logger.auth("SUCCESS", username, ip, "Token issued");
    const token = jwt.sign({ username, method: "ad" }, JWT_SECRET, {
      expiresIn: config.jwtExpiration || "8h",
    });
    client.unbind();
    res.json({ token, method: "ad" });
  } catch (err) {
    await logger.auth("FAILED", username, ip, `Auth error: ${err.message}`);
    client.destroy();
    return res.status(401).json({ error: "Authentication failed" });
  }
};

exports.search = async (req, res, config) => {
  const query = req.query.q?.toLowerCase();
  if (!query) return res.json([]);

  const allHosts = await dhcpService.parseDhcp(config);
  const results = allHosts
    .filter((h) => h.id.toLowerCase().includes(query))
    .slice(0, 5);

  res.json(results);
};

exports.executeAction = async (req, res, config) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const user = req.user?.username || "unknown";
  const { type, name, action, credentials } = req.body;

  const allHosts = await dhcpService.parseDhcp(config);
  let targets =
    type === "Hosts"
      ? allHosts.filter((h) => name.split(",").includes(h.id))
      : allHosts.filter((h) => h.room.toLowerCase() === name.toLowerCase());

  const targetLabel = `${type}:${name}`;

  if (action === "ping") {
    const results = await Promise.all(
      targets.map(async (h) => {
        const status = await ping.promise.probe(h.ip, { timeout: 2 });
        return { ...h, online: status.alive };
      }),
    );
    await logger.action(
      "SUCCESS",
      user,
      ip,
      action,
      targetLabel,
      `Pinged ${targets.length} hosts`,
    );
    return res.json({ action, results });
  }

  if (action === "awake") {
    const results = await wolService.wakeInBatches(
      targets,
      config,
      dhcpService.getBroadcast,
    );
    await logger.action(
      "SUCCESS",
      user,
      ip,
      action,
      targetLabel,
      `Magic packets sent to ${targets.length} targets`,
    );
    return res.json({
      action,
      results,
      message: "Use 'ping' action in 30 seconds to confirm status",
    });
  }

  if (action === "shutdown") {
    const results = await Promise.all(
      targets.map(async (h) => {
        const probe = await ping.promise.probe(h.ip, { timeout: 2 });
        if (!probe.alive) return { id: h.id, status: "OFFLINE", ip: h.ip };

        if (!credentials?.password) {
          if (config.alwaysPassOnShutdown)
            return { id: h.id, status: "AUTH_REQUIRED", ip: h.ip };
          const keyAttempt = await sshService.runShutdown(h, null, config);
          if (keyAttempt.status === "OK") return keyAttempt;
          return { id: h.id, status: "AUTH_REQUIRED", ip: h.ip };
        }

        return await sshService.runShutdown(h, credentials, config);
      }),
    );

    const authRequired = results.some((r) => r.status === "AUTH_REQUIRED");
    if (authRequired) {
      await logger.action(
        "FORBID",
        user,
        ip,
        action,
        targetLabel,
        "Authentication required for targets",
      );
    } else {
      await logger.action(
        "SUCCESS",
        user,
        ip,
        action,
        targetLabel,
        `Shutdown initiated for ${targets.length} hosts`,
      );
    }

    return res.json({ action, results });
  }

  await logger.action(
    "FORBID",
    user,
    ip,
    action,
    targetLabel,
    "Invalid action attempted",
  );
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
