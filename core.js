/* ============================================================
   COMMISSION EXPOSÉ — Académie Vases d'Honneur
   core.js — Modèle de données partagé (Étudiant + Administration)
   Partagé par les 3 interfaces : Bienvenue (etudiant.html),
   Suivi (suivi.html) et Administration (admin.html).
   Toutes doivent être ouvertes depuis le serveur local (server.js)
   pour partager les mêmes données.
   ============================================================ */

const ADMIN_CODE = '2026';   // code administrateur par défaut (modifiable dans Administration → Configuration)
// Seuils d'alerte : valeurs par défaut, remplacées par Administration → Configuration → Personnalisation
let RETARD_JOURS = 7;             // "en retard" si non corrigé après ce délai
let SEUIL_COMMISSION_FAIBLE = 50; // % en dessous duquel on alerte sur le taux d'une commission
let SEUIL_ABSENCES_DIMANCHE = 3;  // nombre de dimanches sans pointage avant alerte
let SEUIL_REPRISE_JOURS = 14;     // délai avant d'alerter qu'une classe n'a pas eu son 1er passage

const LS_KEY = 'CE_DB_v1';
let NIVEAU_OPTIONS = ['Très faible','Faible','Moyen','Très bien'];
const PHASE_DEFINITIVE = 'Dépôt définitif';

/* ================= PERSONNALISATION (tout est modifiable dans l'administration) ================= */
const REGLAGES_DEFAUT = {
  classes:['Classe 1','Classe 2','Classe 3'],
  phasesExpose:['1ère correction','Deuxième correction','Dépôt définitif'],
  phasesRapport:['1ère correction','Deuxième correction','Dépôt définitif'],
  niveaux:['Très faible','Faible','Moyen','Très bien'],
  typesSource:['Livre','Document','Lien'],
  seuils:{retard:7, commissionFaible:50, absencesDimanche:3, reprise:14},
  accueil:{badge:"Académie Vases d'Honneur", titre1:'BIENVENUE À LA', titre2:'COMMISSION EXPOSÉ', suiviTitre1:'SUIVI DE MES', suiviTitre2:'EXPOSÉS & RAPPORTS'},
  // Modèles des messages automatiques — variables : {nom} {numero} {type} {date} {heure} {remarques} {classe} {salle} {lieu} {poste}
  modeles:{
    depotExpose:'Bonjour {nom}, votre exposé n° {numero} a été reçu le {date} à {heure} et sera bientôt corrigé.',
    depotRapport:'Bonjour {nom}, votre rapport de stage n° {numero} a été reçu le {date} à {heure} et sera bientôt corrigé.',
    depotDefinitif:'Bonjour {nom}, votre rapport de stage DÉFINITIF n° {numero} a été reçu le {date} à {heure}. Il est enregistré comme définitif.',
    enCorrection:'Votre {type} n° {numero} est en cours de correction.',
    correctionTerminee:'Votre correction est terminée pour le {type} n° {numero}. Veuillez passer à la commission récupérer le document.{remarques}',
    retrait:'Retrait confirmé pour le {type} n° {numero}. Merci.',
    seancePresentateur:'Vous êtes programmé(e) pour présenter la méthodologie des exposés en {classe}, le {date} — Salle {salle}.',
    seanceModerateur:'Un 1er passage de présentation de la méthodologie est programmé pour {classe} le {date} — Salle {salle}.',
    sortie:'Vous êtes programmé(e) pour la sortie du {date} à {lieu}, en tant que {poste}.',
    moderateurExpose:'{classe} : l\'exposé n° {numero} de {nom} {etape}.',
    methodoPresentee:'La méthodologie a été présentée en {classe} le {date} par {presentateur}.{compteRendu}',
    methodoValidee:'La présentation de la méthodologie en {classe} (passage n°{numero}) est validée. Thèmes proposés : {themes}. Date de dépôt du 1er jet : {date}.'
  },
  nonDoublons:[]   // paires marquées « ce ne sont pas des doublons »
};
const MODELES_LBL = {
  depotExpose:'Exposé reçu', depotRapport:'Rapport de stage reçu', depotDefinitif:'Rapport définitif reçu',
  enCorrection:'Document pris en correction', correctionTerminee:'Correction terminée', retrait:'Retrait confirmé',
  seancePresentateur:'Séance : présentateur programmé', seanceModerateur:'Séance : modérateur informé', sortie:'Sortie : personne programmée',
  moderateurExpose:'Modérateur : évolution d\'un exposé de sa classe', methodoPresentee:'Modérateur : méthodologie présentée dans sa classe', methodoValidee:'Modérateur : présentation validée'
};
function reglages(){ return (typeof DB!=='undefined' && DB && DB.reglages) || REGLAGES_DEFAUT; }
function applyReglages(){
  const r=reglages(), sd=r.seuils||{};
  RETARD_JOURS = Number(sd.retard)||7;
  SEUIL_COMMISSION_FAIBLE = Number(sd.commissionFaible)||50;
  SEUIL_ABSENCES_DIMANCHE = Number(sd.absencesDimanche)||3;
  SEUIL_REPRISE_JOURS = Number(sd.reprise)||14;
  NIVEAU_OPTIONS = (r.niveaux&&r.niveaux.length)?r.niveaux:REGLAGES_DEFAUT.niveaux;
}
function modele(cle, vars){
  const t = (reglages().modeles||{})[cle] || REGLAGES_DEFAUT.modeles[cle] || '';
  return t.replace(/\{(\w+)\}/g, (m,k)=> vars && vars[k]!==undefined && vars[k]!==null ? String(vars[k]) : '');
}
// Remplit une liste déroulante sans doublons, en conservant le choix en cours
function fillSelect(id, list, opts){
  const sel=typeof id==='string'?document.getElementById(id):id; if(!sel) return;
  opts=opts||{};
  const v=sel.value;
  const items=uniq(list||[]);
  sel.innerHTML=(opts.vide?`<option value="">${escapeHtml(opts.vide)}</option>`:'')+items.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  if(v && items.includes(v)) sel.value=v;
}

/* ================= DONNÉES OFFICIELLES — Étudiants par commission =================
   Source : Etudiants_par_commission_2.docx (115 lignes, 16 commissions).
   Le responsable de commission est rattaché à chaque étudiant.
   Pour une commission rattachée à une église fille, le responsable est « Église fille ». */
