# Commission Exposé — Académie Vases d'Honneur
## Guide d'installation et d'utilisation (tablette + PC + téléphones étudiants)

## Contenu du dossier — 3 interfaces
- `index.html` — page d'accueil (choix entre les 3 interfaces)
- `etudiant.html` + `etudiant.js` — **"Bienvenue à l'Académie"** : pointer son arrivée, dépôt/retrait d'exposés et de rapports de stage, espace correcteur (tablette de la commission)
- `admin.html` + `admin.js` — **Administration** (protégée par code) : statistiques, configuration, séances, sorties, exports (PC)
- `suivi.html` + `suivi.js` + `manifest.json` — **Suivi** : à installer sur le téléphone de chaque étudiant qui dépose un exposé ou un rapport — statuts en temps réel, notifications, remarques du correcteur, bibliothèque "Source Vases d'Honneur"
- `core.css` + `core.js` — fichiers partagés par les 3 interfaces (NE PAS RENOMMER NI DÉPLACER)
- `server.js` — petit serveur local qui permet à tous les appareils de partager les mêmes données
- `data.json` — apparaîtra automatiquement ici après la première utilisation (c'est votre base de données)

**Gardez tous ces fichiers ensemble, dans le même dossier.**

---

## Pourquoi un serveur ?
Sans serveur, chaque appareil (tablette, PC, téléphone étudiant) garde ses données pour lui tout seul.
Avec `server.js` lancé sur le PC, tous les appareils se connectent au même endroit
et voient donc les mêmes informations (présences, dépôts, corrections, notifications...).

Le PC joue le rôle de "serveur" : il doit rester allumé, avec `server.js` lancé,
pendant que la tablette et les téléphones sont utilisés.


---

## Étape 1 — Installer Node.js sur le PC (une seule fois)
1. Aller sur https://nodejs.org
2. Télécharger et installer la version "LTS" (recommandée)
3. Redémarrer le PC si demandé

## Étape 2 — Démarrer le serveur sur le PC
1. Copier tout le dossier (tous les fichiers ci-dessus) sur le PC, par exemple sur le Bureau, dans un dossier nommé `CommissionExpose`
2. Ouvrir ce dossier
3. **Windows** : Maj + clic droit dans le dossier → "Ouvrir la fenêtre PowerShell ici" (ou "Ouvrir dans le terminal")
   **Mac** : ouvrir Terminal, taper `cd ` puis glisser le dossier dans la fenêtre, appuyer sur Entrée
4. Taper la commande :
   ```
   node server.js
   ```
5. Un message doit apparaître :
   ```
   Commission Exposé — serveur local démarré
   Sur cet ordinateur : http://localhost:8000
   Sur la tablette (même Wi-Fi) : http://<IP-DE-CE-PC>:8000
   ```
6. **Laisser cette fenêtre ouverte** tant que vous utilisez l'application (ne pas la fermer).

## Étape 3 — Trouver l'adresse IP du PC
- **Windows** : dans une autre fenêtre PowerShell/CMD, taper `ipconfig`, chercher la ligne "Adresse IPv4" (ex: 192.168.1.24)
- **Mac** : Préférences Système → Réseau → l'adresse IP est affichée (ex: 192.168.1.24)

## Étape 4 — Connecter le PC et la tablette
Les deux appareils doivent être connectés **au même réseau Wi-Fi**.

- **Sur le PC** : ouvrir un navigateur → `http://localhost:8000`
- **Sur la tablette** : ouvrir un navigateur → `http://192.168.1.24:8000` (remplacer par l'IP réelle du PC trouvée à l'étape 3)

La page d'accueil propose de choisir "Interface Étudiants / Membres" ou "Interface Administration".
- Mettez la tablette en général sur `etudiant.html` (pointage, dépôts...)
- Gardez `admin.html` sur le PC (statistiques, configuration)

## Astuce — Raccourci direct
Vous pouvez directement mettre en favori / écran d'accueil sur la tablette :
`http://192.168.1.24:8000/etudiant.html`

Et sur le PC : `http://localhost:8000/admin.html`

## Installer "Suivi" sur le téléphone d'un étudiant
Quand un étudiant vient déposer un exposé ou un rapport de stage, donnez-lui l'adresse :
`http://192.168.1.24:8000/suivi.html` (remplacez par l'IP réelle du PC).

Sur son téléphone :
- **Android (Chrome)** : ouvrir le lien → menu ⋮ → "Ajouter à l'écran d'accueil"
- **iPhone (Safari)** : ouvrir le lien → bouton Partager → "Sur l'écran d'accueil"

Une icône "Suivi VH" apparaît alors sur son téléphone comme une vraie application.
En l'ouvrant et en tapant son nom, il retrouve le statut de ses documents (déposé /
en correction / corrigé) et les notifications avec les remarques du correcteur.

**Important** : le téléphone de l'étudiant doit être connecté au même Wi-Fi que le PC
qui fait tourner `server.js` pour voir les données à jour. En dehors de ce réseau
(à la maison par exemple), la page ne pourra pas se mettre à jour tant que le PC-serveur
n'est pas accessible sur ce réseau.

---

## Vérifier que ça fonctionne
- Sur l'accueil de l'interface étudiant, un bouton **"🔄 Actualiser"** permet de forcer la mise à jour.
- Si tout fonctionne : un pointage fait sur la tablette doit apparaître dans l'onglet "Membres" de l'administration après actualisation (ou automatiquement, sous 6 secondes).
- Si le bouton "Actualiser" indique "Aucun serveur local détecté" : vérifiez que `node server.js` tourne toujours sur le PC, et que l'adresse tapée sur la tablette est correcte.

---

## Sauvegarde des données
Toutes les données sont stockées dans le fichier `data.json`, créé automatiquement dans le même dossier que `server.js`.
**Pensez à faire une copie régulière de ce fichier** (clé USB, cloud...) pour ne rien perdre en cas de problème sur le PC.

## Ce que ce serveur n'est PAS
C'est une solution simple pour un usage **local, sur un même réseau Wi-Fi** (ex: salle de la commission).
Ce n'est pas un hébergement accessible depuis Internet. Si vous souhaitez un jour un accès à distance
(depuis plusieurs lieux différents, plusieurs églises filles en simultané avec des connexions différentes),
il faudra héberger `server.js` sur un vrai serveur en ligne — une étape différente, à voir si le besoin se présente.

---

## Nouveautés — notifications automatiques
Le logiciel envoie maintenant des messages automatiques (dépôt reçu, en cours de correction,
correction terminée, retrait confirmé, programmation de séances/sorties...). Ces messages
sont consultables depuis l'accueil étudiant, bouton **"🔔 Mes messages"**, en tapant le nom
du destinataire (étudiant, responsable de commission, modérateur, membre du jury...).
Il n'y a pas d'envoi SMS ou email réel : c'est une messagerie interne à l'application, à consulter
sur place ou en donnant le nom à la personne concernée.
