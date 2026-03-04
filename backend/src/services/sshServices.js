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
  const pubKey = process.env.SSH_PUBLIC_KEY_PATH;

  let command =
    os === "windows"
      ? "shutdown /s /t 0"
      : password
        ? `echo '${password}' | sudo -S shutdown now`
        : "sudo shutdown now";

  try {
    await execPromise(
      `ssh -i ${privKey} -o ConnectTimeout=${config.sshTimeout} -o StrictHostKeyChecking=no -o BatchMode=yes ${user}@${host.ip} "${command}"`,
    );
    return { id: host.id, status: "OK" };
  } catch (error) {
    if (!password) {
      return { id: host.id, status: "AUTH_REQUIRED", ip: host.ip };
    }

    try {
      await execPromise(
        `sshpass -p '${password}' ssh-copy-id -i ${pubKey} -o StrictHostKeyChecking=no ${user}@${host.ip}`,
      );
      await execPromise(
        `sshpass -p '${password}' ssh -o StrictHostKeyChecking=no ${user}@${host.ip} "${command}"`,
      );
      return { id: host.id, status: "OK", key_installed: true };
    } catch (sshPassError) {
      return {
        id: host.id,
        status: "ERROR",
        message: "Auth failed or sudo rejected password",
      };
    }
  }
};

module.exports = { runShutdown };
