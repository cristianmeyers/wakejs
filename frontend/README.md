# Frontend — WakeJS

Interface web statique qui communique avec l'API WakeJS. Aucun bundler requis — les fichiers sont servis directement.

## Stack

| Couche  | Technologie                                          |
| ------- | ---------------------------------------------------- |
| Markup  | HTML5                                                |
| Style   | Tailwind CSS (CDN) + `style.css` pour les surcharges |
| Scripts | Vanilla JS, ES Modules natifs (`type="module"`)      |
| Icônes  | Font Awesome 6 (CDN)                                 |
| Thème   | Dark / Light avec persistance `localStorage`         |

## Structure des fichiers

```
frontend/
├── index.html                  # Page unique (SPA)
└── assets/
    ├── js/
    │   ├── app.js              # Point d'entrée, orchestration générale
    │   ├── api.js              # Couche HTTP (fetch vers le backend)
    │   ├── theme.js            # Bascule dark/light mode
    │   └── components/
    │       ├── navigation.js   # Sélection département → salle
    │       ├── hosts.js        # Rendu des cartes hôte + actions
    │       └── search.js       # Barre de recherche globale
    ├── config/
    │   ├── config.json         # Configuration API, UI, sites
    │   └── rooms.json          # Mapping départements → salles → hôtes
    └── style/
        └── style.css           # Classes personnalisées et animations
```

## Flux de démarrage — `app.js`

```
startApp()
├── Charge config.json et rooms.json
├── initDashboard()
│   ├── initTheme()        → applique le thème selon config + préférence stockée
│   ├── initNavigation()   → construit la grille des départements et salles
│   └── initSearch()       → active la barre de recherche globale
├── checkApiHealth()        → ping /api/health toutes les 30 secondes
└── verifyToken()           → si authEnabled, vérifie le JWT en localStorage
    └── showLogin()         si token invalide ou absent
```

## Composants JS

### `api.js`

Abstraction de tous les appels HTTP. Injection automatique du header `Authorization: Bearer <token>` sur chaque requête authentifiée. Expose `login()` et `verifyToken()` pour la gestion de session.

### `theme.js`

Gère la bascule dark/light. Mode `manual` → bouton toggle dans le header. Mode `auto` → suit la préférence système via `prefers-color-scheme`.

### `components/navigation.js`

Construit dynamiquement la grille des départements depuis `rooms.json`. Au clic sur un département, affiche ses salles. Au clic sur une salle, appelle le callback `handleSalleSelection()` dans `app.js`.

### `components/hosts.js` — `HostComponent`

Rendu des cartes hôte et gestion des actions groupées.

| Méthode                                        | Description                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `HostComponent.refresh(salle)`                 | Charge et affiche les hôtes de la salle avec leur statut ping                                  |
| `HostComponent.execute(action, salle, config)` | Exécute `ping`, `awake` ou `shutdown` sur les hôtes sélectionnés (ou tous si aucune sélection) |
| `HostComponent.toggleSelectAll()`              | Sélectionne / désélectionne tous les hôtes visibles                                            |

### `components/search.js`

Recherche globale (poste, IP, salle). Les résultats s'affichent en dropdown au-dessus de la navigation. Au clic sur un résultat, `handleTeleport()` navigue directement vers la salle et met en surbrillance le poste.

## Comportements clés

### Auto-refresh

Quand une salle est ouverte et que `config.ui.autoRefresh` est activé, un ping est déclenché toutes les `refreshInterval` ms. Le refresh est **suspendu** si des hôtes sont sélectionnés (présence de la classe `ring-4`) afin de ne pas perturber une action en cours.

### Authentification JWT

Si `config.api.authEnabled` est `true`, l'app vérifie au démarrage la présence d'un token JWT valide dans `localStorage` (`wakejs_token`). Token absent ou expiré → l'overlay de login est affiché. Le token est stocké après un login réussi et retiré au logout.

### Modal SSH

Lors d'un `shutdown`, une modale demande l'OS cible et le mot de passe admin. Ces informations sont transmises au backend pour l'exécution via `sshpass`. **Le mot de passe n'est jamais stocké côté client.**

## Déploiement

Servir le dossier `frontend/` avec n'importe quel serveur HTTP statique. Mettre à jour `assets/config/config.json` pour pointer `api.baseUrl` vers l'adresse réelle du backend.

```bash
# Exemple avec Python
cd frontend
python3 -m http.server 8080
```

```nginx
# Exemple nginx — bloc server minimal
server {
    listen 80;
    root /var/www/wakejs/frontend;
    index index.html;
}
```
