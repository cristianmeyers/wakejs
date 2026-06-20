const wol = require("wol");
const ping = require("ping");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const wakeInBatches = async (targets, config, broadcastGetter) => {
  const results = [];
  for (let i = 0; i < targets.length; i += config.wolBatchSize) {
    const batch = targets.slice(i, i + config.wolBatchSize);
    const batchResults = await Promise.all(
      batch.map(
        (h) =>
          new Promise((r) =>
            wol.wake(
              h.mac,
              { address: broadcastGetter(h.ip, config), port: config.wolPort },
              (err) => r({ id: h.id, awake: !err }),
            ),
          ),
      ),
    );
    results.push(...batchResults);
    if (i + config.wolBatchSize < targets.length) {
      await sleep(config.delayBetweenWakes * 1000);
    }
  }
  return results;
};

const verifyStatus = async (ip, attempts = 5, interval = 5000) => {
  for (let i = 0; i < attempts; i++) {
    const res = await ping.promise.probe(ip, { timeout: 2 });
    if (res.alive) return true;
    if (i < attempts - 1) await sleep(interval);
  }
  return false;
};

module.exports = { wakeInBatches, verifyStatus };