const DATA_VERSION = 6;
const OFFICIEL_COMMISSIONS = [
  {"id": "cm-01", "nom": "Logistique", "responsable": "TRAORE Charles", "totalAttendu": 16},
  {"id": "cm-02", "nom": "Cours", "responsable": "Mme OUALLE", "totalAttendu": 20},
  {"id": "cm-03", "nom": "Exposé", "responsable": "Dr Éric ZAGBEU", "totalAttendu": 21},
  {"id": "cm-04", "nom": "Intercession", "responsable": "Lucie HOUPHOUËT", "totalAttendu": 15},
  {"id": "cm-05", "nom": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "totalAttendu": 9},
  {"id": "cm-06", "nom": "Inscription", "responsable": "FLAVIEN Kouamé", "totalAttendu": 8},
  {"id": "cm-07", "nom": "Modération", "responsable": "BOUAFFON Christelle", "totalAttendu": 5},
  {"id": "cm-08", "nom": "Trésorerie", "responsable": "DOUVO Abenan", "totalAttendu": 3},
  {"id": "cm-09", "nom": "Accueil", "responsable": "Marie Christiane VAGBE", "totalAttendu": 4},
  {"id": "cm-10", "nom": "Torrent d'amour", "responsable": "Alex BOLOU", "totalAttendu": 5},
  {"id": "cm-11", "nom": "Gestion des effectifs", "responsable": "Eva MALAN", "totalAttendu": 2},
  {"id": "cm-12", "nom": "Académie en Mission", "responsable": "Christiane KOUAMÉ", "totalAttendu": 2},
  {"id": "cm-13", "nom": "Communication", "responsable": "CISSÉ Ismaël", "totalAttendu": 2},
  {"id": "cm-14", "nom": "Évangélisation", "responsable": "Église fille", "totalAttendu": 1},
  {"id": "cm-15", "nom": "Relation extérieure", "responsable": "AVY Marcel", "totalAttendu": 1},
  {"id": "cm-16", "nom": "Secrétariat", "responsable": "NZAME Daisy", "totalAttendu": 1},
];
const OFFICIEL_ETUDIANTS = [
  {"id": "st-001", "nom": "TSHINANGA MUTAYI", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-002", "nom": "GRAH Jemima", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-003", "nom": "SITTIE Yvan", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-004", "nom": "DEUMO Dimitri", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-005", "nom": "TEGBA Auguste", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-006", "nom": "TEGBA Omoi Sheryl", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-007", "nom": "GNALI Denise épse N'ZI", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-008", "nom": "N'GUESSAN B. Jean-Yves", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-009", "nom": "YAO Valéry", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-010", "nom": "GOURI Youwahi Diana", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-011", "nom": "AMOBILÉ N'DOMAN Louis Philippe", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-012", "nom": "KEÏTA Paul", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-013", "nom": "SOH KOFFI Jean Élisée", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-014", "nom": "KOUAMÉ N'Guessan Mathurin", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-015", "nom": "DIOMANDÉ Mantieni Vanessa", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-016", "nom": "BENI TIADJI Hugues", "commission": "Logistique", "responsable": "TRAORE Charles", "classe": ""},
  {"id": "st-017", "nom": "BI GONE KIKO Jeannot", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-018", "nom": "ZAN BI GOHI Ferdinand", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-019", "nom": "N'GORAN Loukou Joseph", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-020", "nom": "NONON Angèle", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-021", "nom": "KOUAKOU Aya", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-022", "nom": "HITI NGARYANOUBA", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-023", "nom": "BAYEBEC Roely", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-024", "nom": "ACKOUNDZÉ Simplice", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-025", "nom": "Mme ABI née Mudulo Djandalu Aimerance", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-026", "nom": "KOUADIO Joseph", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-027", "nom": "KOUASSI Loukou Claudine", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-028", "nom": "TIA Alessandra Noëlle", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-029", "nom": "HYÉ N'DINDJO K. Guillaume Richard", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-030", "nom": "KOUAKOU Amani Eta", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-031", "nom": "OUATTARA Nan-Kadié", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-032", "nom": "KOFFI Christian", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-033", "nom": "KOFFI Marie Françoise", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-034", "nom": "SEKA OKOMA Stéphane", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-035", "nom": "KOUAKOU AYA", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-036", "nom": "ABI NEE MUDULO MIANDABU", "commission": "Cours", "responsable": "Mme OUALLE", "classe": ""},
  {"id": "st-037", "nom": "RONAND QUENUM", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-038", "nom": "YAHIRI Junior", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-039", "nom": "YAO DIBY Parfait", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-040", "nom": "TAGRO Clémentine", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-041", "nom": "BIO Djessa Thérèse", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-042", "nom": "ZÉHÉ Raïssa", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-043", "nom": "N'DOUMI Wilfried", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-044", "nom": "ACKOUNDZÉ née Madeleine Amney Tchimou", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-045", "nom": "CAMARA Kiyobien Ghislain", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-046", "nom": "Stella EKASSI", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-047", "nom": "Germain ROMBA", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-048", "nom": "LAUBOUET Faith", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-049", "nom": "Héléna KONAN", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-050", "nom": "PIERRE Anselme KOUAMÉ", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-051", "nom": "YAO Alex Kouadio Anderson", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-052", "nom": "MANDO Bi Ephrem", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-053", "nom": "Olivia YAO", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-054", "nom": "KOUASSI Laure", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-055", "nom": "FAMEY EHUIA Rebecca", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-056", "nom": "ANÉ Bolou", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-057", "nom": "GATA MADJOU Pyrrhus", "commission": "Exposé", "responsable": "Dr Éric ZAGBEU", "classe": ""},
  {"id": "st-058", "nom": "Rose TOYI", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-059", "nom": "MUJINGA épse MUYA", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-060", "nom": "TENE SEPAN", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-061", "nom": "KOBENA épse AYÉ Monique Élisabeth", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-062", "nom": "EDITH IRIGALE", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-063", "nom": "Mme Béatrice YAPO BEUGRÉ", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-064", "nom": "Mme GNOLOU Virginie", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-065", "nom": "AOUSSOU Angela Flore Raphaëlle", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-066", "nom": "SORO Gina épse BABARA", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-067", "nom": "ESSOMBA NDITO TOBIE", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-068", "nom": "N'DEPO épse KOUAMÉ Abri Jocelyne Christelle", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-069", "nom": "KOUADIO Marina Sandrine", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-070", "nom": "TA LOU Sandrine", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-071", "nom": "Steven YAPEAUD", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-072", "nom": "GNOLOU VIRGINIE", "commission": "Intercession", "responsable": "Lucie HOUPHOUËT", "classe": ""},
  {"id": "st-073", "nom": "ASSOKLÉ Eugénie", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-074", "nom": "ABOBI Laullot Marie", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-075", "nom": "ANICHIA LEBATO", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-076", "nom": "ABI Hugues Roland", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-077", "nom": "AHORCO Aya Adeline Arielle", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-078", "nom": "DIRABOU épse KANSE Francelline", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-079", "nom": "HOUPHOUËT épse TRAORE Magloire", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-080", "nom": "GUILO Pharel", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-081", "nom": "AFFI Aurielle", "commission": "Vie spirituelle", "responsable": "HOUPHOUËT / Marie DIOMANDÉ", "classe": ""},
  {"id": "st-082", "nom": "YAPI AKISSI Félicité", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-083", "nom": "ATCHIRI Linclair Yannick", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-084", "nom": "AGOUA Djoman Grâce", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-085", "nom": "KRAH Affoua Vanessa", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-086", "nom": "KOFFI N'DA Naphiassou Linda Emmanuelle", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-087", "nom": "ATOBÉ Yannick", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-088", "nom": "CODJOVI Yolande", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-089", "nom": "KOYE GRACE", "commission": "Inscription", "responsable": "FLAVIEN Kouamé", "classe": ""},
  {"id": "st-090", "nom": "ANGUI Jean-Sébastien", "commission": "Modération", "responsable": "BOUAFFON Christelle", "classe": ""},
  {"id": "st-091", "nom": "MESSOU Jean Yannick", "commission": "Modération", "responsable": "BOUAFFON Christelle", "classe": ""},
  {"id": "st-092", "nom": "KONAN Amenan Lafleur", "commission": "Modération", "responsable": "BOUAFFON Christelle", "classe": ""},
  {"id": "st-093", "nom": "OUHAN Andé Bénédicte K.", "commission": "Modération", "responsable": "BOUAFFON Christelle", "classe": ""},
  {"id": "st-094", "nom": "YAO TANOH Ange Privat Désiré", "commission": "Modération", "responsable": "BOUAFFON Christelle", "classe": ""},
  {"id": "st-095", "nom": "BÉDÉ Cynthia épse TOUTOUKPO", "commission": "Trésorerie", "responsable": "DOUVO Abenan", "classe": ""},
  {"id": "st-096", "nom": "ETTIEN Affia Anne Florence", "commission": "Trésorerie", "responsable": "DOUVO Abena", "classe": ""},
  {"id": "st-097", "nom": "KILIMO Kouamé Princesse", "commission": "Trésorerie", "responsable": "DOUVO Abena", "classe": ""},
  {"id": "st-098", "nom": "KONAN Amani Lydie", "commission": "Accueil", "responsable": "Marie Christiane VAGBE", "classe": ""},
  {"id": "st-099", "nom": "KOUAKOU Christiane", "commission": "Accueil", "responsable": "Marie Christiane VAGBE", "classe": ""},
  {"id": "st-100", "nom": "LEHE Christelle", "commission": "Accueil", "responsable": "Marie Christiane VAGBE", "classe": ""},
  {"id": "st-101", "nom": "IRIÉ LOU BOUÉ Sandrine", "commission": "Accueil", "responsable": "Marie Christiane VAGBE", "classe": ""},
  {"id": "st-102", "nom": "MOBIO Sidonie Edith", "commission": "Torrent d'amour", "responsable": "Alex BOLOU", "classe": ""},
  {"id": "st-103", "nom": "TAKI Anne Marie", "commission": "Torrent d'amour", "responsable": "Alex BOLOU", "classe": ""},
  {"id": "st-104", "nom": "IDO Gnamien Ahou Noël", "commission": "Torrent d'amour", "responsable": "Alex BOLOU", "classe": ""},
  {"id": "st-105", "nom": "KOUAKOU Carine", "commission": "Torrent d'amour", "responsable": "Alex BOLOU", "classe": ""},
  {"id": "st-106", "nom": "BOYA Andréa", "commission": "Torrent d'amour", "responsable": "Alex BOLOU", "classe": ""},
  {"id": "st-107", "nom": "MALOUM Djomkamla", "commission": "Gestion des effectifs", "responsable": "Eva MALAN", "classe": ""},
  {"id": "st-108", "nom": "DRIA Barbara", "commission": "Gestion des effectifs", "responsable": "Eva MALAN", "classe": ""},
  {"id": "st-109", "nom": "TANO Emmanuelle Imona", "commission": "Académie en Mission", "responsable": "Christiane KOUAMÉ", "classe": ""},
  {"id": "st-110", "nom": "TIBARAPAS Suzy Starlette Loïs", "commission": "Académie en Mission", "responsable": "Christiane KOUAMÉ", "classe": ""},
  {"id": "st-111", "nom": "MOULAUD Ingrid", "commission": "Communication", "responsable": "CISSÉ Ismaël", "classe": ""},
  {"id": "st-112", "nom": "SANOGO Bintou", "commission": "Communication", "responsable": "CISSÉ Ismaël", "classe": ""},
  {"id": "st-113", "nom": "NEMBRA Ruth", "commission": "Évangélisation", "responsable": "Église fille", "classe": ""},
  {"id": "st-114", "nom": "OUROU Aïssata", "commission": "Relation extérieure", "responsable": "AVY Marcel", "classe": ""},
  {"id": "st-115", "nom": "KOUAME Bérénice", "commission": "Secrétariat", "responsable": "NZAME Daisy", "classe": ""},
];


/* Membres de la Commission Exposé (pointage + Espace Correcteur).
   Liste = responsable de la commission + « STAGIAIRES - PROMO 10 » (liste transmise le 16/10/2026).
   État spirituel : Moyen pour tous (modifiable dans Administration → Configuration).
   Les codes personnels sont modifiables dans Administration → Configuration. */
const OFFICIEL_MEMBRES = [
  {"id": "mb-00", "nom": "Dr Éric ZAGBEU", "code": "3185", "role": "Responsable de la commission"},
  {"id": "mp-01", "nom": "FLORA KOUAME", "code": "3435", "role": "Membre — Stagiaires Promo 10", "tel": "07 77 08 26 40", "eglise": "", "situation": "ETATS UNIS"},
  {"id": "mp-02", "nom": "GRACE DEBAURAH NASSA", "code": "9234", "role": "Membre — Stagiaires Promo 10", "tel": "07 88 83 20 57", "eglise": "", "situation": "DISPONIBLE"},
  {"id": "mp-03", "nom": "ANAIS BODOU ANE", "code": "3569", "role": "Membre — Stagiaires Promo 10", "tel": "07 09 17 37 32", "eglise": "", "situation": "DISPONIBLE"},
  {"id": "mp-04", "nom": "JUNIOR YAHIRI", "code": "9028", "role": "Membre — Stagiaires Promo 10", "tel": "07 77 11 43 92", "eglise": "", "situation": "NOUV MARIE"},
  {"id": "mp-05", "nom": "YANNICK YAO", "code": "4988", "role": "Membre — Stagiaires Promo 10", "tel": "07 79 79 07 71", "eglise": "", "situation": "INDISPONIBLE"},
  {"id": "mp-06", "nom": "WILFRIED N'DOUMI", "code": "5788", "role": "Membre — Stagiaires Promo 10", "tel": "07 07 95 51 86", "eglise": "", "situation": "EN VOYAGE"},
  {"id": "mp-07", "nom": "MATHIAS KOUASSI", "code": "9731", "role": "Membre — Stagiaires Promo 10", "tel": "05 05 99 79 03", "eglise": "", "situation": "PAS ENCORE EU DE RETOUR, CERTAINEMENT EN VOYAGE"},
  {"id": "mp-08", "nom": "HELENA DESIREE GRACE KONAN", "code": "5010", "role": "Membre — Stagiaires Promo 10", "tel": "07 89 07 40 43", "eglise": "", "situation": "DISPONIBLE"},
  {"id": "mp-09", "nom": "ANDERSON ALEX YAO", "code": "9528", "role": "Membre — Stagiaires Promo 10", "tel": "07 79 25 57 62", "eglise": "", "situation": ""},
  {"id": "mp-10", "nom": "YAO ARIEL KPANGRAN TRAORE", "code": "3917", "role": "Membre — Stagiaires Promo 10", "tel": "07 47 88 74 18", "eglise": "", "situation": "PERMISSIONNAIRE"},
  {"id": "mp-11", "nom": "FAITH MARY-ANN KONIAN LAUBOUET", "code": "6575", "role": "Membre — Stagiaires Promo 10", "tel": "07 59 25 67 44", "eglise": "", "situation": "SIGNALE LE CORPS SOUFFRANT"},
  {"id": "mp-12", "nom": "PYRRHUS MADJOU GATA", "code": "4070", "role": "Membre — Stagiaires Promo 10", "tel": "07 11 61 54 39", "eglise": "", "situation": "DISPONIBLE"},
  {"id": "mp-13", "nom": "GHISLAIN KIYOBIEN CAMARA", "code": "9019", "role": "Membre — Stagiaires Promo 10", "tel": "07 58 87 39 81", "eglise": "", "situation": ""},
  {"id": "mp-14", "nom": "DESIREE KOUSSO AFFOH", "code": "8074", "role": "Membre — Stagiaires Promo 10", "tel": "07 68 03 56 69", "eglise": "", "situation": ""},
  {"id": "mp-15", "nom": "EUGENIO N'GUESSAN DIBY", "code": "8107", "role": "Membre — Stagiaires Promo 10", "tel": "01 40 74 57 45", "eglise": "", "situation": ""},
  {"id": "mp-16", "nom": "STELLA EKASSI", "code": "4815", "role": "Membre — Stagiaires Promo 10", "tel": "07 03 93 16 83", "eglise": "", "situation": ""},
  {"id": "mp-17", "nom": "JEAN ORLANE NIAMIEN", "code": "8028", "role": "Membre — Stagiaires Promo 10", "tel": "01 40 87 77 56", "eglise": "", "situation": "EN MISSION, DOIT NORMALEMENT RENTRER SAMEDI SOIR"},
  {"id": "mp-18", "nom": "REBECCA FAMEY", "code": "8438", "role": "Membre — Stagiaires Promo 10", "tel": "01 40 01 52 14", "eglise": "", "situation": "CORPS SOUFFRANT"},
  {"id": "mp-19", "nom": "DORIANE GNOPO", "code": "7099", "role": "Membre — Stagiaires Promo 10", "tel": "07 69 23 12 97", "eglise": "", "situation": "BOUAKE"},
  {"id": "mp-21", "nom": "ROSINE KEDEM", "code": "4306", "role": "Membre — Stagiaires Promo 10", "tel": "05 84 10 80 77", "eglise": "", "situation": "EN MISSION"},
  {"id": "mp-22", "nom": "AMSTRONG BEUGRE", "code": "1344", "role": "Membre — Stagiaires Promo 10", "tel": "01 51 40 03 63", "eglise": "", "situation": "PERMISSIONNAIRE"},
  {"id": "mp-23", "nom": "ACKOUNDZE MADELEINE", "code": "3956", "role": "Membre — Stagiaires Promo 10", "tel": "05 05 73 71 72", "eglise": "", "situation": "PERMISSIONNAIRE"},
  {"id": "mp-24", "nom": "TAGRO CLEMENTINE", "code": "8442", "role": "Membre — Stagiaires Promo 10", "tel": "05 64 67 16 79", "eglise": "", "situation": ""},
  {"id": "mp-25", "nom": "DEGBE CARLOS", "code": "5949", "role": "Membre — Stagiaires Promo 10", "tel": "05 02 34 97 94", "eglise": "CLASSE AMOUR ET...", "situation": "DISPONIBLE"},
  {"id": "mp-26", "nom": "QUENUM RONAND", "code": "4792", "role": "Membre — Stagiaires Promo 10", "tel": "01 70 76 28 76", "eglise": "JOIE DIVINE", "situation": ""},
  {"id": "mp-27", "nom": "ROMBA GERMAIN", "code": "8666", "role": "Membre — Stagiaires Promo 10", "tel": "07 08 06 86 70", "eglise": "JOIE DIVINE", "situation": "DISPONIBLE"},
  {"id": "mp-28", "nom": "N'DA N'GORAN KOUADIO RAYMOND", "code": "4117", "role": "Membre — Stagiaires Promo 10", "tel": "05 55 21 52 17 / 05 00 62 11 68", "eglise": "BENEDICTIONS SANS LIMITES", "situation": ""},
  {"id": "mp-29", "nom": "KOUAME AFFELY PIERRE ANSELME", "code": "8034", "role": "Membre — Stagiaires Promo 10", "tel": "01 53 96 13 53", "eglise": "BENEDICTIONS SANS LIMITES", "situation": ""},
  {"id": "mp-30", "nom": "MANDO BI AKOULA EPHREM", "code": "4791", "role": "Membre — Stagiaires Promo 10", "tel": "07 77 97 77 78", "eglise": "AUTEL ROYAL", "situation": "DISPONIBLE"},
  {"id": "mp-31", "nom": "BIO THERESE", "code": "3601", "role": "Membre — Stagiaires Promo 10", "tel": "07 58 04 17 00", "eglise": "AUTEL ROYAL", "situation": "CORPS SOUFFRANT"},
  {"id": "mp-32", "nom": "DOGO RACHEL", "code": "8287", "role": "Membre — Stagiaires Promo 10", "tel": "07 08 06 81 84", "eglise": "AUTEL ROYAL", "situation": ""},
  {"id": "mp-33", "nom": "ZEKRE VERONIQUE RAISSA", "code": "5845", "role": "Membre — Stagiaires Promo 10", "tel": "07 09 18 19 30", "eglise": "AUTEL ROYAL", "situation": ""},
  {"id": "mp-34", "nom": "AOUONHO GUY ROLAND", "code": "1345", "role": "Membre — Stagiaires Promo 10", "tel": "07 89 33 10 75", "eglise": "", "situation": ""},
];

function seedDB(){
  return {
    etudiants:[],   // rempli par ensureOfficialData() avec la liste officielle
    membres:[],   // rempli par ensureOfficialData() (membres officiels de la commission)
    creneaux:[
      {id:'c1',jour:'Samedi',debut:'07:00',fin:'10:00',label:'07h - 10h'},
      {id:'c2',jour:'Samedi',debut:'10:00',fin:'13:00',label:'10h - 13h'},
      {id:'c3',jour:'Samedi',debut:'13:00',fin:'15:00',label:'13h - 15h'},
      {id:'c4',jour:'Dimanche',debut:'07:00',fin:'10:00',label:'07h - 10h'},
      {id:'c5',jour:'Dimanche',debut:'10:00',fin:'13:00',label:'10h - 13h'},
      {id:'c6',jour:'Dimanche',debut:'13:00',fin:'15:00',label:'13h - 15h'}
    ],
    motifsPresence:['Permanence','Correction des exposés','Coordinateur d\'exposés','Présentation de la méthodologie','Séance de méditation','Présentation de quiz biblique'],
    eglises:[
      'Centre Kodesh (Siège mondial) — Cocody Angré',
      'Centre de la Foi (VHCDF) — Treichville, Avenue 21',
      'Centre Eden — Yopougon, Cité CIE',
      'Centre Yotsar — Yopougon, Cité SOPIM / Ancien Bel-Air',
      'Centre Abobo — Abobo Belle-ville',
      'Centre Influence — Plateau Dokui',
      'Centre Productivité — Cocody Palmeraie',
      'Assemblée Porte des Brebis — Riviera 3',
      'Assemblée Vie Glorieuse — Riviera 2',
      'Assemblée Restauration — Angré Château',
      'Assemblée du Triomphe — Angré',
      'Centre Doxa — Faya',
      'Antenne de Port-Bouët — Route de Grand-Bassam Yamoussoukro',
      'Bouaké',
      'San-Pédro',
      'Daloa',
      'Korhogo'
    ],
    commissions:[],  // rempli par ensureOfficialData() (16 commissions + responsables)
    sessions:[],
    sorties:[],
    bibliotheque:[],
    meditations:[],
    quizBiblique:[],
    messages:[],
    presences:[],
    expositions:[],
    rapports:[],
    compteurs:{expose:0,rapport:0}
  };
}

/* Intègre la liste officielle (étudiants, commissions, responsables, rapports définitifs)
   dans une base existante, sans rien effacer d'autre. Retourne true si la base a changé. */
function normName(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }
/* ================= DOUBLONS ================= */
// Clé de comparaison d'un nom : sans accents, majuscules, titres (Mme, M., Dr…) ni ponctuation
function cleNom(s){ return normName(s).replace(/[.,;:'’"()\-]/g,' ').replace(/\b(mme|mlle|mr|m|dr|pasteur|pst|frere|soeur)\b/g,' ').replace(/\s+/g,' ').trim(); }
// Liste sans doublons (comparaison sans accents / majuscules / espaces)
function uniq(list, keyFn){
  keyFn=keyFn||(x=>normName(x)); const vu=new Set();
  return (list||[]).filter(x=>{ const k=keyFn(x); if(!k || vu.has(k)) return false; vu.add(k); return true; });
}
function existeDeja(list, valeur, keyFn){ keyFn=keyFn||(x=>normName(x)); const k=keyFn(valeur); return (list||[]).some(x=>keyFn(x)===k); }
// Doublons probables : même nom, ou au moins 2 mots en commun (hors petits mots)
function doublonsProbables(list){
  const mots = n => new Set(cleNom(n).split(' ').filter(w=>w.length>=3 && !['nee','epse','epouse','de','des','les'].includes(w)));
  const ignores=new Set((reglages().nonDoublons||[]));
  const out=[];
  for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++){
    const a=list[i], b=list[j];
    const cle=[a.id,b.id].sort().join('|'); if(ignores.has(cle)) continue;
    let same = cleNom(a.nom)===cleNom(b.nom);
    if(!same){ const A=mots(a.nom), B=mots(b.nom); let c=0; A.forEach(w=>{ if(B.has(w)) c++; }); same = c>=2; }
    if(same) out.push([a,b]);
  }
  return out;
}
function ensureOfficialData(db){
  if(!db || (db.dataVersion||0) >= DATA_VERSION) return false;
  if((db.dataVersion||0) < 2) ensureListeV2(db);
  if((db.dataVersion||0) < 3) ensureMembresV3(db);
  if((db.dataVersion||0) < 4) ensureMembresV4(db);
  if((db.dataVersion||0) < 5){ dedoublonnerV5(db); if(db.reglages) db.reglages.version=5; }   // la marque force l'enregistrement des réglages sur le serveur
  if((db.dataVersion||0) < 6){ ensureV6(db); if(db.reglages) db.reglages.version=6; }
  db.dataVersion = DATA_VERSION;
  return true;
}
/* ================= v6 : COHÉRENCE, MODÉRATEURS, JURY ================= */
function slug(s){ return cleNom(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'x'; }
function codeAleatoire(dejaPris){ let c; do{ c=String(1000+Math.floor(Math.random()*9000)); }while((dejaPris||[]).includes(c) || new Set(c).size<2); return c; }
// Deux noms désignent-ils la même personne ? (même nom, ou au moins 2 mots en commun)
function memePersonne(a,b){
  if(cleNom(a)===cleNom(b)) return true;
  const mots = n => new Set(cleNom(n).split(' ').filter(w=>w.length>=3 && !['nee','epse','epouse','des','les'].includes(w)));
  const A=mots(a), B=mots(b); let c=0; A.forEach(w=>{ if(B.has(w)) c++; }); return c>=2;
}
function ensureV6(db){
  if(!db.tombstones) db.tombstones={};
  ['moderateurs','jury','chats','acces'].forEach(k=>{ if(!Array.isArray(db[k])) db[k]=[]; });
  // 1) Les membres de la commission Exposé sont sous la charge de son responsable :
  //    chacun est relié à sa fiche étudiant ; ceux qui n'en ont pas sont ajoutés à la commission Exposé.
  const comExpose=(db.commissions||[]).find(c=>normName(c.nom)==='expose') || {nom:'Exposé', responsable:'Dr Éric ZAGBEU'};
  (db.membres||[]).forEach(m=>{
    if(/responsable/i.test(m.role||'') || normName(m.nom)===normName(comExpose.responsable)) return;
    let e=(db.etudiants||[]).find(x=>x.id===m.etudiantId) || (db.etudiants||[]).find(x=>memePersonne(x.nom,m.nom));
    if(!e){
      const id='st-m-'+m.id;
      if(db.tombstones[id]) return;
      e={id, nom:m.nom, commission:comExpose.nom, responsable:comExpose.responsable, classe:'', source:'membre'};
      db.etudiants.push(e);
    }
    m.etudiantId=e.id;
  });
  // 2) Modérateurs de classe : repris des séances et des exposés déjà enregistrés
  const pris=(db.moderateurs||[]).map(x=>String(x.code));
  const ajoutModo=(nom,tel,classe)=>{
    nom=String(nom||'').trim(); if(!nom) return;
    let md=db.moderateurs.find(x=>cleNom(x.nom)===cleNom(nom));
    if(!md){ const id='md-'+slug(nom); if(db.tombstones[id]) return; md={id, nom, tel:tel||'', code:codeAleatoire(pris), classes:[]}; pris.push(md.code); db.moderateurs.push(md); }
    if(tel && !md.tel) md.tel=tel;
    if(classe && !md.classes.includes(classe)) md.classes.push(classe);
  };
  (db.sessions||[]).forEach(s=>{ [s.moderateur1,s.moderateur2].forEach(x=>{ if(x) ajoutModo(x.nom,x.tel,s.classe); }); });
  (db.expositions||[]).forEach(x=>ajoutModo(x.moderateur,'',x.classe));
  // 3) Membres du jury : repris des sorties (président, jury 1, jury 2)
  const prisJ=(db.jury||[]).map(x=>String(x.code));
  (db.sorties||[]).forEach(v=>{ ['president','jury1','jury2'].forEach(k=>{ const p=(v.postes||{})[k]; if(!p||!p.nom) return;
    if(db.jury.some(j=>cleNom(j.nom)===cleNom(p.nom))) return; const id='jy-'+slug(p.nom); if(db.tombstones[id]) return;
    const c=codeAleatoire(prisJ); prisJ.push(c); db.jury.push({id, nom:p.nom, tel:p.tel||'', code:c}); }); });
  // 4) Mise en cohérence des rapports avec la liste des étudiants
  corrigerCoherence(db);
}

/* ---------- Cohérence : chaque rapport est rattaché à un étudiant de la liste, dans la commission
   de son responsable ; les taux se calculent sur les étudiants sous la charge de chaque responsable. ---------- */
function commissionParResponsable(db, respNom){
  if(!respNom) return null;
  const l=(db.commissions||[]).filter(c=>c.responsable && normName(c.responsable)===normName(respNom));
  return l.length===1 ? l[0] : null;
}
function analyseCoherence(db){
  db=db||DB;
  const out=[];
  const parNom=new Map(); (db.etudiants||[]).forEach(e=>parNom.set(cleNom(e.nom),e));
  const comNom=n=>(db.commissions||[]).find(c=>c.nom===n);
  (db.rapports||[]).forEach(r=>{
    const respNom = r.responsable && (r.responsable.nom||r.responsable);
    const comResp = commissionParResponsable(db, respNom);
    let e = parNom.get(cleNom(r.etudiantNom));
    if(!e){
      const com = comResp ? comResp.nom : (comNom(r.commission) ? r.commission : '');
      out.push({type:'hors_liste', id:r.id, texte:`${r.etudiantNom} a un rapport (${r.numero}) mais n'est pas dans la liste des étudiants`, action: com ? `l'ajouter à la commission ${com}` : 'à rattacher à une commission', commission:com});
      return;
    }
    const cible = comResp ? comResp.nom : e.commission;
    if(e.commission!==cible) out.push({type:'commission_etudiant', id:r.id, etudiantId:e.id, vers:cible, texte:`${e.nom} est dans « ${e.commission||'—'} » mais son rapport désigne ${respNom} (${cible})`, action:`le placer dans ${cible}`});
    if(r.commission!==cible) out.push({type:'commission_rapport', id:r.id, vers:cible, texte:`Rapport ${r.numero} de ${e.nom} : commission « ${r.commission||'—'} » au lieu de « ${cible} »`, action:`corriger en ${cible}`});
    const c=comNom(cible), attendu=c?c.responsable:'';
    if(attendu && !comResp && normName(respNom||'')!==normName(attendu)) out.push({type:'responsable', id:r.id, vers:attendu, texte:`Rapport ${r.numero} de ${e.nom} : responsable « ${respNom||'—'} » au lieu de « ${attendu} »`, action:`indiquer ${attendu}`});
  });
  return out;
}
function corrigerCoherence(db){
  db=db||DB; let n=0;
  analyseCoherence(db).forEach(p=>{
    const r=(db.rapports||[]).find(x=>x.id===p.id); if(!r) return;
    if(p.type==='hors_liste' && p.commission){
      if((db.etudiants||[]).some(e=>cleNom(e.nom)===cleNom(r.etudiantNom))) return;
      const c=(db.commissions||[]).find(x=>x.nom===p.commission);
      db.etudiants.push({id:'st-r-'+r.id, nom:r.etudiantNom, commission:p.commission, responsable:c?c.responsable:'', classe:'', source:'rapport'});
      r.commission=p.commission; n++;
    }
    if(p.type==='commission_etudiant'){ const e=db.etudiants.find(x=>x.id===p.etudiantId); const c=(db.commissions||[]).find(x=>x.nom===p.vers); if(e){ e.commission=p.vers; e.responsable=c?c.responsable:e.responsable; n++; } }
    if(p.type==='commission_rapport'){ r.commission=p.vers; n++; }
    if(p.type==='responsable'){ r.responsable = Object.assign({tel:''}, typeof r.responsable==='object'?r.responsable:{}, {nom:p.vers}); n++; }
  });
  return n;
}
// Étudiants sous la charge du responsable d'une commission, et taux de rapports définitifs (jamais plus de 100 %)
function sousCharge(commissionNom){ return (DB.etudiants||[]).filter(e=>e.commission===commissionNom); }
function tauxDefinitifs(commissionNom){
  const liste=sousCharge(commissionNom);
  const defs=new Set((DB.rapports||[]).filter(r=>r.statut==='definitif').map(r=>cleNom(r.etudiantNom)));
  const n=liste.filter(e=>defs.has(cleNom(e.nom))).length;
  return {total:liste.length, n, pct: liste.length ? Math.round(n/liste.length*100) : null, manquants: liste.filter(e=>!defs.has(cleNom(e.nom)))};
}

/* ---------- Modérateurs : registre et notifications de leur classe ---------- */
function ajouterModerateur(nom, tel, classe){
  nom=String(nom||'').trim(); if(!nom) return null;
  let md=(DB.moderateurs||[]).find(x=>cleNom(x.nom)===cleNom(nom));
  if(!md){
    const id='md-'+slug(nom);
    if(DB.tombstones && DB.tombstones[id]) return null;
    md={id, nom, tel:tel||'', code:codeAleatoire(DB.moderateurs.map(x=>String(x.code))), classes:[]};
    DB.moderateurs.push(md);
  }
  if(tel && !md.tel) md.tel=tel;
  if(classe && !(md.classes||[]).includes(classe)) md.classes=(md.classes||[]).concat([classe]);
  return md;
}
// Modérateurs concernés par une classe (+ modérateur nommé sur le document), sans doublons
function moderateursDe(classe, autres){
  const l=(DB.moderateurs||[]).filter(m=>classe && (m.classes||[]).includes(classe)).map(m=>({nom:m.nom, tel:m.tel}));
  (autres||[]).forEach(a=>{ if(a && a.nom) l.push({nom:a.nom, tel:a.tel||''}); });
  return uniq(l, x=>cleNom(x.nom));
}
function notifierModerateurs(classe, autres, texte, titre){
  moderateursDe(classe, autres).forEach(m=>sendMessage(m.nom, texte, m.tel, {titre:titre||'Ma classe', type:'moderateur'}));
}

/* ---------- Jury : registre et dossier complet d'un étudiant ---------- */
function ajouterJury(nom, tel){
  nom=String(nom||'').trim(); if(!nom) return null;
  let j=(DB.jury||[]).find(x=>cleNom(x.nom)===cleNom(nom));
  if(!j){ const id='jy-'+slug(nom); if(DB.tombstones && DB.tombstones[id]) return null;
    j={id, nom, tel:tel||'', code:codeAleatoire(DB.jury.map(x=>String(x.code)))}; DB.jury.push(j); }
  if(tel && !j.tel) j.tel=tel;
  return j;
}
// Tous les documents d'un étudiant (exposés + rapports), du plus ancien au plus récent, avec les messages reçus
function dossierEtudiant(nom){
  const k=cleNom(nom);
  const docs=[].concat(
    (DB.expositions||[]).filter(x=>cleNom(x.etudiantNom)===k).map(x=>Object.assign({type:'Exposé'},x)),
    (DB.rapports||[]).filter(x=>cleNom(x.etudiantNom)===k).map(x=>Object.assign({type:'Rapport de stage'},x))
  ).sort((a,b)=>(a.tsDepot||0)-(b.tsDepot||0));
  const msgs=(DB.messages||[]).filter(m=>(!m.cible||m.cible==='personne') && cleNom(m.nom)===k).sort((a,b)=>(a.ts||0)-(b.ts||0));
  const fiche=(DB.etudiants||[]).find(e=>cleNom(e.nom)===k)||null;
  return {nom, fiche, docs, msgs};
}
// Constats automatiques pour le jury : ce que l'étudiant peut affirmer et ce que la base montre réellement
function constatsDossier(d){
  const out=[];
  const ex=d.docs.filter(x=>x.type==='Exposé');
  if(!d.docs.length) out.push(['ko','Aucun document déposé à la commission']);
  ex.forEach(x=>{
    if(x.statut==='depose') out.push(['ko',`${x.numero} (${x.phase||''}) : déposé le ${frDate(x.dateDepot)}, jamais pris en correction`]);
    if(x.statut==='en_correction') out.push(['wa',`${x.numero} : en cours de correction par ${x.correcteur||'—'} — pas encore d'observations envoyées`]);
    if((x.statut==='corrige_complet'||x.statut==='corrige_partiel') && !x.dateRetrait) out.push(['wa',`${x.numero} : corrigé le ${frDate(x.dateCorrection)} mais l'étudiant ne l'a pas encore retiré (il ne peut pas avoir vu les corrections sur papier)`]);
    if(x.statut==='corrige_partiel') out.push(['wa',`${x.numero} : correction PARTIELLE seulement`]);
    if((x.statut==='corrige_complet'||x.statut==='corrige_partiel'||x.statut==='retire') && !x.commentaire) out.push(['in',`${x.numero} : corrigé par ${x.correcteur||'—'} sans observation écrite`]);
  });
  const corriges=ex.filter(x=>x.dateCorrection);
  if(corriges.length){
    const der=corriges[corriges.length-1];
    const apres=ex.filter(x=>(x.tsDepot||0)>(der.tsDepot||0));
    if(!apres.length) out.push(['in',`Aucune nouvelle version déposée après la dernière correction (${der.numero}) : la commission n'a pas pu vérifier que les observations ont été prises en compte`]);
  }
  if(d.docs.some(x=>x.type==='Rapport de stage' && x.statut==='definitif')) out.push(['ok','Rapport de stage définitif enregistré']);
  if(!out.length) out.push(['ok','Dossier sans anomalie']);
  return out;
}
/* ---------- Accès : modérateurs et jury (nom + code), étudiants (code personnel Suivi) ---------- */
function verifierCode(coll, nom, code){
  const p=(DB[coll]||[]).find(x=>cleNom(x.nom)===cleNom(nom));
  return p && String(p.code)===String(code).trim() ? p : null;
}
function hashPin(nom, pin){ let h=2166136261; const t='CE|'+cleNom(nom)+'|'+String(pin); for(let i=0;i<t.length;i++){ h^=t.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(16); }
function accesDe(nom){ return (DB.acces||[]).find(a=>cleNom(a.nom)===cleNom(nom)); }
function definirPin(nom, pin){ const id='ac-'+slug(nom); let a=DB.acces.find(x=>x.id===id); if(!a){ a={id, nom}; DB.acces.push(a); } a.pin=hashPin(nom,pin); a.date=todayStr(); return a; }

/* ---------- DISCUSSIONS (avec n'importe qui) + justificatifs ---------- */
const ADMIN_NOM='Administration';
function filKey(a,b){ return [cleNom(a),cleNom(b)].sort().join('~'); }
function envoyerChat(de, a, texte, pieces, extra){
  extra=extra||{};
  const c=Object.assign({id:nid(), de, a, fil:filKey(de,a), texte:texte||'', pieces:pieces||[], date:todayStr(), heure:nowTimeStr(), ts:Date.now(), lu:false}, extra);
  if(c.justificatif){ c.statut='en_attente'; c.decision=''; }
  DB.chats.push(c);
  return c;
}
function filsDe(nom){
  const k=cleNom(nom), map=new Map();
  (DB.chats||[]).forEach(c=>{
    const moiDe=cleNom(c.de)===k, moiA=cleNom(c.a)===k; if(!moiDe && !moiA) return;
    const autre=moiDe?c.a:c.de, key=cleNom(autre);
    const f=map.get(key)||{autre, dernier:null, nonLus:0, total:0};
    f.total++; if(!f.dernier || c.ts>f.dernier.ts) f.dernier=c;
    if(moiA && !c.lu) f.nonLus++;
    map.set(key,f);
  });
  return Array.from(map.values()).sort((x,y)=>y.dernier.ts-x.dernier.ts);
}
function messagesFil(a,b){ const f=filKey(a,b); return (DB.chats||[]).filter(c=>c.fil===f).sort((x,y)=>x.ts-y.ts); }
function marquerFilLu(moi, autre){ let n=0; messagesFil(moi,autre).forEach(c=>{ if(cleNom(c.a)===cleNom(moi) && !c.lu){ c.lu=true; n++; } }); return n; }
function chatsNonLus(nom){ return (DB.chats||[]).filter(c=>cleNom(c.a)===cleNom(nom) && !c.lu).length; }
// Annuaire : toutes les personnes avec qui on peut discuter (sans doublons)
function annuaire(){
  const l=[{nom:ADMIN_NOM, role:'Administration de la commission'}];
  (DB.commissions||[]).forEach(c=>{ if(c.responsable && !/eglise fille|non communique/.test(normName(c.responsable))) l.push({nom:c.responsable, role:'Responsable — commission '+c.nom}); });
  (DB.membres||[]).forEach(m=>l.push({nom:m.nom, role:m.role||'Membre de la commission'}));
  (DB.moderateurs||[]).forEach(m=>l.push({nom:m.nom, role:'Modérateur — '+((m.classes||[]).join(', ')||'classe')}));
  (DB.jury||[]).forEach(j=>l.push({nom:j.nom, role:'Membre du jury'}));
  (DB.etudiants||[]).forEach(e=>l.push({nom:e.nom, role:'Étudiant — '+(e.commission||'')}));
  return uniq(l, x=>cleNom(x.nom));
}
// Envoi d'une pièce jointe / d'un justificatif au serveur (photo réduite automatiquement, PDF jusqu'à 6 Mo)
function lireFichier(file){ return new Promise((ok,ko)=>{ const r=new FileReader(); r.onerror=()=>ko(r.error); r.onload=e=>ok(e.target.result); r.readAsDataURL(file); }); }
async function envoyerFichier(file){
  let type=file.type||'', data;
  if(/^image\//.test(type)){ data=await compressImage(file,1600,0.78); type='image/jpeg'; }
  else {
    if(!/pdf|msword|officedocument|text\/plain/.test(type)) throw new Error('Formats acceptés : photo, PDF, Word ou texte.');
    if(file.size>6*1024*1024) throw new Error('Fichier trop volumineux (6 Mo maximum).');
    data=await lireFichier(file);
  }
  let r;
  try{ r=await fetch('/api/fichier',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nom:file.name, type, data})}); }
  catch(e){ throw new Error("Serveur injoignable : la pièce jointe n'a pas pu être envoyée."); }
  const j=await r.json().catch(()=>({}));
  if(!r.ok || !j.ok) throw new Error(j.error||'Envoi impossible');
  return {url:j.url, nom:file.name, type, taille:j.taille};
}

/* v3 : membres officiels de la commission (les 4 membres d'exemple sont retirés) */
function ensureMembresV3(db){
  if(!db.membres) db.membres=[];
  if(!db.tombstones) db.tombstones={};
  const demo={m1:'Jean Kouassi',m2:'Marie Ahou',m3:"Paul N'Guessan",m4:'Grace Adjoua'};
  db.membres.filter(m=>demo[m.id] && m.nom===demo[m.id]).forEach(m=>{ db.tombstones[m.id]=1; });
  db.membres = db.membres.filter(m=>!(demo[m.id] && m.nom===demo[m.id]));
  OFFICIEL_MEMBRES.forEach(o=>{
    if(db.tombstones[o.id]) return;
    if(db.membres.find(m=>m.id===o.id || normName(m.nom)===normName(o.nom))) return;
    db.membres.push({id:o.id, nom:o.nom, code:o.code, role:o.role, tel:o.tel||'', eglise:o.eglise||'', lieu:'', financier:'Moyen', spirituel:'Moyen', motifAbsence:o.situation||''});
  });
}
/* v4 : liste réelle des membres (Stagiaires Promo 10) — remplace la liste provisoire mb-01..mb-21 ;
   état spirituel « Moyen » pour tous les membres */
function ensureMembresV4(db){
  const provisoires = db.membres.filter(m=>/^mb-(0[1-9]|1[0-9]|2[01])$/.test(m.id));
  provisoires.forEach(m=>{ db.tombstones[m.id]=1; });
  db.membres = db.membres.filter(m=>!/^mb-(0[1-9]|1[0-9]|2[01])$/.test(m.id));
  ensureMembresV3(db);
  db.membres.forEach(m=>{
    m.spirituel='Moyen';
    const o=OFFICIEL_MEMBRES.find(x=>x.id===m.id);
    if(o){ if(o.tel && !m.tel) m.tel=o.tel; if(o.eglise && !m.eglise) m.eglise=o.eglise; if(o.situation && !m.motifAbsence) m.motifAbsence=o.situation; }
  });
}
/* v5 : suppression des doublons déjà présents dans les listes */
function dedoublonnerV5(db){
  if(!db.tombstones) db.tombstones={};
  const vus=new Map();
  (db.etudiants||[]).slice().forEach(e=>{
    const k=cleNom(e.nom);
    if(!vus.has(k)){ vus.set(k,e); return; }
    const garde=vus.get(k);
    // la fiche en double disparaît, ses dépôts sont rattachés à la fiche conservée
    (db.rapports||[]).concat(db.expositions||[]).forEach(r=>{ if(r.etudiantId===e.id || cleNom(r.etudiantNom)===k){ r.etudiantId=garde.id; r.etudiantNom=garde.nom; } });
    db.tombstones[e.id]=1; db.tombstones['rd-'+e.id]=1;
    db.etudiants=db.etudiants.filter(x=>x!==e);
    db.rapports=(db.rapports||[]).filter(r=>r.id!=='rd-'+e.id);
  });
  // un seul rapport définitif par étudiant
  const defs=new Map();
  (db.rapports||[]).slice().forEach(r=>{
    if(r.statut!=='definitif') return;
    const k=cleNom(r.etudiantNom);
    if(!defs.has(k)){ defs.set(k,r); return; }
    const garde=defs.get(k), jete = r.source==='liste officielle' ? r : (garde.source==='liste officielle' ? garde : r);
    if(jete===garde) defs.set(k,r);
    db.tombstones[jete.id]=1; db.rapports=db.rapports.filter(x=>x!==jete);
  });
  const vm=new Set();
  (db.membres||[]).slice().forEach(m=>{ const k=cleNom(m.nom); if(vm.has(k)){ db.tombstones[m.id]=1; db.membres=db.membres.filter(x=>x!==m); } else vm.add(k); });
  db.eglises=uniq(db.eglises||[]); db.motifsPresence=uniq(db.motifsPresence||[]);
  const vc=new Set(); db.commissions=(db.commissions||[]).filter(c=>{ const k=normName(c.nom); if(vc.has(k)) return false; vc.add(k); return true; });
  const vb=new Set();
  (db.bibliotheque||[]).slice().forEach(b=>{ const k=b.classe+'|'+normName(b.titre); if(vb.has(k)){ db.tombstones[b.id]=1; db.bibliotheque=db.bibliotheque.filter(x=>x!==b); } else vb.add(k); });
}
/* v2 : liste officielle des étudiants, commissions, responsables et rapports définitifs */
function ensureListeV2(db){
  if(!db.etudiants) db.etudiants=[];
  if(!db.commissions) db.commissions=[];
  if(!db.rapports) db.rapports=[];
  // 1) étudiants : on retire les 5 étudiants d'exemple, on ajoute / met à jour la liste officielle
  if(!db.tombstones) db.tombstones={};
  db.etudiants.filter(e=>/^e[1-5]$/.test(e.id)).forEach(e=>{ db.tombstones[e.id]=1; });
  db.etudiants = db.etudiants.filter(e=>!/^e[1-5]$/.test(e.id));
  OFFICIEL_ETUDIANTS.forEach(o=>{
    const ex=db.etudiants.find(e=>e.id===o.id);
    if(ex) Object.assign(ex,{nom:o.nom,commission:o.commission,responsable:o.responsable});
    else db.etudiants.push(Object.assign({},o));
  });
  // 2) commissions : les commissions d'exemple non utilisées sont retirées, les 16 officielles ajoutées avec leur responsable
  const used=new Set([...(db.expositions||[]),...db.rapports].map(r=>r.commission).filter(Boolean));
  db.commissions = db.commissions.filter(c=>!['Commission Exposé','Commission Permanence'].includes(c.nom) || used.has(c.nom));
  OFFICIEL_COMMISSIONS.forEach(o=>{
    const ex=db.commissions.find(c=>normName(c.nom)===normName(o.nom));
    if(ex){ ex.responsable=o.responsable; if(!ex.totalAttendu) ex.totalAttendu=o.totalAttendu; }
    else db.commissions.push(Object.assign({},o));
  });
  // 3) rapports de stage DÉFINITIFS pour chaque étudiant de la liste
  const ds=todayStr();
  OFFICIEL_ETUDIANTS.forEach((o,i)=>{
    const rid='rd-'+o.id;
    if(db.tombstones && db.tombstones[rid]) return;
    const ancien=db.rapports.find(r=>r.id===rid);
    if(ancien){
      // fiche créée par une version précédente : alignée sur la nouvelle liste
      if(ancien.source==='import' || ancien.source==='liste officielle'){
        Object.assign(ancien,{etudiantNom:o.nom, commission:o.commission, responsable:{nom:o.responsable, tel:''}, source:'liste officielle'});
        if(!ancien.mandataire) ancien.mandataire=null;
      }
      return;
    }
    if(db.rapports.find(r=>r.statut==='definitif' && normName(r.etudiantNom)===normName(o.nom))) return;
    db.rapports.push({
      id:rid, numero:'STG-DEF-'+String(i+1).padStart(3,'0'), etudiantNom:o.nom, tel:'',
      phase:'Dépôt définitif', responsable:{nom:o.responsable, tel:''}, mandataire:null,
      commission:o.commission, lieu:'', photos:[], statut:'definitif', correcteur:'', commentaire:'', commentaireBrouillon:'',
      source:'liste officielle', dateDepot:ds, heureDepot:'', tsDepot:new Date(ds+'T08:00:00').getTime(), dateCorrection:'', dateRetrait:''
    });
  });
}
// Rapport définitif déjà enregistré pour ce nom d'étudiant (ou undefined)
function rapportDefinitifDe(nom){ const n=normName(nom); return (DB.rapports||[]).find(r=>r.statut==='definitif' && normName(r.etudiantNom)===n); }
function commissionResponsable(nomCommission){ const c=(DB.commissions||[]).find(x=>x.nom===nomCommission); return c && c.responsable ? c.responsable : ''; }

/* ================= STOCKAGE LOCAL + SYNCHRONISATION AVEC LE SERVEUR =================
   Chaque appareil garde une copie locale et envoie ses modifications au serveur (server.js),
   qui les FUSIONNE fiche par fiche : la tablette, le PC et les téléphones peuvent enregistrer
   en même temps sans s'écraser. Sans serveur : mode hors-ligne sur un seul appareil. */
// Collections fusionnées fiche par fiche (par id)
const RECORD_COLLECTIONS = ['etudiants','membres','presences','expositions','rapports','sessions','sorties','bibliotheque','meditations','quizBiblique','messages','programmes','moderateurs','jury','chats','acces'];
// Paramètres fusionnés en bloc (la modification la plus récente gagne)
const CONFIG_KEYS = ['creneaux','eglises','commissions','motifsPresence','adminCode','reglages'];

function applyDefaults(DB){
  RECORD_COLLECTIONS.forEach(k=>{ if(!Array.isArray(DB[k])) DB[k]=[]; });
  if(!DB.creneaux || !DB.creneaux.length) DB.creneaux = seedDB().creneaux;
  if(!DB.compteurs) DB.compteurs = {expose:0,rapport:0};
  if(!DB.eglises || !DB.eglises.length) DB.eglises = seedDB().eglises;
  if(!DB.commissions) DB.commissions = [];
  if(!DB.motifsPresence || !DB.motifsPresence.length) DB.motifsPresence = seedDB().motifsPresence;
  if(!DB.tombstones) DB.tombstones = {};
  if(!DB.adminCode) DB.adminCode = ADMIN_CODE;
  // réglages personnalisables : on complète ce qui manque avec les valeurs par défaut
  const R0=JSON.parse(JSON.stringify(REGLAGES_DEFAUT));
  if(!DB.reglages || typeof DB.reglages!=='object') DB.reglages=R0;
  Object.keys(R0).forEach(k=>{
    if(DB.reglages[k]===undefined) DB.reglages[k]=R0[k];
    else if(R0[k] && typeof R0[k]==='object' && !Array.isArray(R0[k])) Object.keys(R0[k]).forEach(k2=>{ if(DB.reglages[k][k2]===undefined) DB.reglages[k][k2]=R0[k][k2]; });
  });
  ['phasesExpose','phasesRapport'].forEach(k=>{ if(!DB.reglages[k].includes(PHASE_DEFINITIVE)) DB.reglages[k].push(PHASE_DEFINITIVE); });
  if(!DB._cfgU) DB._cfgU = 1;
  DB.membres.forEach(m=>{
    if(m.lieu===undefined) m.lieu='';
    if(m.tel===undefined) m.tel='';
    if(m.financier===undefined) m.financier='Moyen';
    if(m.spirituel===undefined) m.spirituel='Moyen';
    if(m.motifAbsence===undefined) m.motifAbsence='';
  });
}
// Suppression d'une fiche : elle est aussi retirée des autres appareils lors de la synchronisation
function removeRecord(coll, id){
  const i=(DB[coll]||[]).findIndex(r=>r.id===id);
  if(i>=0) DB[coll].splice(i,1);
  DB.tombstones[id]=Date.now();
}

let DB = null;
let SNAP = {}, SNAP_CFG = '';
let DIRTY = false, SYNC_BUSY = false, SERVER_CONNECTE = false, LAST_RENDER_SIG = '';

function recSig(r){ const c=Object.assign({},r); delete c._u; return JSON.stringify(c); }
function cfgSig(db){ return JSON.stringify(CONFIG_KEYS.map(k=>db[k])); }
function takeSnapshot(){
  SNAP={};
  RECORD_COLLECTIONS.forEach(k=>(DB[k]||[]).forEach(r=>{ SNAP[k+':'+r.id]=recSig(r); }));
  SNAP_CFG=cfgSig(DB);
}
function stampChanges(){
  const now=Date.now();
  RECORD_COLLECTIONS.forEach(k=>(DB[k]||[]).forEach(r=>{
    if(!r.id) r.id=nid();
    if(SNAP[k+':'+r.id]!==recSig(r)) r._u=now;
  }));
  if(cfgSig(DB)!==SNAP_CFG) DB._cfgU=now;
}
function writeLocal(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
  catch(e){
    // stockage local plein : on garde une copie sans les photos (elles restent sur le serveur)
    try{
      const light=JSON.parse(JSON.stringify(DB));
      ['expositions','rapports'].forEach(k=>light[k].forEach(r=>{ r.photos=(r.photos||[]).filter(p=>!String(p).startsWith('data:')); }));
      localStorage.setItem(LS_KEY, JSON.stringify(light));
    }catch(e2){ console.warn('Stockage local indisponible', e2); }
  }
}
function loadDB(){
  let parsed=null;
  try{ const raw=localStorage.getItem(LS_KEY); parsed = raw ? JSON.parse(raw) : null; }catch(e){ parsed=null; }
  DB = parsed || seedDB();
  applyDefaults(DB); applyReglages();
  takeSnapshot();
  const changed = ensureOfficialData(DB);
  // appareil neuf : on lit d'abord le serveur avant d'envoyer quoi que ce soit
  if(changed && parsed){ stampChanges(); DIRTY=true; }
  takeSnapshot();
  writeLocal();
}
function saveDB(){
  stampChanges();
  takeSnapshot();
  DIRTY=true;
  writeLocal();
  syncNow();
}
function adoptRemote(remote){
  DB=remote;
  applyDefaults(DB); applyReglages();
  takeSnapshot();
  const changed=ensureOfficialData(DB);
  if(changed){ stampChanges(); DIRTY=true; window._resync=true; }   // base ancienne version : la mise à jour est renvoyée au serveur tout de suite
  takeSnapshot();
  writeLocal();
  const sig=JSON.stringify(DB);
  if(sig!==LAST_RENDER_SIG){
    LAST_RENDER_SIG=sig;
    if(typeof window.onRemoteUpdate==='function'){ try{ window.onRemoteUpdate(); }catch(e){ console.error(e); } }
  }
}
async function syncNow(manual){
  if(SYNC_BUSY){ window._resync=true; return; }
  SYNC_BUSY=true;
  try{
    let r;
    if(DIRTY){
      const sent=JSON.stringify(DB);
      DIRTY=false;
      r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:sent,cache:'no-store'});
      if(!r.ok){ DIRTY=true; throw new Error('HTTP '+r.status); }
    } else {
      r=await fetch('/api/data',{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
    }
    const txt=await r.text();
    SERVER_CONNECTE=true;
    if(!txt || txt==='null'){ DIRTY=true; window._resync=true; }      // serveur vide : on lui envoie nos données
    else if(!DIRTY){ adoptRemote(JSON.parse(txt)); }                  // sinon on renverra d'abord nos modifications
    if(manual) toast('Données actualisées depuis le serveur','ok');
  }catch(e){
    SERVER_CONNECTE=false;
    if(manual) toast("Aucun serveur local détecté — mode hors-ligne (un seul appareil)",'ko');
  }finally{
    SYNC_BUSY=false;
    updateSyncBadge();
    if(window._resync){ window._resync=false; setTimeout(()=>syncNow(),50); }
  }
}
function pullRemote(silent){ return syncNow(!silent); }
function manualRefresh(){ syncNow(true); }
function updateSyncBadge(){
  document.querySelectorAll('.sync-badge').forEach(el=>{
    el.textContent = SERVER_CONNECTE ? (DIRTY?'Synchronisation…':'Connecté au serveur') : 'Hors-ligne';
    el.style.color = SERVER_CONNECTE ? (DIRTY?'#f0b90b':'#9be3c4') : '#ffb4b8';
  });
}

function nid(){ return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowTimeStr(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function nowFull(){ return Date.now(); }
function initials(name){ return String(name||'?').replace(/^(Mme|M\.|Dr)\s+/i,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
function joursDepuis(dateMs){ return Math.floor((Date.now()-(dateMs||Date.now()))/86400000); }
function joursDepuisStr(ds){ if(!ds) return 0; return Math.floor((Date.now() - new Date(ds+'T00:00:00').getTime())/86400000); }
function addDaysStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function addMonthsStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setMonth(d.getMonth()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function frDate(ds){ const p=String(ds||'').split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : (ds||''); }
function safeFileName(s){ return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,''); }
// Libellés des statuts (identiques sur toutes les interfaces)
const STATUT_LBL = {
  depose:['Déposé — à corriger','bn'], en_correction:['En correction','by'],
  corrige_complet:['Corrigé complet','bg'], corrige_partiel:['Corrigé partiel','by'],
  retire:['Retiré','bg'], definitif:['Définitif','bg'], clos:['Clôturé (définitif reçu)','bn']
};
function statutLabel(s){ return STATUT_LBL[s] || ['—','bn']; }
/* Photos : réduites avant enregistrement (dépôt rapide, base légère) */
function compressImage(file, maxSide, quality){
  maxSide=maxSide||1280; quality=quality||0.72;
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(reader.error);
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        try{
          const k=Math.min(1, maxSide/Math.max(img.width,img.height));
          const cv=document.createElement('canvas'); cv.width=Math.round(img.width*k); cv.height=Math.round(img.height*k);
          cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
          resolve(cv.toDataURL('image/jpeg',quality));
        }catch(err){ resolve(e.target.result); }
      };
      img.onerror=()=>reject(new Error('Image illisible'));
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
/* Téléchargement d'un fichier généré (Word / Excel) */
function downloadBytes(bytes, fileName, mime){
  const blob=new Blob([bytes],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=fileName; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },4000);
}
const MOIS_LBL=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Les niveaux sont personnalisables : les premiers de la liste déclenchent une alerte
function niveauBadgeClass(niveau){
  const i=NIVEAU_OPTIONS.indexOf(niveau), n=NIVEAU_OPTIONS.length;
  if(i===0) return 'br'; if(i===1 && n>2) return 'by'; if(i===n-1) return 'bg'; return 'bn';
}
function niveauAlerte(niveau){ const i=NIVEAU_OPTIONS.indexOf(niveau); return i>=0 && i < Math.max(1, Math.floor(NIVEAU_OPTIONS.length/2)); }

/* ================= MESSAGES & NOTIFICATIONS =================
   Un message est soit personnel (cible « personne »), soit une annonce à un groupe :
   « tous », « etudiants », « membres » ou « commission » (une commission précise).
   Le serveur prévient en direct les écrans ouverts et envoie une notification push
   aux téléphones abonnés (voir server.js). */
function sendMessage(nom, texte, tel, extra){
  if(!nom || !texte) return null;
  extra=extra||{};
  const date=todayStr();
  // pas deux fois le même message à la même personne le même jour
  if(DB.messages.some(m=>(!m.cible||m.cible==='personne') && normName(m.nom)===normName(nom) && m.texte===texte && m.date===date)) return null;
  const m={id:nid(), nom, tel:tel||'', titre:extra.titre||'Commission Exposé', texte, date, heure:nowTimeStr(), ts:Date.now(), lu:false, cible:'personne', type:extra.type||'info'};
  DB.messages.push(m);
  return m;
}
function sendAnnonce(cible, texte, titre, commission, auteur){
  const lbl = {tous:'Tout le monde', etudiants:'Tous les étudiants', membres:'Tous les membres', moderateurs:'Tous les modérateurs', jury:'Tous les membres du jury', commission:'Commission '+(commission||'')}[cible]||'Tout le monde';
  const m={id:nid(), nom:lbl, tel:'', titre:titre||'Annonce', texte, date:todayStr(), heure:nowTimeStr(), ts:Date.now(), lu:false, luPar:[], cible, commission:commission||'', type:'annonce', auteur:auteur||''};
  DB.messages.push(m);
  return m;
}
// Ce message concerne-t-il cette personne ?
function messageConcerne(m, nom){
  const n=normName(nom); if(!n) return false;
  if(!m.cible || m.cible==='personne') return normName(m.nom)===n;
  if(m.cible==='tous') return true;
  const etu=(DB.etudiants||[]).find(e=>normName(e.nom)===n);
  const mem=(DB.membres||[]).find(x=>normName(x.nom)===n);
  if(m.cible==='etudiants') return !!etu;
  if(m.cible==='membres') return !!mem;
  if(m.cible==='commission') return !!(etu && etu.commission===m.commission);
  if(m.cible==='moderateurs') return (DB.moderateurs||[]).some(x=>normName(x.nom)===n);
  if(m.cible==='jury') return (DB.jury||[]).some(x=>normName(x.nom)===n);
  return false;
}
function messageLu(m, nom){ return (!m.cible||m.cible==='personne') ? !!m.lu : (m.luPar||[]).includes(normName(nom)); }
function marquerLu(m, nom){ if(!m.cible||m.cible==='personne') m.lu=true; else { m.luPar=m.luPar||[]; const n=normName(nom); if(!m.luPar.includes(n)) m.luPar.push(n); } }
// Construit un lien wa.me pré-rempli (nom + message) pour envoyer en un clic via WhatsApp.
// Retourne '' si aucun numéro n'est disponible (le bouton ne doit alors pas s'afficher).
function waLink(tel, texte){
  const digits=(tel||'').replace(/[^0-9+]/g,'').replace(/^00/,'+');
  if(!digits) return '';
  const clean = digits.startsWith('+') ? digits.slice(1) : digits;
  if(clean.length<8) return '';
  return `https://wa.me/${clean}?text=${encodeURIComponent(texte)}`;
}

function toast(msg,type){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.className='toast show '+(type||'ok');
  clearTimeout(window._tst);
  window._tst=setTimeout(()=>{ t.className='toast '+(type||'ok'); },2400);
}

/* ================= TEMPS RÉEL (comme le modèle « resto ») =================
   Le serveur garde une connexion ouverte avec chaque écran (Server-Sent Events) :
   - « maj »      : les données ont changé → l'écran se met à jour tout de suite
   - « notif »    : un nouveau message vient d'être envoyé
   - « activite » : un dépôt / un pointage vient d'être fait (alerte à l'administration) */
let ES=null;
function connectStream(){
  if(!window.EventSource || location.protocol==='file:') return;
  try{ ES=new EventSource('/api/stream'); }catch(e){ return; }
  ES.onopen=()=>{ SERVER_CONNECTE=true; updateSyncBadge(); };
  ES.addEventListener('maj', ()=>{ syncNow(); });
  ES.addEventListener('notif', e=>{ try{ const m=JSON.parse(e.data); if(typeof window.onNotif==='function') window.onNotif(m); }catch(x){} });
  ES.addEventListener('chat', e=>{ try{ const c=JSON.parse(e.data); if(typeof window.onChat==='function') window.onChat(c); }catch(x){} });
  ES.addEventListener('activite', e=>{ try{ const a=JSON.parse(e.data); if(typeof window.onActivite==='function') window.onActivite(a); }catch(x){} });
}
// Son + vibration (comme le modèle)
let AUDIO_CTX=null;
document.addEventListener('click', ()=>{ if(!AUDIO_CTX) try{ AUDIO_CTX=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }, {once:true});
function ding(fort){
  try{
    AUDIO_CTX=AUDIO_CTX||new (window.AudioContext||window.webkitAudioContext)();
    const notes = fort ? [880,1175,880,1175] : [784,1046];
    notes.forEach((f,i)=>{ const o=AUDIO_CTX.createOscillator(), g=AUDIO_CTX.createGain(); const t=AUDIO_CTX.currentTime+i*.17; o.type='triangle'; o.frequency.value=f; g.gain.setValueAtTime(.22,t); g.gain.exponentialRampToValueAtTime(.001,t+.3); o.connect(g); g.connect(AUDIO_CTX.destination); o.start(t); o.stop(t+.32); });
    if(navigator.vibrate) navigator.vibrate([120,60,120]);
  }catch(e){}
}
// Bandeau de notification en haut de l'écran (cliquable)
function bandeau(titre, texte, onClick){
  let el=document.getElementById('notif-bandeau');
  if(!el){ el=document.createElement('div'); el.id='notif-bandeau'; el.className='notif-bandeau'; el.innerHTML='<div class="nb-t"></div><div class="nb-b"></div>'; document.body.appendChild(el); }
  el.querySelector('.nb-t').textContent=titre||'Notification';
  el.querySelector('.nb-b').textContent=texte||'';
  el.classList.add('on');
  el.onclick=()=>{ el.classList.remove('on'); if(onClick) onClick(); };
  clearTimeout(window._nbT); window._nbT=setTimeout(()=>el.classList.remove('on'),7000);
}
// Notification système (bureau / téléphone) quand l'onglet n'est pas au premier plan
function notifSysteme(titre, texte){
  try{
    if(!('Notification' in window) || Notification.permission!=='granted' || !document.hidden) return;
    navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration().then(reg=>{ if(reg) reg.showNotification(titre,{body:texte,tag:'ce-'+Date.now()}); else new Notification(titre,{body:texte}); }).catch(()=>{ new Notification(titre,{body:texte}); }) : new Notification(titre,{body:texte});
  }catch(e){}
}
/* ---------- Notifications push (téléphone verrouillé / application fermée) ----------
   Comme dans le modèle : il faut que l'application soit ouverte en HTTPS (serveur en ligne)
   ou sur « localhost ». Sur le Wi-Fi local en http, le bandeau + son fonctionnent quand l'app est ouverte. */
const pushDisponible = () => ('serviceWorker' in navigator) && ('PushManager' in window) && window.isSecureContext;
function b64ToU8(s){ const p='='.repeat((4-s.length%4)%4); const b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...b].map(c=>c.charCodeAt(0))); }
async function activerPush(nom){
  if(!pushDisponible()) throw new Error("Ce téléphone n'accepte les notifications que si l'application est ouverte en HTTPS (serveur en ligne). Gardez l'application ouverte : vous serez quand même prévenu.");
  let perm=Notification.permission;
  if(perm==='default') perm=await Notification.requestPermission();
  if(perm!=='granted') throw new Error('Notifications refusées : réactivez-les dans les réglages du navigateur.');
  const reg=await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
  const cle=await (await fetch('/api/push/cle')).json();
  let sub=await reg.pushManager.getSubscription();
  if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64ToU8(cle.publicKey)});
  const r=await fetch('/api/push/abonner',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nom, page:(location.pathname.split('/').pop()||'suivi.html'), subscription:sub.toJSON()})});
  if(!r.ok) throw new Error("Le serveur n'a pas accepté l'abonnement.");
  return true;
}
async function desactiverPush(){
  try{ const reg=await navigator.serviceWorker.getRegistration(); const sub=reg && await reg.pushManager.getSubscription();
    if(sub){ await fetch('/api/push/desabonner',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})}); await sub.unsubscribe(); } }catch(e){}
}

loadDB();
LAST_RENDER_SIG=JSON.stringify(DB);
connectStream();
syncNow();
setInterval(()=>syncNow(), 8000);   // filet de sécurité : le temps réel passe par connectStream()
