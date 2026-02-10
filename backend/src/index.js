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

function getBroadcastAddress(ip) {
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
}

function selectHosts(hosts, type, name) {
  if (type === "Room") {
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
  // Si <= 10 hosts, tout d'un coup
  if (hosts.length <= 10) {
    return await Promise.all(
      hosts.map(
        (h) =>
          new Promise((resolve) => {
            wol.wake(h.mac, { address: getBroadcastAddress(h.ip) }, (err) => {
              if (err) resolve({ ...h, awake: false, error: err.message });
              else resolve({ ...h, awake: true });
            });
          }),
      ),
    );
  }

  // Si > 10 hosts, par blocs de 5 avec 1 min de délai
  const results = [];
  for (let i = 0; i < hosts.length; i += 5) {
    const block = hosts.slice(i, i + 5);

    console.log(
      `Réveil du bloc ${Math.floor(i / 5) + 1} (${block.length} hosts)...`,
    );

    const blockResults = await Promise.all(
      block.map(
        (h) =>
          new Promise((resolve) => {
            wol.wake(h.mac, { address: getBroadcastAddress(h.ip) }, (err) => {
              if (err) resolve({ ...h, awake: false, error: err.message });
              else resolve({ ...h, awake: true });
            });
          }),
      ),
    );

    results.push(...blockResults);

    // Attendre 1 min sauf pour le dernier bloc
    if (i + 5 < hosts.length) {
      console.log(`Pause de 1 minute avant le prochain bloc...`);
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  return results;
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

  const allHosts = parseDhcp("../config/dhcp-template.conf");
  let requestedIds = [];

  if (type === "Hosts") {
    requestedIds = name.split(",").map((x) => x.trim());
  } else if (type === "Room") {
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
          wol.wake(
            host.mac,
            { address: getBroadcastAddress(host.ip) },
            (err) => {
              if (err)
                resolve({
                  ...host,
                  found: true,
                  awake: false,
                  error: err.message,
                });
              else resolve({ ...host, found: true, awake: true });
            },
          );
        });
      }

      if (action === "shutdown") {
        return new Promise((resolve) => {
          exec(`ssh user@${host.ip} "sudo shutdown now"`, (err) => {
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

      return { ...host, found: true };
    }),
  );

  res.json({ action, count: results.length, results });
});

app.listen(PORT, () => {
  console.log(`API WOL listen to http://localhost:${PORT}`);
});
