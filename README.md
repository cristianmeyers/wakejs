# 🖥️ WakeJS — Full-Stack Wake-on-LAN Management

> Solution complète pour le réveil, la surveillance et l'administration à distance de parcs informatiques hétérogènes (Brest/Morlaix), utilisant une API Node.js et une interface web réactive.

## 📂 Structure du Projet

```text
.
├── backend/                # API REST Node.js
│   ├── src/                # Logique serveur (Express, WoL, SSH)
│   ├── config/             # Template DHCP (dhcpd.conf)
│   └── .env                # Variables d'environnement (Ports, Secrets)
├── frontend/               # Interface Web (SPA)
│   ├── index.html          # Point d'entrée unique
│   └── assets/
│       ├── config/         # Fichiers de configuration (JSON)
│       ├── js/             # Architecture modulaire ES6
│       └── style/          # Design Tailwind CSS & Mode sombre
└── scripts/                # Utilitaires de déploiement et diagnostic

```

---

## 🚀 Fonctionnalités Clés

### 🔒 Sécurité & Accès

- **Authentification JWT** : Protection des routes API et session persistante.
- **Smart SSH Modal** : Interface personnalisée pour l'extinction des machines (Windows/Linux) avec gestion des identifiants et injection de clés.

### 📡 Gestion Réseau

- **Wake-on-LAN Intelligent** : Résolution automatique des adresses broadcast selon les VLANs (Primaire/Secondaire).
- **Batching WoL** : Envoi par blocs pour éviter la saturation réseau sur les grandes salles (>10 hôtes).
- **Multi-site** : Support natif pour plusieurs sites géographiques (Brest, Morlaix).

### 🎨 Interface Utilisateur (UI)

- **États de Transition** : Visualisation "Naranja Pulse" (Orange) pendant le boot des machines.
- **Recherche Globale** : Moteur de recherche avec "téléportation" vers la salle correspondante.
- **Config-Driven UI** : Comportement piloté par JSON (délais, thèmes, sites activés).

---

## ⚙️ Configuration & Installation

### 1. Backend

Installer les dépendances et configurer le fichier DHCP :

```bash
cd backend
npm install

```

Le fichier `backend/config/dhcp-template.conf` doit suivre ce format :

```conf
host pc-b101-01 { hardware ethernet aa:bb:cc:dd:ee:ff; fixed-address 172.18.55.10; } # B101

```

### 2. Frontend

Le comportement de l'interface se règle dans `assets/config/config.json` :

```json
{
  "api": { "baseUrl": "http://localhost:3000", "timeout": 15000 },
  "ui": {
    "autoRefresh": true,
    "refreshInterval": 45000,
    "awakeRefreshDelay": 40000
  }
}
```

---

## 📡 Référence API

### `POST /api/action`

Exécute une commande sur une salle ou des hôtes précis.

```json
{
  "type": "Room",
  "name": "B319",
  "action": "awake"
}
```

| Action     | Description                                  |
| ---------- | -------------------------------------------- |
| `ping`     | Vérification ICMP de l'état en ligne.        |
| `awake`    | Envoi de paquets magiques (Port 9 UDP).      |
| `shutdown` | Extinction via SSH (`sudo shutdown -h now`). |

---

## 🧪 Architecture Réseau (VLANs)

L'application gère nativement le routage des paquets magiques vers les segments appropriés :

| Segment             | Plage IP          | Broadcast WoL    |
| ------------------- | ----------------- | ---------------- |
| **VLAN Principal**  | `172.18.53.0/24`  | `172.18.60.255`  |
| **VLAN Secondaire** | `172.18.240.0/24` | `172.18.240.255` |

---

## 🛠️ Incoming (Roadmap)

- **🎨 OS-Specific Icons** : Identification automatique et affichage des logos Windows/Linux sur les cartes.
- **📊 Global Dashboard Stats** : Graphiques de disponibilité globale par département sur la page d'accueil.
- **📜 Live Action Logs** : Console d'activité en temps réel affichant les succès/échecs des commandes.
- **⏳ Scheduled Wake** : Programmation horaire pour l'allumage automatique des salles de TP.
- **📱 Mobile PWA** : Optimisation pour une installation en tant qu'application mobile native.

---

## 📄 Licence

Distribué sous licence MIT.
