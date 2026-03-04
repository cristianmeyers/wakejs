const path = require("path");
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const apiRoutes = require("./routes/apiRoutes");

const configPath = path.join(__dirname, "config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes(config));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
