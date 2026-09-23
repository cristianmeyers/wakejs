const express = require("express");
require("dotenv").config();
const cors = require("cors");
require("./config/db");

const authRoutes = require("./routes/auth");
const setupRoutes = require("./routes/setup");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/admin", adminRoutes);

app.listen(3000, () => {
  console.log("Serveur démarré sur le port 3000");
});
