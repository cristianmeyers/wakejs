const path = require("path");
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const apiRoutes = require("./routes/apiRoutes");
const logger = require("./services/loggerService");

const configPath = path.join(__dirname, "config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = express();
app.use(cors());
app.use(express.json());

app.set("config", config);

app.use("/api", apiRoutes(config));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const activeMethods = [];
if (process.env.AUTH_ENABLED === "true") {
  if (config.adConfig) activeMethods.push("LDAP/AD");
  // Aquí se listarán nuevos métodos automáticamente cuando los añadas
} else {
  activeMethods.push("NONE (Bypass Mode)");
}

app.listen(PORT, HOST, () => {
  console.log("");
  logger.success(
    "SERVER",
    `WakeJS Backend initialized on http://${HOST}:${PORT}`,
  );
  logger.info(
    "AUTH",
    `Status: ${process.env.AUTH_ENABLED === "true" ? "ENABLED" : "DISABLED"}`,
  );
  logger.info("AUTH", `Available Strategies: ${activeMethods.join(", ")}`);
  console.log(
    "---------------------------------------------------------------------------------------",
  );
});
