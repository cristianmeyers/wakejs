const path = require("path");
require("dotenv").config();
const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const apiRoutes = require("./routes/apiRoutes");
const logger = require("./services/loggerService");

async function bootstrap() {
  try {
    await logger.init();
    const configPath = path.join(__dirname, "config/config.json");
    const configData = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(configData);

    const app = express();
    app.disable("x-powered-by");
    app.use(cors());
    app.use(express.json());

    app.set("config", config);
    app.use("/api", apiRoutes(config));

    // GLOBAL ERROR HANDLER (Added here)
    app.use(async (err, req, res, next) => {
      const ip =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

      if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        await logger.auth(
          "FAILED",
          "unknown",
          ip,
          "Malformed JSON payload received",
        );
        return res.status(400).json({ error: "Invalid JSON format" });
      }

      await logger.action(
        "ERROR",
        "SYSTEM",
        ip,
        "CRASH",
        "SERVER",
        err.message,
      );
      res.status(500).json({ error: "Internal server error" });
    });

    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || "0.0.0.0";

    app.listen(PORT, HOST, async () => {
      console.log("");
      await logger.action(
        "SUCCESS",
        "SYSTEM",
        HOST,
        "STARTUP",
        "SERVER",
        `WakeJS initialized on http://${HOST}:${PORT}`,
      );
      console.log(
        "---------------------------------------------------------------------------------------",
      );
    });
  } catch (error) {
    console.error("Bootstrap failure:", error);
    process.exit(1);
  }
}

bootstrap();
