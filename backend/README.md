# 📡 WAKEJS | API Backend

Ce dossier contient l'API Node.js qui gère la logique de réveil (WoL), d'extinction (SSH) et l'analyse du parc informatique via le serveur DHCP.

## 🛠️ Pré-requis Système

Avant d'installer l'API, assurez-vous que le serveur dispose des outils suivants :

- **Node.js (v18+) & npm** : Environnement d'exécution et gestionnaire de paquets.
- **sshpass** : Indispensable pour permettre à l'API d'envoyer des commandes SSH avec mot de passe de manière non-interactive.
- _Installation sur Debian/Ubuntu_ : `sudo apt install sshpass`

- **Accès Lecture au DHCP** : L'utilisateur qui lance l'API doit avoir les droits de lecture sur le fichier de configuration du serveur DHCP (généralement `/etc/dhcp/dhcpd.conf`).

## 🚀 Installation & Lancement

1. **Installation des dépendances** :

```bash
npm install

```

2. **Configuration** :

- Créez un fichier `.env` à la racine (voir les détails dans `src/config/README.md`).
- Ajustez les paramètres techniques dans `src/config/config.json`.

3. **Lancement en production (avec PM2)** :

```bash
pm2 start src/index.js --name wakejs-api

```

> [!TIP]
> Pour plus de détails sur la personnalisation des ports, du LDAP ou du SSH, consultez **`src/config/README.md`**.

### 2. Backend Config : Fichier `backend/src/config/README.md`

# ⚙️ Configuration de l'API (Backend)

Ce répertoire contient la logique de configuration interne du serveur.

## 📄 Fichiers de Configuration

### 1. `config.json`

Gère le comportement logique de l'API :

- **`authEnabled`** : Active ou désactive la vérification LDAP/JWT.
- **`ldap`** : Paramètres de connexion à l'Active Directory ou l'annuaire LDAP pour l'authentification des administrateurs.
- **`ssh`** : Paramètres par défaut pour les commandes d'extinction (Port, Utilisateur).

### 2. `dhcpd.conf`

C'est la **source de vérité** de l'application. L'API analyse ce fichier en temps réel pour identifier les machines.

- **Format requis** : Chaque hôte doit comporter un commentaire à la fin de sa ligne avec le nom de la salle précédé d'un dièse (ex: `host pc01 { hardware ethernet ... } #B113`).

### 3. Variables d'environnement (`.env`)

Données sensibles à ne pas inclure dans les fichiers JSON :

- **`JWT_SECRET`** : Clé secrète pour la signature des jetons de session.
- **`SSH_PRIVATE_KEY_PATH`** : Chemin local vers la clé SSH privée du serveur pour automatiser l'extinction sans mot de passe.

### 3. Frontend Config : Fichier `frontend/assets/config/README.md`

# ⚙️ Configuration de l'Interface (Frontend)

Ce répertoire permet de personnaliser l'interface utilisateur et de définir la structure du parc informatique.

## 📄 Fichiers de Configuration

### 1. `config.json`

- **`api.baseUrl`** : Adresse IP ou nom de domaine du backend (ex: `http://localhost:3000`).
- **`ui.autoRefresh`** : Active la mise à jour automatique de l'état des machines.
- **`ui.refreshInterval`** : Temps d'attente (en ms) entre deux vérifications de statut (Ping).

### 2. `rooms.json`

Définit la **structure de navigation** affichée sur le site.

- **Hiérarchie** : `Site > Département > Liste de Salles`.
- **Cohérence** : Le nom des salles saisi ici (ex: `B113`) doit être identique au commentaire présent dans le fichier `dhcpd.conf` du backend pour que les actions (Wake/Off) fonctionnent.
