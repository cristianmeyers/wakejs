# Backend — WakeJS API

API REST Express qui expose les actions Wake-on-LAN, ping et arrêt SSH, avec authentification JWT via Active Directory (LDAP).

---

## Prérequis système

- **Node.js ≥ 18**
- **`sshpass`** installé sur la machine qui héberge WakeJS :
  ```bash
  # Debian / Ubuntu
  sudo apt install sshpass

  # RHEL / CentOS
  sudo yum install sshpass
  ```
- Accès réseau **UDP port 9** vers les machines cibles (paquets WoL)
- Accès **LDAP** au contrôleur de domaine Active Directory
- Les machines gérées doivent avoir un compte avec droits `sudo shutdown` sans mot de passe, ou un mot de passe fourni via le frontend SSH modal

---

## Installation

```bash
cd backend
npm install
```

### Variables d'environnement (optionnelles)

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port d'écoute du serveur |
| `HOST` | `0.0.0.0` | Adresse d'écoute |
| `LOG_DIR` | `./logs` | Répertoire des fichiers de log |
| `JWT_SECRET` | — | Secret de signature des tokens JWT **(obligatoire en prod)** |

Créer un fichier `.env` à la racine de `backend/` :

```env
PORT=3000
HOST=0.0.0.0
LOG_DIR=/var/log/wakejs
JWT_SECRET=mon_secret_tres_long
```

---

## Démarrage

```bash
# Via le script projet
bash ../scripts/wakejs.sh

# Directement
node src/index.js
```

---

## Référence API

Toutes les routes sauf `/api/health` et `/api/login` requièrent un header `Authorization: Bearer <token>`.

### `GET /api/health`
Vérifie que le serveur est en ligne. Pas d'authentification requise.

**Réponse :**
```json
{ "status": "ok" }
```

---

### `POST /api/login`
Authentification via Active Directory. Retourne un token JWT.

**Corps :**
```json
{
  "username": "jdupont",
  "password": "motdepasse"
}
```

**Réponse :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### `GET /api/verify`
Vérifie la validité du token JWT actuel.

**Réponse :**
```json
{ "valid": true }
```

---

### `GET /api/search?q=<terme>`
Recherche un hôte par nom, IP ou salle dans la configuration DHCP.

**Réponse :**
```json
[
  { "id": "pc-b101-01", "ip": "172.18.55.10", "mac": "aa:bb:cc:dd:ee:ff", "room": "B101" }
]
```

---

### `POST /api/action`
Déclenche une action sur une salle ou des hôtes spécifiques.

**Corps :**
```json
{
  "type": "Room",
  "name": "B101",
  "action": "awake"
}
```

| Champ | Valeurs | Description |
|---|---|---|
| `type` | `Room` / `Hosts` | Cibler une salle entière ou des hôtes précis |
| `name` | Nom de salle ou IDs séparés par virgules | Identifiant de la cible |
| `action` | `ping` / `awake` / `shutdown` | Action à effectuer |

**Exemple — Réveiller une salle :**
```bash
curl -X POST http://localhost:3000/api/action \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type": "Room", "name": "B101", "action": "awake"}'
```

**Réponse :**
```json
{
  "action": "awake",
  "count": 2,
  "results": [
    { "id": "pc-b101-01", "mac": "aa:bb:cc:dd:ee:ff", "ip": "172.18.55.10", "awake": true },
    { "id": "pc-b101-02", "mac": "aa:bb:cc:dd:ee:f0", "ip": "172.18.55.11", "awake": true }
  ]
}
```

---

## Logique de batching WoL

Pour éviter de saturer le réseau lors du réveil de grandes salles :

- **≤ 10 hôtes** → tous les paquets envoyés simultanément
- **> 10 hôtes** → envoyés par blocs de `wolBatchSize` (défaut : 5), avec `delayBetweenWakes` secondes entre chaque bloc

---

## Logs

Les logs sont écrits dans `logs/wakejs-api.log` avec le format :

```
[DD/MM/YYYY HH:MM:SS] | METHOD   [ STATUS       ] [ USER          ] [ IP               ] [ ACTION   ] Target: ... | message
```

Chaque appel AUTH et ACTION est tracé avec l'IP du client, le statut et le détail de l'opération.