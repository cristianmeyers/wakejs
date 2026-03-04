# ⚙️ Guide de Configuration : `config.json`

Ce fichier centralise les paramètres de fonctionnement de l'API.

### 🚀 Performances et Réseau

| Option                    | Fonction                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| **`statusCheckInterval`** | Délai (secondes) avant vérification de l'état d'un hôte après action.  |
| **`delayBetweenWakes`**   | Temps d'attente (secondes) entre l'envoi de chaque paquet Wake-on-LAN. |
| **`wolPort`**             | Port UDP cible pour l'envoi du "Magic Packet" (standard : 9).          |
| **`wolBatchSize`**        | Nombre de machines réveillées en rafale avant une pause.               |
| **`includeHashSpace`**    | Gestion des espaces après le caractère `#` dans le fichier DHCP.       |

### 🛡️ Sécurité et Accès SSH

| Option                   | Fonction                                                        |
| ------------------------ | --------------------------------------------------------------- |
| **`sshTimeout`**         | Délai d'expiration (secondes) d'une tentative de connexion SSH. |
| **`windowsDefaultUser`** | Identifiant administrateur par défaut pour les hôtes Windows.   |
| **`linuxDefaultUser`**   | Identifiant utilisateur avec droits sudo pour les hôtes Linux.  |
| **`jwtExpiration`**      | Durée de validité d'une session utilisateur (ex: 8h).           |

### 🔐 Authentification Active Directory (LDAP)

| Option             | Fonction                                                          |
| ------------------ | ----------------------------------------------------------------- |
| **`url`**          | Adresse réseau du serveur LDAP de l'université.                   |
| **`baseDN`**       | Chemin racine pour la recherche des utilisateurs dans l'annuaire. |
| **`domainSuffix`** | Suffixe DNS ajouté au nom d'utilisateur pour la liaison (bind).   |

### 🌐 Segmentation des VLANs

| Plage (3ème octet) | Broadcast        | Usage                            |
| ------------------ | ---------------- | -------------------------------- |
| **53 à 59**        | `172.18.60.255`  | Zone administrative (Gestion).   |
| **240 à 247**      | `172.18.240.255` | Zone pédagogique (Enseignement). |

> **IMPORTANT**
> Les données sensibles (clés privées, secrets JWT) ne doivent pas figurer ici. Utilisez exclusivement le fichier **`.env`**.
