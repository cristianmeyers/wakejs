# 🖥️ WakeJS — Gestion centralisée du Wake-on-LAN

> Application web pour le démarrage à distance centralisé d’un parc informatique, organisé par département et salle, via une API REST et une interface frontend dynamique.

---

## 📋 Aperçu

**WakeJS** est un outil full-stack conçu pour gérer l’allumage à distance des postes de travail sur un campus multi-bâtiments. Il combine une **API REST Node.js** avec un **frontend web dynamique**, permettant aux administrateurs de réveiller, pinguer ou éteindre des machines organisées par département et salle — sans aucun accès physique.

Le système lit la configuration des hôtes depuis un fichier modèle DHCP et envoie des **paquets magiques Wake-on-LAN** sur le réseau, avec une résolution intelligente des adresses broadcast adaptée aux VLAN.

---

## 🏗️ Architecture

```
wakejs/
├── backend/
│   ├── config/
│   │   └── dhcp-template.conf     # Définitions des hôtes (MAC, IP, salle)
│   └── src/
│       └── index.js               # API REST Express
├── frontend/
│   ├── index.html                 # Interface principale
│   └── assets/
│       ├── js/script.js           # Logique frontend dynamique
│       └── style/style.css        # Styles personnalisés
└── scripts/
    ├── wakejs.sh                  # Script de démarrage
    └── diagnostic.sh             # Utilitaire de diagnostic
```

---

## ⚙️ Stack technique

| Couche              | Technologie                       |
| ------------------- | --------------------------------- |
| Backend             | Node.js, Express                  |
| Frontend            | HTML, Tailwind CSS, Vanilla JS    |
| Réseau              | Wake-on-LAN (UDP), ICMP Ping, SSH |
| Gestion des hôtes   | Analyse de config DHCP            |
| Contrôle à distance | SSH (`sudo shutdown`)             |

**Packages npm clés :**

- `wol` — Génération de paquets magiques
- `ping` — Vérification de disponibilité des hôtes
- `express` — Serveur API REST
- `cors` — Support cross-origin

---

## 🌐 Architecture réseau

L’application gère deux VLAN avec leurs adresses broadcast respectives :

| VLAN       | Plage de sous-réseau            | Adresse broadcast |
| ---------- | ------------------------------- | ----------------- |
| Primaire   | `172.18.53.0` → `172.18.59.0`   | `172.18.60.255`   |
| Secondaire | `172.18.240.0` → `172.18.247.0` | `172.18.240.255`  |

L’API résout automatiquement l’adresse broadcast correcte en fonction de l’IP de chaque hôte, garantissant que les paquets magiques atteignent le bon segment VLAN.

---

## 🚀 Démarrage

### Prérequis

- Node.js ≥ 18
- Accès SSH aux machines gérées (pour l’arrêt)
- Le serveur doit être sur le même réseau que les machines cibles
- Wake-on-LAN activé dans le BIOS des machines cibles

### Installation

```bash
git clone https://github.com/your-username/wakejs.git
cd wakejs/backend
npm install
```

### Configuration

Créer le fichier DHCP des hôtes dans `backend/config/dhcp-template.conf` :

```conf
# Format : host <name> { hardware ethernet <mac>; fixed-address <ip>; } # <room>
host pc-b101-01 { hardware ethernet aa:bb:cc:dd:ee:ff; fixed-address 172.18.55.10; } # B101
host pc-b101-02 { hardware ethernet aa:bb:cc:dd:ee:f0; fixed-address 172.18.55.11; } # B101
```

### Lancer le serveur

```bash
# Avec le script de démarrage
bash scripts/wakejs.sh

# Ou directement
node backend/src/index.js
```

L’API écoute par défaut sur `http://0.0.0.0:3000`.

---

## 📡 Référence API

### `POST /api/action`

Déclenche une action sur un ou plusieurs hôtes.

**Corps de la requête :**

```json
{
  "type": "Room",
  "name": "B101",
  "action": "awake"
}
```

| Champ    | Valeurs                                             | Description                  |
| -------- | --------------------------------------------------- | ---------------------------- |
| `type`   | `Room` / `Hosts`                                    | Mode de sélection des cibles |
| `name`   | ID de salle ou IDs d’hôtes séparés par des virgules | Identifiant cible            |
| `action` | `ping` / `awake` / `shutdown`                       | Action à effectuer           |

**Exemple — Réveiller toutes les machines de la salle B101 :**

```bash
curl -X POST http://localhost:3000/api/action \
  -H "Content-Type: application/json" \
  -d '{"type": "Room", "name": "B101", "action": "awake"}'
```

**Exemple — Pinguer des hôtes spécifiques :**

```bash
curl -X POST http://localhost:3000/api/action \
  -H "Content-Type: application/json" \
  -d '{"type": "Hosts", "name": "pc-b101-01,pc-b101-02", "action": "ping"}'
```

**Réponse :**

```json
{
  "action": "awake",
  "count": 2,
  "results": [
    {
      "id": "pc-b101-01",
      "mac": "aa:bb:cc:dd:ee:ff",
      "ip": "172.18.55.10",
      "awake": true
    },
    {
      "id": "pc-b101-02",
      "mac": "aa:bb:cc:dd:ee:f0",
      "ip": "172.18.55.11",
      "awake": true
    }
  ]
}
```

---

## 🖱️ Utilisation du frontend

L’interface web guide l’utilisateur en 3 étapes :

1. **Sélectionner un département** (SG, GB, GEA, GMP, GEII, GACOD, GC, FC, LBMS…)
2. **Sélectionner une salle** dans la liste du département
3. **Effectuer une action** sur les machines de cette salle :
   - 🔵 **Ping** — Vérifier quelles machines sont en ligne
   - 🟢 **Wake-on-LAN** — Envoyer des paquets magiques à toutes les machines
   - 🔴 **Shutdown** — Éteindre les machines à distance via SSH

Chaque machine est affichée sous forme de carte avec son état en ligne/hors ligne.

---

## 🔧 Logique de batching WoL

Pour éviter de saturer le réseau lors du réveil de grandes salles, l’API utilise une stratégie de traitement par blocs :

- **≤ 10 hôtes** → Tous les paquets envoyés simultanément
- **> 10 hôtes** → Envoyés par blocs de 5, avec une pause d’une minute entre chaque bloc

---

## 📁 Format de configuration DHCP

Le fichier `dhcp-template.conf` suit la syntaxe ISC DHCP. Chaque hôte doit être sur **une seule ligne** :

```conf
# Les lignes commençant par # sont ignorées
host <hostname> { hardware ethernet <mac>; fixed-address <ip>; } # <room>
```

- `<hostname>` — Identifiant unique de l’hôte
- `<mac>` — Adresse MAC au format `aa:bb:cc:dd:ee:ff`
- `<ip>` — Adresse IP statique
- `# <room>` — Tag de salle (utilisé pour filtrer par salle)

---

## 🔒 Exigences & contraintes

- Le serveur doit avoir le **port UDP 9** ouvert en sortie pour les paquets WoL
- L’authentification SSH sans mot de passe doit être configurée pour l’utilisateur `user` sur les machines gérées pour que l’arrêt fonctionne
- Les paquets broadcast doivent être autorisés par les switches/routeurs entre VLANs

---

## 📄 Licence

MIT
