const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");

// Limite les tentatives sur les routes sensibles de l'installateur :
// max 10 requêtes par minute, par adresse IP. Protège contre le sondage
// réseau (SSRF) et le brute-force pendant la fenêtre où l'app n'est pas
// encore installée (une fois installée, le verrou checkIsInstalled ferme
// de toute façon complètement ces routes).
const setupLimiter = rateLimit({
  windowMs: 60 * 1000, // fenêtre d'1 minute
  max: 10,
  message: {
    success: false,
    message: "Trop de tentatives, réessaie dans un instant.",
  },
});

// Fonction utilitaire : vérifie si l'application est déjà installée,
// réutilisée par plusieurs routes pour éviter de dupliquer la même requête SQL.
// Utilise le pool par défaut : une fois installé, c'est forcément lui (ou config.json,
// déjà lu par ce même pool au démarrage) qui fait foi.
//
// IMPORTANT : on distingue deux cas d'erreur très différents.
// - La table "system_config" n'existe pas encore (code Postgres 42P01) :
//   c'est le signe normal d'une app jamais installée -> on renvoie false.
// - Toute autre erreur (connexion perdue, timeout, base injoignable...) :
//   on NE SAIT PAS si l'app est installée ou non, on ne doit surtout pas
//   deviner "false" ici, sinon une simple coupure réseau rouvrirait /setup
//   sur une application déjà installée. On laisse l'erreur remonter, pour
//   que l'appelant la traite comme un vrai problème, pas comme "pas installé".
async function checkIsInstalled() {
  try {
    const result = await pool.query(
      `SELECT value FROM system_config WHERE key = 'installed';`,
    );
    return Boolean(result.rows.length > 0 && result.rows[0].value === "true");
  } catch (error) {
    if (error.code === "42P01") {
      // Table absente = jamais installé, c'est un cas normal
      return false;
    }
    // Toute autre erreur : on ne conclut rien, on la laisse remonter
    throw error;
  }
}

// 1. Vérifier si l'application est déjà installée
router.get("/status", async (req, res) => {
  try {
    const isInstalled = await checkIsInstalled();
    return res.json({ installed: isInstalled });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erreur lors de la vérification du statut." });
  }
});

// 2. Tester la connexion à la base de données (celle actuellement utilisée OU celle saisie par l'utilisateur)
router.post("/test-db", setupLimiter, async (req, res) => {
  // Verrou de sécurité : une fois l'app installée, ce test ne doit plus
  // pouvoir être déclenché (même directement via curl/Postman, sans passer
  // par le formulaire) — sinon n'importe qui pourrait sonder d'autres bases
  // de données via ce serveur.
  try {
    if (await checkIsInstalled()) {
      return res.status(403).json({
        success: false,
        message: "L'application est déjà installée.",
      });
    }
  } catch (error) {
    // On ne sait pas si l'app est installée (base injoignable, etc.) —
    // par précaution, on refuse plutôt que de risquer de rouvrir /setup
    // sur une application déjà installée.
    return res.status(503).json({
      success: false,
      message: "Impossible de vérifier l'état d'installation pour le moment.",
    });
  }

  const { dbType, config } = req.body;

  // Cas 1 : l'utilisateur veut utiliser la base Docker par défaut (celle du .env)
  if (dbType === "docker") {
    try {
      const client = await pool.connect();
      client.release();
      return res.json({
        success: true,
        message: "Connexion à la base Docker établie avec succès !",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Impossible de joindre la base Docker : " + error.message,
      });
    }
  }

  // Cas 2 : l'utilisateur veut se connecter à une base externe avec ses propres identifiants
  if (dbType === "external") {
    if (!config || !config.host || !config.database || !config.user) {
      return res.status(400).json({
        success: false,
        message: "Informations de connexion incomplètes.",
      });
    }

    // On crée un pool TEMPORAIRE avec les identifiants saisis, séparé du pool global
    const testPool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionTimeoutMillis: 5000, // évite d'attendre indéfiniment si l'hôte ne répond pas
    });

    try {
      const client = await testPool.connect();
      client.release();
      await testPool.end(); // on ferme proprement ce pool temporaire, on n'en a plus besoin
      return res.json({
        success: true,
        message: "Connexion à la base externe établie avec succès !",
      });
    } catch (error) {
      await testPool.end().catch(() => {}); // on ferme même en cas d'échec, pour ne pas laisser de connexions ouvertes
      return res.status(400).json({
        success: false,
        message: "Impossible de joindre la base externe : " + error.message,
      });
    }
  }

  // Cas 3 : SQLite — ce n'est pas encore géré par ce backend (qui utilise pg / PostgreSQL uniquement)
  if (dbType === "sqlite") {
    return res.status(400).json({
      success: false,
      message: "Le mode SQLite n'est pas encore implémenté côté serveur.",
    });
  }

  return res.status(400).json({
    success: false,
    message: "Type de base de données inconnu.",
  });
});

