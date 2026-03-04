const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");
const ping = require("ping");
const dhcpService = require("../services/dhcpServices");
const wolService = require("../services/wolServices");
const sshService = require("../services/sshServices");

const JWT_SECRET = process.env.JWT_SECRET;

exports.login = (req, res, config) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const client = ldap.createClient({
    url: config.adConfig.url,
    connectTimeout: 5000,
    timeout: 5000,
  });

  let responseSent = false;

  client.on("error", (err) => {
    if (!responseSent) {
      responseSent = true;
      res.status(500).json({ error: "LDAP server unreachable" });
    }
  });

  const upn = username.includes("@")
    ? username
    : `${username}${config.adConfig.domainSuffix}`;

  client.bind(upn, password, (err) => {
    if (responseSent) return;
    if (err) {
      responseSent = true;
      client.destroy();
      return res.status(401).json({ error: "Authentication failed" });
    }
    responseSent = true;
    const token = jwt.sign({ username }, JWT_SECRET, {
      expiresIn: config.jwtExpiration || "8h",
    });
    client.unbind();
    res.json({ token });
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
  const { type, name, action, credentials } = req.body;
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
    return res.json({ action, results });
  }

  if (action === "shutdown") {
    const results = await Promise.all(
      targets.map((h) => sshService.runShutdown(h, credentials, config)),
    );
    return res.json({ action, results });
  }

  res.status(400).json({ error: "Unknown action" });
};

exports.health = (req, res, config) => {
  res.json({
    status: "up",
    uptime: Math.floor(process.uptime()) + " seconds",
    timestamp: new Date().toISOString(),
    settings: {
      checkInterval: config.statusCheckInterval || 30,
    },
  });
};

exports.verifyToken = (req, res) => {
  res.json({
    authenticated: true,
    user: req.user.username,
  });
};
