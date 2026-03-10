const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const runShutdown = async (host, credentials, config) => {
  const os = credentials?.os || "linux";
  const user =
    credentials?.user ||
    (os === "windows" ? config.windowsDefaultUser : config.linuxDefaultUser);
  const password = credentials?.password;
  const privKey = process.env.SSH_PRIVATE_KEY_PATH;

  let command = os === "windows" ? "shutdown /s /t 0" : "sudo shutdown now";
  let sshCmd = "";

  if (password) {
    sshCmd = `sshpass -p '${password}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=${config.sshTimeout} ${user}@${host.ip} "${command}"`;
  } else {
    sshCmd = `ssh -i ${privKey} -o StrictHostKeyChecking=no -o ConnectTimeout=${config.sshTimeout} -o BatchMode=yes ${user}@${host.ip} "${command}"`;
  }

  try {
    await execPromise(sshCmd);
    return { id: host.id, status: "OK" };
  } catch (error) {
    return { id: host.id, status: "ERROR", message: "SSH connection failed" };
  }
};

module.exports = { runShutdown };
