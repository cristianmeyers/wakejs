const express = require("express");
const fs = require("fs");
const ping = require("ping");
const wol = require("wol");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3000;

function parseDhcp(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const hosts = [];
  const lines = content.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (!line.startsWith("host ")) continue;

    const name = line.match(/host\s+([\w-]+)/)?.[1];
    const mac = line.match(/hardware ethernet\s+([0-9a-f:]+)/)?.[1];
    const ip = line.match(/fixed-address\s+([\d.]+)/)?.[1];
    let room = null;
    const commentMatch = line.match(/#\s*(\S+)/);
    if (commentMatch) room = commentMatch[1];

    if (name && mac && ip) hosts.push({ id: name, mac, ip, room });
  }

  return hosts;
}

function selectHosts(hosts, type, name) {
  if (type === "Room") {
    // Búsqueda case-insensitive
    const nameLower = name.toLowerCase();
    return hosts.filter((h) => h.room && h.room.toLowerCase() === nameLower);
  }
  if (type === "Hosts") {
    const ids = name.split(",").map((x) => x.trim());
    return hosts.filter((h) => ids.includes(h.id));
  }
  return [];
}

async function pingHosts(hosts) {
  return await Promise.all(
    hosts.map((h) =>
      ping.promise
        .probe(h.ip, { timeout: 2 })
        .then((alive) => ({ ...h, online: alive.alive }))
        .catch(() => ({ ...h, online: false })),
    ),
  );
}

async function wakeHosts(hosts) {
  return await Promise.all(
    hosts.map(
      (h) =>
        new Promise((resolve) => {
          wol.wake(h.mac, (err) => {
            if (err) resolve({ ...h, awake: false, error: err.message });
            else resolve({ ...h, awake: true });
          });
        }),
    ),
  );
}

async function shutdownHosts(hosts) {
  return await Promise.all(
    hosts.map(
      (h) =>
        new Promise((resolve) => {
          exec(`ssh user@${h.ip} "sudo shutdown now"`, (err) => {
            if (err) resolve({ ...h, shutdown: false, error: err.message });
            else resolve({ ...h, shutdown: true });
          });
        }),
    ),
  );
}

app.post("/api/action", async (req, res) => {
  const { type, name, action } = req.body;
  if (!type || !name || !action)
    return res.status(400).json({ error: "Faltan parámetros" });

  const allHosts = parseDhcp("dhcp-template.conf");
  let requestedIds = [];

  if (type === "Hosts") {
    requestedIds = name.split(",").map((x) => x.trim());
  } else if (type === "Room") {
    // Búsqueda case-insensitive
    const nameLower = name.toLowerCase();
    requestedIds = allHosts
      .filter((h) => h.room && h.room.toLowerCase() === nameLower)
      .map((h) => h.id);
  }

  const results = await Promise.all(
    requestedIds.map(async (id) => {
      const host = allHosts.find((h) => h.id === id);
      if (!host) return { id, found: false, online: null };

      if (action === "ping") {
        const alive = await ping.promise
          .probe(host.ip, { timeout: 2 })
          .catch(() => ({ alive: false }));
        return { ...host, found: true, online: alive.alive };
      }

      if (action === "awake") {
        return new Promise((resolve) => {
          wol.wake(host.mac, (err) => {
            if (err)
              resolve({
                ...host,
                found: true,
                awake: false,
                error: err.message,
              });
            else resolve({ ...host, found: true, awake: true });
          });
        });
      }

      if (action === "shutdown") {
        return new Promise((resolve) => {
          exec(`ssh user@${h.ip} "sudo shutdown now"`, (err) => {
            if (err)
              resolve({
                ...host,
                found: true,
                shutdown: false,
                error: err.message,
              });
            else resolve({ ...host, found: true, shutdown: true });
          });
        });
      }

      return { ...host, found: true }; // fallback
    }),
  );

  res.json({ action, count: results.length, results });
});

app.listen(PORT, () => {
  console.log(`API WOL escuchando en http://localhost:${PORT}`);
});
