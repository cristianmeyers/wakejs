const express = require("express");
const fs = require("fs");
const ping = require("ping");
const wol = require("wol");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Listening
const HOST = "0.0.0.0";
const PORT = 3000;

// ====================================================== VLAN Configuration
// VLAN configuration and their broadcast addresses
const VLAN_CONFIG = [
  {
    // VLAN 1: Subnet range 172.18.53.0 to 172.18.59.0
    subnetStart: 53,
    subnetEnd: 59,
    broadcastAddress: "172.18.60.255",
    description: "Primary VLAN (subnets 53-59)",
  },
  {
    // VLAN 2: Subnet range 172.18.240.0 to 172.18.247.0
    subnetStart: 240,
    subnetEnd: 247,
    broadcastAddress: "172.18.240.255",
    description: "Secondary VLAN (subnets 240-247)",
  },
];

// Wake-on-LAN port configuration (default: 9, same as wakeonlan command)
const WOL_PORT = 9;

function parseDhcp(filePath) {
  const configPath = path.join(__dirname, "..", "config", "dhcpd.conf");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `❌ DHCP file not found: ${configPath}\n   Create backend/config/dhcpd.conf with hosts`,
    );
  }

  const content = fs.readFileSync(configPath, "utf8");
  const hosts = [];
  const lines = content.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (!line.startsWith("host ")) continue;

    const name = line.match(/host\s+([\w-]+)/i)?.[1];
    const mac = line.match(/hardware ethernet\s+([0-9a-f:]+)/i)?.[1];
    const ip = line.match(/fixed-address\s+([\d.]+)/i)?.[1];
    let room = null;
    const commentMatch = line.match(/#\s*(\S+)/i);
    if (commentMatch) room = commentMatch[1];

    if (name && mac && ip) {
      hosts.push({ id: name, mac: mac.toLowerCase(), ip, room });
    }
  }

  if (hosts.length === 0) {
    console.warn("⚠️  No hosts were found in dhcpd.conf");
  }

  return hosts;
}

function getBroadcastAddress(ip) {
  const parts = ip.split(".");

  // Validate IP is in 172.18.x.x format
  if (parts.length !== 4 || parts[0] !== "172" || parts[1] !== "18") {
    console.warn(
      `⚠️  IP ${ip} is not in expected range 172.18.x.x, using default broadcast`,
    );
    return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
  }

  const thirdOctet = parseInt(parts[2], 10);

  // Find the corresponding VLAN configuration
  for (const vlan of VLAN_CONFIG) {
    if (thirdOctet >= vlan.subnetStart && thirdOctet <= vlan.subnetEnd) {
      console.log(
        `📡 IP ${ip} → Broadcast ${vlan.broadcastAddress} (${vlan.description})`,
      );
      return vlan.broadcastAddress;
    }
  }

  // If not found in any configured VLAN, use previous method as fallback
  console.warn(
    `⚠️  IP ${ip} does not match any configured VLAN, using default broadcast`,
  );
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
  // If <= 10 hosts, wake all at once
  if (hosts.length <= 10) {
    return await Promise.all(
      hosts.map(
        (h) =>
          new Promise((resolve) => {
            wol.wake(
              h.mac,
              { address: getBroadcastAddress(h.ip), port: WOL_PORT },
              (err) => {
                if (err) resolve({ ...h, awake: false, error: err.message });
                else resolve({ ...h, awake: true });
              },
            );
          }),
      ),
    );
  }

  // If > 10 hosts, wake in blocks of 5 with 1 minute delay
  const results = [];
  for (let i = 0; i < hosts.length; i += 5) {
    const block = hosts.slice(i, i + 5);

    console.log(
      `Waking block ${Math.floor(i / 5) + 1} (${block.length} hosts)...`,
    );

    const blockResults = await Promise.all(
      block.map(
        (h) =>
          new Promise((resolve) => {
            wol.wake(
              h.mac,
              { address: getBroadcastAddress(h.ip), port: WOL_PORT },
              (err) => {
                if (err) resolve({ ...h, awake: false, error: err.message });
                else resolve({ ...h, awake: true });
              },
            );
          }),
      ),
    );

    results.push(...blockResults);

    // Wait 1 minute except for the last block
    if (i + 5 < hosts.length) {
      console.log(`Pausing 1 minute before next block...`);
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
    return res.status(400).json({ error: "Missing parameters" });

  const allHosts = parseDhcp();
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
            { address: getBroadcastAddress(host.ip), port: WOL_PORT },
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

// ====================================================== Listening
app.listen(PORT, HOST, () => {
  console.log(`🚀 API WOL at http://${HOST}:${PORT}`);
  console.log(`   ✅ Reachable from: localhost:${PORT}, any IPs on server`);
  console.log(`\n📋 VLAN Configuration:`);
  VLAN_CONFIG.forEach((vlan, idx) => {
    console.log(`   ${idx + 1}. ${vlan.description}`);
    console.log(
      `      Subnets: 172.18.${vlan.subnetStart}.0 - 172.18.${vlan.subnetEnd}.0`,
    );
    console.log(`      Broadcast: ${vlan.broadcastAddress}`);
  });
});
