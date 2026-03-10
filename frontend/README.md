# Frontend — WakeJS

Interface web statique (HTML + Vanilla JS ES Modules + Tailwind CSS) qui communique avec l'API WakeJS.

> Aucun bundler requis. Les fichiers sont servis directement (nginx, Apache, ou tout serveur de fichiers statiques).

---

## Technologies

| Couche  | Technologie                                          |
| ------- | ---------------------------------------------------- |
| Markup  | HTML5                                                |
| Style   | Tailwind CSS (CDN) + `style.css` pour les surcharges |
| Scripts | Vanilla JS, ES Modules natifs (`type="module"`)      |
| Icônes  | Font Awesome 6 (CDN)                                 |
| Thème   | Dark / Light avec persistance `localStorage`         |

---

## Structure

```
frontend/
├── index.html              # Page unique (SPA)
└── assets/
    ├── js/
    │   ├── app.js          # Point d'entrée, orchestration générale
    │   ├── api.js          # Couche HTTP (fetch vers le backend)
    │   ├── theme.js        # Bascule dark/light mode
    │   └── components/
    │       ├── navigation.js   # Sélection département → salle
    │       ├── hosts.js        # Rendu des cartes hôte + actions
    │       └── search.js       # Barre de recherche globale
    ├── config/
    │   ├── config.json     # Configuration API, UI, sites
    │   └── rooms.json      # Mapping départements → salles → hôtes
    └── style/
        └── style.css       # Classes personnalisées et animations
```

---

## Flux de démarrage (`app.js`)

```
startApp()
  ├── Charge config.json et rooms.json
  ├── initDashboard()
  │   ├── initTheme()         → applique le thème selon config + préférence stockée
  │   ├── initNavigation()    → construit la grille des départements et salles
  │   └── initSearch()        → active la barre de recherche globale
  ├── checkApiHealth()         → ping /api/health toutes les 30 secondes
  └── verifyToken()            → si authEnabled, vérifie le JWT en localStorage
      └── showLogin() si invalide ou absent
```

---

## Composants JS

### `api.js`

Couche d'abstraction pour tous les appels HTTP. Gère l'injection automatique du header `Authorization: Bearer <token>` dans chaque requête authentifiée. Expose `login()` et `verifyToken()` pour la gestion de session.

### `theme.js`

Gère la bascule dark/light mode. Lit le mode (`"manual"` ou `"auto"`) depuis `config.ui.theme`. En mode `manual`, affiche un bouton toggle dans le header. En mode `auto`, suit la préférence système (`prefers-color-scheme`).

### `components/navigation.js`

Construit dynamiquement la grille des départements depuis `rooms.json`. Au clic sur un département, affiche ses salles. Au clic sur une salle, appelle le callback fourni par `app.js` pour déclencher `handleSalleSelection()`.

### `components/hosts.js` — `HostComponent`

Responsable du rendu des cartes hôte et des actions groupées. Méthodes principales :

| Méthode                                        | Description                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `HostComponent.refresh(salle)`                 | Charge et affiche les hôtes de la salle avec leur statut ping                                  |
| `HostComponent.execute(action, salle, config)` | Exécute `ping`, `awake` ou `shutdown` sur les hôtes sélectionnés (ou tous si aucune sélection) |
| `HostComponent.toggleSelectAll()`              | Sélectionne / désélectionne tous les hôtes visibles                                            |

### `components/search.js`

Barre de recherche globale (poste, IP, salle). Les résultats apparaissent en dropdown au-dessus de la navigation. Au clic sur un résultat, `handleTeleport()` dans `app.js` navigue directement vers la salle et met en surbrillance le poste concerné.

---

## Auto-refresh

Quand une salle est ouverte et que `config.ui.autoRefresh` est activé, un ping automatique est déclenché toutes les `refreshInterval` ms. Le refresh est suspendu si l'utilisateur a sélectionné des hôtes (présence de cartes avec la classe `ring-4`) afin de ne pas perturber une action en cours.

---

## Authentification

Si `config.api.authEnabled` est `true`, l'application vérifie au démarrage la présence d'un token JWT valide dans `localStorage` (`wakejs_token`). Si le token est absent ou expiré, l'overlay de login est affiché. Le token est stocké après un login réussi et retiré au logout.

---

## Modal SSH

Lors d'une action `shutdown`, le frontend affiche une modale demandant le système d'exploitation cible et le mot de passe administrateur. Ces informations sont transmises au backend pour l'exécution via `sshpass`. Le mot de passe n'est jamais stocké côté client.

---

## Déploiement

Servir le dossier `frontend/` avec n'importe quel serveur HTTP statique :

```bash
# Exemple avec Python
cd frontend
python3 -m http.server 8080

# Exemple nginx — bloc server minimal
server {
    listen 80;
    root /var/www/wakejs/frontend;
    index index.html;
}
```

Mettre à jour `assets/config/config.json` pour pointer `api.baseUrl` vers l'adresse réelle du backend.
