const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const express = require("express");
const fs = require("fs");
const ping = require("ping");
const wol = require("wol");
const { exec } = require("child_process");
const cors = require("cors");

const configPath = path.join(__dirname, "../config/config.json");
const apiConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DHCP_PATH = process.env.DHCP_PATH;
const SSH_USER = process.env.SSH_USER;

const { wolPort, vlans, includeHashSpace } = apiConfig;

function parseDhcp() {
  const absoluteDhcpPath = path.resolve(__dirname, "..", DHCP_PATH);
  if (!fs.existsSync(absoluteDhcpPath)) return [];
  const content = fs.readFileSync(absoluteDhcpPath, "utf8");
  const hosts = [];
  const roomRegex = includeHashSpace ? /#\s+(\S+)/ : /#(\S+)/;

  content.split("\n").forEach((line) => {
    line = line.trim();
    if (!line.startsWith("host ")) return;
    const name = line.match(/host\s+([\w-]+)/i)?.[1];
    const mac = line.match(/hardware ethernet\s+([0-9a-f:]+)/i)?.[1];
    const ip = line.match(/fixed-address\s+([\d.]+)/i)?.[1];
    const roomMatch = line.match(roomRegex);
    const room = roomMatch ? roomMatch[1] : null;
    if (name && mac && ip && room) {
      hosts.push({ id: name, mac: mac.toLowerCase(), ip, room });
    }
  });
  return hosts;
}

function getBroadcast(ip) {
  const parts = ip.split(".");
  if (parts.length < 3) return "255.255.255.255";
  const thirdOctet = parseInt(parts[2], 10);
  const vlan = vlans.find(
    (v) => thirdOctet >= v.subnetStart && thirdOctet <= v.subnetEnd,
  );
  return vlan
    ? vlan.broadcastAddress
    : `${parts[0]}.${parts[1]}.${parts[2]}.255`;
}

// --- Routes ---

app.get("/api/health", (req, res) => res.sendStatus(200));

app.get("/api/search", (req, res) => {
  const query = req.query.q?.toLowerCase();
  if (!query) return res.json([]);
  const allHosts = parseDhcp();
  const results = allHosts
    .filter((h) => h.id.toLowerCase().includes(query))
    .slice(0, 5);
  res.json(results);
});

app.post("/api/action", async (req, res) => {
  const { type, name, action } = req.body;
  const allHosts = parseDhcp();
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
    const results = await Promise.all(
      targets.map(
        (h) =>
          new Promise((r) =>
            wol.wake(
              h.mac,
              { address: getBroadcast(h.ip), port: wolPort },
              (err) => r({ ...h, awake: !err }),
            ),
          ),
      ),
    );
    return res.json({ action, results });
  }

  if (action === "shutdown") {
    const results = await Promise.all(
      targets.map(
        (h) =>
          new Promise((r) =>
            exec(`ssh ${SSH_USER}@${h.ip} "sudo shutdown now"`, (err) =>
              r({ ...h, shutdown: !err }),
            ),
          ),
      ),
    );
    return res.json({ action, results });
  }
  res.status(400).json({ error: "Unknown action" });
});

app.listen(PORT, HOST, () => console.log(`🚀 API: http://${HOST}:${PORT}`));
