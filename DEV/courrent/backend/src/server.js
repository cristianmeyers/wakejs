const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/db");

const { ensureSchema } = require("./config/schema");
const settingsRoutes = require("./routes/settings");
const authRoutes = require("./routes/auth");
const setupRoutes = require("./routes/setup");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

ensureSchema().catch((err) =>
  console.error("Préparation du schéma impossible :", err.message),
);

app.use("/api/admin/settings", settingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/admin", adminRoutes);

app.listen(3000, () => {
  console.log("Serveur démarré sur le port 3000");
});
