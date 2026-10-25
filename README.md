# Commission Exposé — Académie Vases d'Honneur
## Guide d'installation et d'utilisation (tablette + PC + téléphones étudiants)

## Contenu du dossier — 3 interfaces
- `index.html` — page d'accueil (choix entre les 3 interfaces)
- `etudiant.html` + `etudiant.js` — **"Bienvenue à l'Académie"** : pointer son arrivée, dépôt/retrait d'exposés et de rapports de stage, espace correcteur (tablette de la commission)
- `admin.html` + `admin.js` — **Administration** (protégée par code) : statistiques, configuration, séances, sorties, exports (PC)
- `suivi.html` + `suivi.js` + `manifest.json` — **Suivi** : à installer sur le téléphone de chaque étudiant qui dépose un exposé ou un rapport — statuts en temps réel, notifications, remarques du correcteur, bibliothèque "Source Vases d'Honneur"
- `core.css` + `core.js` — fichiers partagés par les 3 interfaces (NE PAS RENOMMER NI DÉPLACER)
- `export.js` — génération des fichiers Word (.docx) et Excel (.xlsx), sans Internet
- `banniere.jpg` — bannière de l'Académie affichée en haut des écrans
- `server.js` — petit serveur local qui permet à tous les appareils de partager les mêmes données
- `Demarrer-Windows.bat` — double-clic pour lancer le serveur sous Windows
- Créés automatiquement à la première utilisation : `data.json` (la base de données), `photos/`, `sauvegardes/`

**Gardez tous ces fichiers ensemble, dans le même dossier.**

---

## Pourquoi un serveur ?
Sans serveur, chaque appareil (tablette, PC, téléphone étudiant) garde ses données pour lui tout seul.
Avec `server.js` lancé sur le PC, tous les appareils se connectent au même endroit
et voient donc les mêmes informations (présences, dépôts, corrections, notifications...).

Le serveur **fusionne** les enregistrements fiche par fiche : la tablette, le PC et les téléphones peuvent
enregistrer en même temps sans s'écraser. Les photos sont rangées dans le dossier `photos/` et une copie
datée de la base est faite chaque jour dans `sauvegardes/`.

Le voyant en haut de chaque écran indique l'état : **● Connecté au serveur** (vert),
**● Synchronisation…** (jaune), **● Hors-ligne** (rouge).

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
   **Plus simple sous Windows** : double-cliquez sur `Demarrer-Windows.bat` (étapes 3 et 4 faites automatiquement).
4. Taper la commande :
   ```
   node server.js
   ```
