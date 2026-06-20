const fs = require("fs").promises;
const path = require("path");

const parseDhcp = async (config) => {
  const dhcpPath = process.env.DHCP_PATH;
  const absolutePath = path.isAbsolute(dhcpPath)
    ? dhcpPath
    : path.resolve(process.cwd(), dhcpPath);

  try {
    const content = await fs.readFile(absolutePath, "utf8");
    const hosts = [];
    const roomRegex = config.includeHashSpace ? /#\s+(\S+)/ : /#(\S+)/;

    const lines = content.split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line.startsWith("host ")) continue;

      const name = line.match(/host\s+([\w-]+)/i)?.[1];
      const mac = line.match(/hardware ethernet\s+([0-9a-f:]+)/i)?.[1];
      const ip = line.match(/fixed-address\s+([\d.]+)/i)?.[1];
      const roomMatch = line.match(roomRegex);
      const room = roomMatch ? roomMatch[1] : null;

      if (name && mac && ip && room) {
        hosts.push({
          id: name,
          mac: mac.toLowerCase(),
          ip,
          room: room.toLowerCase(),
        });
      }
    }
    return hosts;
  } catch (error) {
    return [];
  }
};

const getBroadcast = (ip, config) => {
  const parts = ip.split(".");
  if (parts.length < 4) return "255.255.255.255";

  const thirdOctet = parseInt(parts[2], 10);
  const vlan = config.vlans.find(
    (v) => thirdOctet >= v.subnetStart && thirdOctet <= v.subnetEnd,
  );

  return vlan
    ? vlan.broadcastAddress
    : `${parts[0]}.${parts[1]}.${parts[2]}.255`;
};

module.exports = { parseDhcp, getBroadcast };
