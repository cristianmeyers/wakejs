# Configuration Backend — `config.json`

Fichier de configuration principal du serveur WakeJS, situé dans `backend/config/config.json`.

## Référence complète

```json
{
  "statusCheckInterval": 30,
  "delayBetweenWakes": 1,
  "wolPort": 9,
  "wolBatchSize": 5,
  "includeHashSpace": false,
  "sshTimeout": 5,
  "alwaysPassOnShutdown": false,
  "windowsDefaultUser": "administrateur",
  "linuxDefaultUser": "si",
  "jwtExpiration": "8h",
  "adConfig": { ... },
  "vlans": [ ... ]
}
```

## Options

### Général

| Clé                   | Type      | Défaut  | Description                                                                                                                                                     |
| --------------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statusCheckInterval` | `number`  | `30`    | Intervalle en secondes entre deux vérifications de statut des hôtes (ping automatique)                                                                          |
| `delayBetweenWakes`   | `number`  | `1`     | Délai en secondes entre chaque bloc de paquets WoL lors du batching                                                                                             |
| `wolPort`             | `number`  | `9`     | Port UDP utilisé pour l'envoi des paquets magiques Wake-on-LAN                                                                                                  |
| `wolBatchSize`        | `number`  | `5`     | Nombre de paquets WoL envoyés simultanément par bloc (au-delà de 10 hôtes)                                                                                      |
| `includeHashSpace`    | `boolean` | `false` | Si `true`, inclut un espace avant le `#` lors du parsing du fichier DHCP. À activer si ton fichier DHCP utilise le format ` # SALLE` avec espace avant le dièse |
| `jwtExpiration`       | `string`  | `"8h"`  | Durée de validité des tokens JWT (format `jsonwebtoken` : `"8h"`, `"1d"`, `"30m"`)                                                                              |

### SSH (arrêt distant)

| Clé                    | Type      | Défaut             | Description                                                                                                                      |
| ---------------------- | --------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `sshTimeout`           | `number`  | `5`                | Timeout en secondes pour les connexions SSH                                                                                      |
| `alwaysPassOnShutdown` | `boolean` | `false`            | Si `true`, le mot de passe SSH est toujours demandé à l'utilisateur avant d'envoyer un arrêt, même si une clé SSH est configurée |
| `windowsDefaultUser`   | `string`  | `"administrateur"` | Nom d'utilisateur SSH utilisé par défaut pour les machines Windows                                                               |
| `linuxDefaultUser`     | `string`  | `"si"`             | Nom d'utilisateur SSH utilisé par défaut pour les machines Linux                                                                 |

> **Note :** WakeJS utilise `sshpass` pour l'authentification SSH par mot de passe. Le mot de passe est saisi via le modal SSH dans le frontend et transmis au backend — il n'est jamais stocké.

### Active Directory (`adConfig`)

| Clé             | Type       | Description                                                                                       |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `url`           | `string`   | URL du contrôleur de domaine LDAP (ex: `"ldap://192.18.60.50"`)                                   |
| `searchBase`    | `string`   | Base DN pour la recherche LDAP (ex: `"dc=sioa,dc=univ-brest,dc=fr"`)                              |
| `authorizedOUs` | `string[]` | Liste des OUs autorisées à se connecter. Un utilisateur doit appartenir à au moins une de ces OUs |
| `bannedOUs`     | `string[]` | Liste des OUs explicitement interdites, même si elles correspondent à une OU autorisée            |
| `domainSuffix`  | `string`   | Suffixe ajouté au nom d'utilisateur pour former le UPN LDAP (ex: `"@sioa.univ-brest.fr"`)         |

```json
"adConfig": {
  "url": "ldap://192.168.160.57",
  "searchBase": "dc=sio,dc=lan",
  "authorizedOUs": ["ou=sio,ou=Utilisateurs"],
  "bannedOUs": [],
  "domainSuffix": "@sio.lan"
}
```

### VLANs (`vlans`)

Tableau de définitions VLAN. Pour chaque hôte, le backend détermine l'adresse broadcast correcte en comparant le 3ème octet de son IP aux plages définies ici.

| Clé                | Type     | Description                                              |
| ------------------ | -------- | -------------------------------------------------------- |
| `subnetStart`      | `number` | Valeur minimale du 3ème octet de la plage de sous-réseau |
| `subnetEnd`        | `number` | Valeur maximale du 3ème octet                            |
| `broadcastAddress` | `string` | Adresse broadcast à utiliser pour ce VLAN                |
| `description`      | `string` | Libellé informatif (non utilisé en logique)              |

```json
"vlans": [
  {
    "subnetStart": 53,
    "subnetEnd": 59,
    "broadcastAddress": "172.18.60.255",
    "description": "Vlan Gestion"
  },
  {
    "subnetStart": 240,
    "subnetEnd": 247,
    "broadcastAddress": "172.18.240.255",
    "description": "Vlan Enseignement"
  }
]
```

## Format `dhcp-template.conf`

Chaque hôte doit être déclaré sur **une seule ligne** au format ISC DHCP :

```
host <hostname> { hardware ethernet <mac>; fixed-address <ip>; } # <salle>
```

| Champ        | Description                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `<hostname>` | Identifiant unique de l'hôte (utilisé comme ID dans l'API)                                      |
| `<mac>`      | Adresse MAC au format `aa:bb:cc:dd:ee:ff`                                                       |
| `<ip>`       | Adresse IP fixe de la machine                                                                   |
| `# <salle>`  | Tag de salle — doit correspondre exactement aux salles définies dans `rooms.json` côté frontend |

```
host pc-b101-01 { hardware ethernet aa:bb:cc:dd:ee:ff; fixed-address 172.18.55.10; } # B101
host pc-b101-02 { hardware ethernet aa:bb:cc:dd:ee:f0; fixed-address 172.18.55.11; } # B101
```

> Les lignes commençant par `#` seul (commentaires) sont ignorées lors du parsing.