5. Un message doit apparaître :
   ```
   Commission Exposé — serveur local démarré
   Sur cet ordinateur : http://localhost:8000
   Sur la tablette (même Wi-Fi) : http://192.168.1.24:8000   ← l'adresse réelle s'affiche
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
- Sur l'accueil de l'interface étudiant, un bouton **"Actualiser"** permet de forcer la mise à jour.
- Si tout fonctionne : un pointage fait sur la tablette doit apparaître dans l'onglet "Membres" de l'administration après actualisation (ou automatiquement, sous 6 secondes).
- Si le bouton "Actualiser" indique "Aucun serveur local détecté" : vérifiez que `node server.js` tourne toujours sur le PC, et que l'adresse tapée sur la tablette est correcte.

---

## Sauvegarde des données
Toutes les données sont dans `data.json` et le dossier `photos/` (même dossier que `server.js`).
Une copie datée de la base est faite automatiquement chaque jour dans `sauvegardes/`.
**Pensez à copier régulièrement le dossier complet** (clé USB, cloud...) pour ne rien perdre en cas de problème sur le PC.

## Ce que ce serveur n'est PAS
C'est une solution simple pour un usage **local, sur un même réseau Wi-Fi** (ex: salle de la commission).
Ce n'est pas un hébergement accessible depuis Internet. Si vous souhaitez un jour un accès à distance
(depuis plusieurs lieux différents, plusieurs églises filles en simultané avec des connexions différentes),
il faudra héberger `server.js` sur un vrai serveur en ligne — une étape différente, à voir si le besoin se présente.

---

## Nouveautés — notifications automatiques
Le logiciel envoie maintenant des messages automatiques (dépôt reçu, en cours de correction,
correction terminée, retrait confirmé, programmation de séances/sorties...). Ces messages
sont consultables depuis l'accueil étudiant, écran **"Mon suivi"** de l'appli Suivi, en tapant le nom
du destinataire (étudiant, responsable de commission, modérateur, membre du jury...).
Il n'y a pas d'envoi SMS ou email réel : c'est une messagerie interne à l'application, à consulter
sur place ou en donnant le nom à la personne concernée.

---

## Liste officielle des étudiants (déjà dans la base)
- **115 étudiants**, **16 commissions** et le **responsable de chaque commission**
  (pour la commission rattachée à une église fille, le responsable est simplement « Église fille »).
- Chaque étudiant de la liste a un **rapport de stage définitif** déjà enregistré (numéros `STG-DEF-…`).
- Si vous aviez déjà des données (`data.json`, de l'une ou l'autre version précédente), elles sont **conservées** :
  la liste officielle est ajoutée automatiquement à la première ouverture.

## Règles de fonctionnement
- **Dépôt** (exposé ou rapport) : tapez quelques lettres du nom (sans se soucier des accents) puis touchez-le dans la liste.
  Pour un rapport, la commission et le responsable se remplissent tout seuls (le numéro du responsable n'est alors pas obligatoire).
- Au moins une **photo de couverture** est obligatoire ; elle est réduite automatiquement avant l'envoi.
- **Rapport définitif** : il est enregistré comme définitif et **n'apparaît jamais dans l'Espace Correcteur**,
  ni les anciens dépôts « à corriger » d'un étudiant qui a déjà son définitif. Pas de doublon si l'étudiant redépose son définitif.
- Deux correcteurs ne peuvent pas prendre le même document.

## Membres de la commission (déjà dans la base)
- 34 membres : le responsable **Dr Éric ZAGBEU** et les 33 « Stagiaires - Promo 10 » (avec téléphone, église et situation). État spirituel : Moyen pour tous.
- Chacun a un **code personnel** (4 chiffres) pour l'Espace Correcteur.
- Administration → **Exports** → « Membres de la commission et codes personnels » : liste à imprimer (Word / Excel) pour remettre son code à chacun.
- Noms, codes, téléphones et rôles sont modifiables dans Administration → Configuration.

## Tableau de bord
L'administration s'ouvre sur un **tableau de bord** qui regroupe toutes les statistiques du logiciel :
chiffres clés (étudiants, membres, présents, rapports définitifs, documents à corriger / en retard, délai moyen de correction,
messages, sorties…), alertes, rapports et exposés par statut, taux de rapports définitifs par commission,
exposés par classe et par phase, activité mois par mois, pointages et motifs de présence, corrections par correcteur,
lieux de dépôt, séances, sorties, bibliothèque, méditations, quiz et notifications. Exportable en Word et en Excel.

## Présentation
Plus aucune icône : chaque page s'ouvre par une **pilule pleine largeur**, et tous les boutons, onglets et champs
sont arrondis en forme de pilule.

## Administration (code par défaut : 2026)
- **Rapports** : compteurs (dont rapports définitifs et étudiants sans définitif), répartition par commission,
  recherche et filtres, actions « Marquer définitif », « Annuler définitif », « Libérer » un document bloqué, « Supprimer ».
- **Exposés** : mêmes outils, filtre par lieu de dépôt.
- **Étudiants** : ajouter un étudiant, changer sa commission, le retirer.
- **Configuration** : membres (nom, code, téléphone, situation…), responsables de commission, créneaux, motifs, lieux,
  bibliothèque, méditations, quiz, et **code administrateur**. 
- **Tableau de bord** : toutes les statistiques (voir plus haut).
- **Exports Word / Excel** : 8 rapports prêts à imprimer (dont la liste des membres et leurs codes), chacun en Word (.docx), Excel (.xlsx), aperçu et PDF :
  rapports définitifs par commission, suivi des rapports, suivi des exposés, liste des étudiants,
  journal de présence (année ou mois), sorties dans les églises filles, rapport d'évolution annuel.

---

## Notifications (version mixte avec le modèle « resto »)
Ce qui existait est conservé (messagerie interne, bouton WhatsApp) et complété par :
- **Temps réel** : le serveur garde une connexion ouverte avec chaque écran. Un dépôt, une correction, un message
  apparaissent **immédiatement** partout (plus besoin d'attendre ni d'actualiser).
- **Bandeau + son + vibration** : sur le téléphone de l'étudiant (appli Suivi), sur la tablette (Espace Correcteur :
  « Nouvel exposé à corriger ») et sur le PC de l'administration (« Nouvel exposé déposé », « Arrivée pointée »).
  Bouton « Activer les alertes du bureau » pour être prévenu même si l'onglet est en arrière-plan.
- **Notifications push** (téléphone verrouillé, application fermée) : dans Suivi → « Activer les notifications ».
  Comme pour le modèle, les navigateurs l'exigent en **HTTPS** : il faut publier le serveur en ligne
  (Render, Railway, VPS…). Sur le Wi-Fi local, le bandeau + son fonctionnent tant que l'application est ouverte.
  Sur iPhone : « Ajouter à l'écran d'accueil » d'abord (iOS 16.4 ou plus).
- **Appli Suivi** : chacun choisit son nom une seule fois ; compteur de messages non lus, « Tout marquer comme lu ».
- **Administration → Notifications** : envoyer un message à une personne, à tout le monde, à tous les étudiants,
  à tous les membres ou à une commission ; **messages programmés** (jours + heure, ex. rappel chaque samedi à 8 h,
  envoyés automatiquement par le serveur) ; historique avec lu / non lu ; **modèles des messages automatiques modifiables**.
- Les clés et abonnements push sont dans `push.json` (jamais envoyé aux appareils). Gardez-le avec `data.json`.

## Aucun doublon
- Les doublons exacts déjà présents ont été retirés automatiquement (ex. « KOUAKOU AYA », « GNOLOU VIRGINIE »),
  leurs dépôts rattachés à la fiche conservée ; un seul rapport définitif par étudiant.
- Tout ajout en double est refusé (majuscules, accents et titres « Mme », « Dr »… ignorés) : étudiants, membres,
  codes personnels, commissions, lieux, motifs, sources, classes, phases, messages, abonnements.
- Administration → Étudiants (et Configuration → Membres) : panneau **« Doublons possibles »** (ex. « Mme ABI née Mudulo… »
  et « ABI NEE MUDULO MIANDABU ») avec « Garder celui-ci » ou « Ce ne sont pas des doublons ».

## Tout est personnalisable (Administration → Configuration → Personnalisation)
- Textes d'accueil de la tablette et de l'appli Suivi.
- Listes : classes, phases des exposés, phases des rapports (« Dépôt définitif » est obligatoire),
  niveaux de situation des membres, types de sources. Renommer met à jour toutes les fiches concernées.
- Seuils d'alerte : jours de retard, taux faible d'une commission, dimanches d'absence, délai de méthodologie.
- Déjà modifiables : membres et codes, commissions et responsables, étudiants, créneaux, motifs, lieux,
  bibliothèque, méditations, quiz, code administrateur, modèles de messages.
