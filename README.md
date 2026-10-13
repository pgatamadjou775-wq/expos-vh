# Commission Exposé — Académie Vases d'Honneur
## Guide d'installation et d'utilisation (tablette + PC)

## Contenu du dossier
- `index.html` — page d'accueil (choix Étudiant / Admin)
- `etudiant.html` + `etudiant.js` — interface Étudiants / Membres (pointage, dépôts, retraits, correcteur)
- `admin.html` + `admin.js` — interface Administration (protégée par code)
- `core.css` + `core.js` — fichiers partagés (styles, données, synchronisation)
- `data-etudiants.js` — liste officielle : 111 étudiants, 16 commissions et leurs responsables
- `export.js` — génération des fichiers Word (.docx) et Excel (.xlsx), sans Internet
- `server.js` — serveur local qui permet à la tablette ET au PC de partager les mêmes données
- `Demarrer-Windows.bat` — double-cliquez pour lancer le serveur sous Windows
- Créés automatiquement à la première utilisation :
  - `data.json` — la base de données
  - `photos/` — les photos des pages de couverture
  - `sauvegardes/` — une copie de la base par jour

**Gardez tous ces fichiers ensemble, dans le même dossier. Ne renommez rien.**

---

## Démarrage rapide
1. Installer Node.js (version « LTS ») depuis https://nodejs.org — une seule fois.
2. **Windows** : double-cliquer sur `Demarrer-Windows.bat`.
   **Mac** : ouvrir Terminal, taper `cd ` puis glisser le dossier, Entrée, puis `node server.js`.
3. La fenêtre affiche les adresses à utiliser, par exemple :
   ```
   Sur cet ordinateur : http://localhost:8000
   Sur la tablette (même Wi-Fi) : http://192.168.1.24:8000
   ```
4. **Laisser cette fenêtre ouverte** pendant toute l'utilisation.
5. Sur le PC : `http://localhost:8000/admin.html` — Sur la tablette : `http://<adresse affichée>:8000/etudiant.html`
   (les deux appareils doivent être sur le même Wi-Fi).

Le voyant en haut de l'écran indique l'état : **● Connecté au serveur** (vert), **● Synchronisation…** (jaune), **● Hors-ligne** (rouge).

---

## Ce qui est déjà chargé
- Les **111 étudiants** répartis dans les **16 commissions**, avec le **responsable de chaque commission**.
  Pour les commissions rattachées à une église fille (Évangélisation), le responsable est indiqué « Église fille ».
- Un **rapport de stage DÉFINITIF** pour chacun des 111 étudiants (numéros `STG-DEF-001` à `STG-DEF-111`).

Si vous utilisiez déjà l'ancienne version, vos données (présences, dépôts…) sont conservées : la liste officielle est ajoutée automatiquement à la première ouverture.

## Règles de fonctionnement
- **Rapport de stage définitif** : il est enregistré directement comme définitif et **n'apparaît jamais dans l'Espace Correcteur**.
  Dès qu'un étudiant a un rapport définitif, ses anciens dépôts « 1ère correction » disparaissent aussi de la correction.
- Si un étudiant déjà dans la liste dépose à nouveau son définitif, la fiche existante est complétée (pas de doublon).
- Au dépôt, tapez quelques lettres du nom (sans se soucier des accents) puis touchez le nom : la commission et
  le responsable se remplissent tout seuls.
- Les photos sont réduites automatiquement avant l'envoi (dépôt rapide, base légère).
- Un membre ne peut pas pointer deux arrivées sans avoir pointé son départ.
- Deux correcteurs ne peuvent pas prendre le même document.

## Administration (code par défaut : 2026)
- **Rapports de stage** : compteurs, répartition par commission, recherche/filtres, « Marquer définitif »,
  « Annuler définitif », « Libérer » un document bloqué en correction, suppression.
- **Étudiants** : ajouter, changer de commission, retirer un étudiant.
- **Configuration** : responsables de commission, **membres et codes personnels** (à remplacer par les vrais membres —
  les 4 membres fournis sont des exemples), créneaux, églises filles, **code administrateur**.
- **Exports Word / Excel** : 6 rapports prêts à imprimer, chacun en Word (.docx), Excel (.xlsx), aperçu et PDF :
  1. Rapports de stage définitifs — par commission (avec responsables, synthèse et étudiants manquants)
  2. Suivi complet des rapports de stage
  3. Suivi complet des exposés
  4. Liste des étudiants par commission
  5. Journal de présence des membres (par année ou par mois)
  6. Rapport d'évolution annuel

Les fichiers ont des en-têtes de tableau répétés sur chaque page et la numérotation des pages.

---

## Sauvegarde
Toutes les données sont dans `data.json` et le dossier `photos/`. Une copie datée de la base est faite chaque jour
dans `sauvegardes/`. **Copiez régulièrement le dossier complet** (clé USB, cloud) pour ne rien perdre.

## En cas de problème
- « Hors-ligne » sur la tablette : vérifiez que la fenêtre du serveur est toujours ouverte sur le PC et que l'adresse
  tapée est la bonne (même Wi-Fi).
- « Le port 8000 est déjà utilisé » : le serveur tourne déjà dans une autre fenêtre — utilisez celle-ci.
- Le pare-feu Windows peut demander l'autorisation la première fois : cliquez sur « Autoriser » (réseau privé).

Ce serveur est prévu pour un usage **local, sur un même réseau Wi-Fi**. Un accès depuis Internet (plusieurs sites
à distance) demanderait d'héberger `server.js` sur un serveur en ligne.
