const express = require("express");
const router = express.Router();
const actionController = require("../controllers/actionController");
const authMiddleware = require("../middlewares/auth");

module.exports = (config) => {
  // Public endpoint for health check
  router.get("/health", (req, res) =>
    actionController.health(req, res, config),
  );

  router.get("/verify", authMiddleware, (req, res) =>
    actionController.verifyToken(req, res),
  );

  // Authentication endpoint
  router.post("/login", (req, res) => actionController.login(req, res, config));

  router.get("/search", authMiddleware, (req, res) =>
    actionController.search(req, res, config),
  );

  router.post("/action", authMiddleware, (req, res) =>
    actionController.executeAction(req, res, config),
  );

  return router;
};
