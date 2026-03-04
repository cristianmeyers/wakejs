const wol = require("wol");

const sleep = (minutes) =>
  new Promise((resolve) => setTimeout(resolve, minutes * 60000));

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
      await sleep(config.delayBetweenWakes);
    }
  }
  return results;
};

module.exports = { wakeInBatches };
