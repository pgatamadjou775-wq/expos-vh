/* ============================================================
   COMMISSION EXPOSÉ — Académie Vases d'Honneur
   core.js — Modèle de données partagé (Étudiant + Administration)
   Les deux interfaces doivent être servies depuis la même origine
   (même domaine / même dossier) pour partager les données via
   localStorage + serveur local. Sans cela chaque interface aura
   sa propre base.
   ============================================================ */

const ADMIN_CODE = '2026';
const RETARD_JOURS = 7;      // seuil "en retard" si non corrigé après ce délai
const SEUIL_COMMISSION_FAIBLE = 50; // % en dessous duquel on alerte sur le taux de dépôt d'une commission
const SEUIL_ABSENCES_DIMANCHE = 3;  // nombre de dimanches sans pointage avant alerte
const SEUIL_REPRISE_JOURS = 14;     // délai avant d'alerter qu'une classe n'a pas eu son 1er passage

const LS_KEY = 'CE_DB_v1';
const NIVEAU_OPTIONS = ['Très faible','Faible','Moyen','Très bien'];

/* ================= DONNÉES OFFICIELLES — Étudiants par commission =================
   Source : Etudiants_par_commission_2.docx (115 lignes, 16 commissions).
   Le responsable de commission est rattaché à chaque étudiant.
   Pour une commission rattachée à une église fille, le responsable est « Église fille ». */
const DATA_VERSION = 2;
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

function seedDB(){
  return {
    etudiants:[],   // rempli par ensureOfficialData() avec la liste officielle
    membres:[
      {id:'m1',nom:'Jean Kouassi',code:'1111',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''},
      {id:'m2',nom:'Marie Ahou',code:'2222',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''},
      {id:'m3',nom:'Paul N\'Guessan',code:'3333',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''},
      {id:'m4',nom:'Grace Adjoua',code:'4444',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''}
    ],
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
function ensureOfficialData(db){
  if(!db || (db.dataVersion||0) >= DATA_VERSION) return false;
  if(!db.etudiants) db.etudiants=[];
  if(!db.commissions) db.commissions=[];
  if(!db.rapports) db.rapports=[];
  // 1) étudiants : on retire les 5 étudiants d'exemple, on ajoute / met à jour la liste officielle
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
    if(db.rapports.find(r=>r.id===rid)) return;
    if(db.rapports.find(r=>r.statut==='definitif' && normName(r.etudiantNom)===normName(o.nom))) return;
    db.rapports.push({
      id:rid, numero:'STG-DEF-'+String(i+1).padStart(3,'0'), etudiantNom:o.nom, tel:'',
      phase:'Dépôt définitif', responsable:{nom:o.responsable, tel:''}, mandataire:null,
      commission:o.commission, lieu:'', photos:[], statut:'definitif', correcteur:'', commentaire:'', commentaireBrouillon:'',
      source:'liste officielle', dateDepot:ds, heureDepot:'', tsDepot:new Date(ds+'T08:00:00').getTime(), dateCorrection:'', dateRetrait:''
    });
  });
  db.dataVersion = DATA_VERSION;
  return true;
}
// Rapport définitif déjà enregistré pour ce nom d'étudiant (ou undefined)
function rapportDefinitifDe(nom){ const n=normName(nom); return (DB.rapports||[]).find(r=>r.statut==='definitif' && normName(r.etudiantNom)===n); }
function commissionResponsable(nomCommission){ const c=(DB.commissions||[]).find(x=>x.nom===nomCommission); return c && c.responsable ? c.responsable : ''; }

function writeLocal(json){
  try{ localStorage.setItem(LS_KEY, json); }
  catch(e){ console.warn('Stockage local plein — les données restent sur le serveur', e); }
}

function applyDefaults(DB){
  ['etudiants','membres','presences','expositions','rapports'].forEach(k=>{ if(!Array.isArray(DB[k])) DB[k]=[]; });
  if(!DB.creneaux || !DB.creneaux.length) DB.creneaux = seedDB().creneaux;
  if(!DB.compteurs) DB.compteurs = {expose:0,rapport:0};
  if(!DB.eglises || !DB.eglises.length) DB.eglises = seedDB().eglises;
  if(!DB.commissions) DB.commissions = [{id:'co1',nom:'Commission Exposé',totalAttendu:0}];
  if(!DB.motifsPresence || !DB.motifsPresence.length) DB.motifsPresence = seedDB().motifsPresence;
  if(!DB.sessions) DB.sessions = [];
  if(!DB.sorties) DB.sorties = [];
  if(!DB.bibliotheque) DB.bibliotheque = [];
  if(!DB.meditations) DB.meditations = [];
  if(!DB.quizBiblique) DB.quizBiblique = [];
  if(!DB.messages) DB.messages = [];
  (DB.membres||[]).forEach(m=>{
    if(m.lieu===undefined) m.lieu='';
    if(m.tel===undefined) m.tel='';
    if(m.financier===undefined) m.financier='Moyen';
    if(m.spirituel===undefined) m.spirituel='Moyen';
    if(m.motifAbsence===undefined) m.motifAbsence='';
  });
}

let DB = null;
function loadDB(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    DB = raw ? JSON.parse(raw) : seedDB();
    applyDefaults(DB);
  }catch(e){ DB = seedDB(); }
  if(ensureOfficialData(DB)) writeLocal(JSON.stringify(DB));
}
function saveDB(){
  const json = JSON.stringify(DB);
  writeLocal(json);
  fetch('/api/data', {method:'POST', headers:{'Content-Type':'application/json'}, body: json}).catch(()=>{});
}

let SERVER_CONNECTE = false;
async function pullRemote(silent){
  try{
    const r = await fetch('/api/data', {cache:'no-store'});
    if(!r.ok) throw new Error('bad status');
    const txt = await r.text();
    SERVER_CONNECTE = true;
    if(txt && txt!=='null'){
      const parsed = JSON.parse(txt);
      DB = parsed;
      applyDefaults(DB);
      writeLocal(txt);
      // base du serveur ancienne version : on y ajoute la liste officielle et on la renvoie au serveur
      if(ensureOfficialData(DB)) saveDB();
    }
    if(typeof window.onRemoteUpdate === 'function') window.onRemoteUpdate();
    if(!silent) toast('Données actualisées depuis le serveur','ok');
  }catch(e){
    SERVER_CONNECTE = false;
    if(!silent) toast("Aucun serveur local détecté — mode hors-ligne (un seul appareil)",'ko');
  }
}
function manualRefresh(){ pullRemote(false); }

function nid(){ return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowTimeStr(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function nowFull(){ return Date.now(); }
function initials(name){ return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
function joursDepuis(dateMs){ return Math.floor((Date.now()-dateMs)/86400000); }
function joursDepuisStr(ds){ if(!ds) return 0; return Math.floor((Date.now() - new Date(ds+'T00:00:00').getTime())/86400000); }
function addDaysStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function addMonthsStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setMonth(d.getMonth()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const MOIS_LBL=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function niveauBadgeClass(niveau){
  if(niveau==='Très faible') return 'br';
  if(niveau==='Faible') return 'by';
  if(niveau==='Très bien') return 'bg';
  return 'bn';
}
function niveauAlerte(niveau){ return niveau==='Très faible' || niveau==='Faible'; }

function sendMessage(nom, texte, tel){
  if(!nom) return;
  DB.messages.push({id:nid(), nom, tel:tel||'', texte, date:todayStr(), heure:nowTimeStr(), lu:false});
}
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

loadDB();
pullRemote(true);
setInterval(()=>pullRemote(true), 6000);
