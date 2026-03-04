const fs = require("fs");
const path = require("path");

const parseDhcp = (config) => {
  const dhcpPath = process.env.DHCP_PATH;
  const absolutePath = path.isAbsolute(dhcpPath)
    ? dhcpPath
    : path.resolve(process.cwd(), dhcpPath);

  if (!fs.existsSync(absolutePath)) return [];

  const content = fs.readFileSync(absolutePath, "utf8");
  const hosts = [];
  const roomRegex = config.includeHashSpace ? /#\s+(\S+)/ : /#(\S+)/;

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
};

const getBroadcast = (ip, config) => {
  const parts = ip.split(".");
  if (parts.length < 3) return "255.255.255.255";
  const thirdOctet = parseInt(parts[2], 10);
  const vlan = config.vlans.find(
    (v) => thirdOctet >= v.subnetStart && thirdOctet <= v.subnetEnd,
  );
  return vlan
    ? vlan.broadcastAddress
    : `${parts[0]}.${parts[1]}.${parts[2]}.255`;
};

module.exports = { parseDhcp, getBroadcast };
