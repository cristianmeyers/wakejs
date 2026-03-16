# Sources Backend — `src/`

Description rapide du rôle de chaque fichier dans `backend/src/`.

## Structure

```
src/
├── index.js
├── routes/
│   └── apiRoutes.js
├── controllers/
│   └── actionController.js
├── middlewares/
│   ├── auth.js
│   └── validator.js
└── services/
    └── loggerService.js
```

## Fichiers

### `index.js` — Point d'entrée

Bootstrap de l'application Express. Charge `config.json`, initialise le logger, monte les routes et démarre le serveur sur `HOST:PORT`. Contient également le gestionnaire d'erreurs global qui intercepte les JSON malformés et les crashs non gérés.

### `routes/apiRoutes.js` — Déclaration des routes

Déclare les 5 routes de l'API et leur chaîne de middlewares :

| Route     | Méthode | Auth  | Description                                     |
| --------- | ------- | ----- | ----------------------------------------------- |
| `/health` | GET     | ✗     | Vérification de disponibilité du serveur        |
| `/verify` | GET     | ✓ JWT | Validation du token courant                     |
| `/login`  | POST    | ✗     | Authentification AD, retourne un JWT            |
| `/search` | GET     | ✓ JWT | Recherche d'hôtes dans la config DHCP           |
| `/action` | POST    | ✓ JWT | Exécution d'une action (ping / wake / shutdown) |

### `controllers/actionController.js` — Logique métier

Contient les handlers pour chaque route. C'est ici que sont effectués :

- la lecture et le parsing du fichier `dhcp-template.conf`
- la résolution de l'adresse broadcast selon le VLAN de l'hôte
- l'envoi des paquets WoL via le package `wol`
- les pings ICMP via le package `ping`
- les arrêts SSH via `sshpass` + `sudo shutdown`
- la recherche d'hôtes par nom / IP / salle

### `middlewares/auth.js` — Vérification JWT

Middleware Express qui vérifie la présence et la validité du header `Authorization: Bearer <token>`. Rejette avec un `401` si le token est absent, expiré ou invalide. Injecte le payload décodé dans `req.user`.

### `middlewares/validator.js` — Validation des payloads

Valide les corps de requête avant de les passer aux controllers :

- `validateLogin` : vérifie la présence de `username` et `password`
- `validateAction` : vérifie que `type`, `name` et `action` sont présents et valides

Retourne un `400` avec un message d'erreur si la validation échoue.

### `services/loggerService.js` — Logger

Service de log dual (fichier + console colorée). Expose trois méthodes :

| Méthode                                                | Usage                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `logger.auth(status, user, ip, msg)`                   | Trace les tentatives de connexion et vérifications de token                              |
| `logger.action(status, user, ip, action, target, msg)` | Trace toutes les actions exécutées sur les hôtes                                         |
| `logger.init()`                                        | Crée le répertoire `logs/` et initialise le fichier de log avec un en-tête si nécessaire |

Format de log :

```
[DD/MM/YYYY HH:MM:SS] | METHOD   [ STATUS       ] [ USER          ] [ IP               ] [ ACTION   ] Target: ... | message
```

Les statuts contenant `FAILED`, `ERROR`, `FORBID` ou `REJECTED` sont affichés en rouge dans la console. Les statuts `SUCCESS` et `OK` en vert.
