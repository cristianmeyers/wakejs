# Configuration Frontend — `assets/config/`

Le frontend charge deux fichiers JSON au démarrage : `config.json` (comportement de l'app) et `rooms.json` (données de navigation).

---

## `config.json`

```json
{
  "api": {
    "baseUrl": "http://localhost:3000",
    "timeout": 15000,
    "authEnabled": true
  },
  "ui": {
    "theme": "manual",
    "autoRefresh": true,
    "refreshInterval": 45000,
    "awakeRefreshDelay": 40000,
    "shutdownRefreshDelay": 10000
  },
  "sites": {
    "brest": { "enabled": true },
    "morlaix": { "enabled": false }
  }
}
```

### Section `api`

| Clé           | Type      | Description                                                                                                                            |
| ------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`     | `string`  | URL complète du backend WakeJS. Mettre l'IP ou le domaine réel en production                                                           |
| `timeout`     | `number`  | Timeout des requêtes HTTP en millisecondes                                                                                             |
| `authEnabled` | `boolean` | Si `true`, vérifie le JWT au démarrage et affiche l'overlay de login si nécessaire. Mettre à `false` uniquement en développement local |

### Section `ui`

| Clé                    | Type      | Description                                                                                                                 |
| ---------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| `theme`                | `string`  | `"manual"` affiche un bouton toggle dark/light dans le header. `"auto"` suit la préférence système (`prefers-color-scheme`) |
| `autoRefresh`          | `boolean` | Active le ping automatique des hôtes en arrière-plan quand une salle est ouverte                                            |
| `refreshInterval`      | `number`  | Intervalle en ms entre chaque refresh automatique (défaut : 45 000 ms = 45s)                                                |
| `awakeRefreshDelay`    | `number`  | Délai en ms avant de re-pinger les hôtes après une action Wake-on-LAN, pour laisser le temps aux machines de démarrer       |
| `shutdownRefreshDelay` | `number`  | Délai en ms avant de re-pinger après un shutdown                                                                            |

### Section `sites`

Contrôle quels sites sont affichés dans la navigation. Chaque clé correspond à un site déclaré dans `rooms.json`.

| Clé                  | Type      | Description                                                              |
| -------------------- | --------- | ------------------------------------------------------------------------ |
| `<nom_site>.enabled` | `boolean` | Si `false`, le site et tous ses départements sont masqués de l'interface |

---

## `rooms.json`

Fichier de mapping qui définit la hiérarchie **site → département → salle → hôtes**.

### Structure attendue

```json
{
  "brest": {
    "SG": {
      "B101": ["pc-b101-01", "pc-b101-02", "pc-b101-03"],
      "B102": ["pc-b102-01", "pc-b102-02"]
    },
    "GB": {
      "C201": ["pc-c201-01"]
    }
  },
  "morlaix": {
    "INFO": {
      "M101": ["pc-m101-01"]
    }
  }
}
```

| Niveau                  | Description                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Clé de premier niveau   | Nom du site (doit correspondre à une clé dans `config.json > sites`)                                                           |
| Clé de deuxième niveau  | Nom du département (affiché dans la grille des départements)                                                                   |
| Clé de troisième niveau | Nom de la salle (affiché dans la grille des salles)                                                                            |
| Tableau de valeurs      | Liste des identifiants d'hôtes — doivent correspondre exactement aux `hostname` définis dans `dhcp-template.conf` côté backend |

> **Important :** les IDs d'hôtes dans `rooms.json` et dans `dhcp-template.conf` doivent être identiques. C'est cet identifiant qui sert de clé de liaison entre le frontend et le backend.
