# Gestion Interactive des Machines

Gestion interactive des ordinateurs par **département** et **salle** avec ping, wake-on-LAN et affichage en temps réel.

---

## 📦 Structure du projet

```
project-root/
│
├─ assets/
│  ├─ js/
│  │  └─ script.js       # JS principal pour la page
│  └─ style/
│     └─ style.css       # Styles personnalisés
│
├─ dhcp-template.conf    # Fichier DHCP simulant la liste des hosts
├─ index.html            # Page principale
├─ server.js             # API Node.js (ping / wake / shutdown)
└─ README.md             # Ce fichier
```

---

## 🚀 Installation

1. Cloner le projet :

```bash
git clone <repo_url>
cd <project-folder>
```

2. Installer les dépendances pour le serveur :

```bash
npm install express ping wol cors
```

3. Lancer l’API Node.js :

```bash
node server.js
```

L’API écoute sur : `http://localhost:3000`.

---

## 💻 Utilisation

1. Ouvrir `index.html` dans un navigateur.

2. Sélectionner un **département**.

3. Cliquer sur une **salle** (ou taper son nom dans l’input).

4. Cliquer sur **lupa / recherche** pour charger les hosts.

5. Les hosts apparaissent sous forme de **cards** avec :
   - **Vert** = Online
   - **Rouge** = Offline
   - **Gris** = N/A

6. Sélectionner un ou plusieurs hosts (bordure bleue) et cliquer sur :
   - **Wake** → pour réveiller les machines via Wake-on-LAN.
   - **Ping** → pour vérifier leur statut en ligne.

> Après un `Wake`, l’état des hosts se met automatiquement à jour après 40 secondes.

---

## ⚙️ Configuration

- **dhcp-template.conf** : contient les hosts avec leur IP, MAC et salle.
  Le format attendu :

```
host <hostname> {
  hardware ethernet <mac>;
  fixed-address <ip>;
  # <room>
}
```

- Les salles et départements sont **préchargés côté frontend** dans `script.js`.

---

## 🖥️ Frontend

- Fichier principal : `index.html`.
- JS : `assets/js/script.js`
- CSS : `assets/style/style.css` (pour classes supplémentaires comme hover et icônes).

---

## 🔧 API

- Endpoint : `POST /api/action`
- Payload JSON :

```json
{
  "type": "Room" | "Hosts",
  "name": "nom_salle_ou_liste_hosts",
  "action": "ping" | "awake" | "shutdown"
}
```

- Réponse JSON exemple :

```json
{
  "action": "ping",
  "count": 3,
  "results": [
    {
      "id": "iutgestb20",
      "mac": "xx:xx:xx:xx:xx:xx",
      "ip": "172.18.61.20",
      "room": "A012",
      "found": true,
      "online": false
    },
    {
      "id": "iutgestb21",
      "mac": "xx:xx:xx:xx:xx:xx",
      "ip": "172.18.61.21",
      "room": "A012",
      "found": true,
      "online": true
    }
  ]
}
```

---

## 💡 Notes

- Le frontend **ne fait pas de GET pour récupérer les salles**.
  Toutes les salles sont **préchargées dans le JS**.
- Les actions Wake/Shutdown nécessitent que la machine cible soit accessible via le réseau.
- Assurez-vous que le CORS est activé côté serveur (`app.use(cors());`) pour permettre au frontend de communiquer avec l’API.

---

Si quieres, puedo añadir una sección **Screenshots y uso visual**, que explique con imágenes cómo se ve la UI y los estados de los hosts, para que el README sea más completo.

¿Quieres que haga eso también?