// 3. Exécuter l'installation et créer le premier administrateur
router.post("/install", setupLimiter, async (req, res) => {
  // Même verrou de sécurité : sans ça, n'importe qui pourrait relancer
  // l'installation après coup et créer son propre compte admin, ou rediriger
  // l'application vers une base de données de son choix.
  try {
    if (await checkIsInstalled()) {
      return res.status(403).json({
        error: "L'application est déjà installée.",
      });
    }
  } catch (error) {
    // Même précaution : état inconnu = on refuse plutôt que de deviner
    return res.status(503).json({
      error: "Impossible de vérifier l'état d'installation pour le moment.",
    });
  }

  const { adminName, adminEmail, adminPassword, dbType, dbConfig } = req.body;

  // Validation de sécurité basique
  if (!adminName || !adminEmail || !adminPassword) {
    return res
      .status(400)
      .json({ error: "Tous les champs administrateur sont obligatoires." });
  }

  // On détermine quel pool utiliser selon le choix fait par l'utilisateur à l'étape 1
  let activePool = pool; // par défaut : la base Docker
  let isTemporaryPool = false;

  if (dbType === "external") {
    if (!dbConfig || !dbConfig.host || !dbConfig.database || !dbConfig.user) {
      return res.status(400).json({
        error: "Configuration de base externe incomplète.",
      });
    }
    activePool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port || 5432,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      connectionTimeoutMillis: 5000,
    });
    isTemporaryPool = true;
  }

  if (dbType === "sqlite") {
    return res.status(400).json({
      error: "Le mode SQLite n'est pas encore implémenté côté serveur.",
    });
  }

  try {
    // A. Créer la table de configuration système
    await activePool.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // B. Créer la table des utilisateurs
    await activePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // C. Sécurité : Hachage fort du mot de passe (10 tours d'algorithme)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // D. Insérer le premier compte Administrateur
    await activePool.query(
      `INSERT INTO users (name, email, password, role) 
       VALUES ($1, $2, $3, 'admin') 
       ON CONFLICT (email) DO NOTHING;`,
      [adminName, adminEmail, hashedPassword],
    );

    // E. Verrouiller le système comme "installé"
    await activePool.query(`
      INSERT INTO system_config (key, value) 
      VALUES ('installed', 'true') 
      ON CONFLICT (key) DO UPDATE SET value = 'true';
    `);

    // F. Sauvegarder la configuration de connexion choisie, pour que le reste
    // du serveur puisse l'utiliser après un redémarrage (voir config/db.js)
    if (dbType === "external") {
      const configPath = path.join(__dirname, "..", "..", "config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({ dbType, dbConfig }, null, 2),
      );
    }

    return res.json({
      success: true,
      message: "Installation terminée avec succès !",
    });
  } catch (error) {
    console.error("Erreur durant l'installation :", error);
    return res
      .status(500)
      .json({ error: "Échec de la création des tables et du compte admin." });
  } finally {
    // On ferme le pool temporaire dans tous les cas (succès ou échec), pour ne pas laisser de connexions ouvertes
    if (isTemporaryPool) {
      await activePool.end().catch(() => {});
    }
  }
});

module.exports = router;
