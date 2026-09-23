const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

// Toutes les routes de ce fichier exigent d'être connecté ET admin
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — liste des utilisateurs, sans le mot de passe (même hashé)
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at, last_login_at
       FROM users
       ORDER BY created_at ASC`,
    );
    return res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// GET /api/admin/logs — historique des actions, les plus récentes en premier
// Fait une jointure avec users pour récupérer le nom/email de l'auteur,
// plutôt que de renvoyer juste un user_id brut au frontend.
router.get("/logs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         activity_logs.id,
         activity_logs.module,
         activity_logs.action,
         activity_logs.details,
         activity_logs.created_at,
         users.name AS user_name,
         users.email AS user_email
       FROM activity_logs
       LEFT JOIN users ON users.id = activity_logs.user_id
       ORDER BY activity_logs.created_at DESC
       LIMIT 100`,
    );
    return res.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error("Erreur lors de la récupération des logs :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

module.exports = router;
