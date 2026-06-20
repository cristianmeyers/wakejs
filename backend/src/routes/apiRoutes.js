const express = require("express");
const router = express.Router();
const actionController = require("../controllers/actionController");
const authMiddleware = require("../middlewares/auth");
const { validateLogin, validateAction } = require("../middlewares/validator");

module.exports = (config) => {
  router.get("/health", (req, res) =>
    actionController.health(req, res, config),
  );
  router.get("/verify", authMiddleware, (req, res) =>
    actionController.verifyToken(req, res),
  );
  router.post("/login", validateLogin, (req, res) =>
    actionController.login(req, res, config),
  );
  router.get("/search", authMiddleware, (req, res) =>
    actionController.search(req, res, config),
  );
  router.post("/action", authMiddleware, validateAction, (req, res) =>
    actionController.executeAction(req, res, config),
  );
  return router;
};
