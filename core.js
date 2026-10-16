/* ============================================================
   COMMISSION EXPOSÉ — Académie Vases d'Honneur
   core.js — Modèle de données partagé (Étudiant + Administration)
   Partagé par les 3 interfaces : Bienvenue (etudiant.html),
   Suivi (suivi.html) et Administration (admin.html).
   Toutes doivent être ouvertes depuis le serveur local (server.js)
   pour partager les mêmes données.
   ============================================================ */

const ADMIN_CODE = '2026';   // code administrateur par défaut (modifiable dans Administration → Configuration)
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
const DATA_VERSION = 4;
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
function ensureOfficialData(db){
  if(!db || (db.dataVersion||0) >= DATA_VERSION) return false;
  if((db.dataVersion||0) < 2) ensureListeV2(db);
  if((db.dataVersion||0) < 3) ensureMembresV3(db);
  if((db.dataVersion||0) < 4) ensureMembresV4(db);
  db.dataVersion = DATA_VERSION;
  return true;
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
const RECORD_COLLECTIONS = ['etudiants','membres','presences','expositions','rapports','sessions','sorties','bibliotheque','meditations','quizBiblique','messages'];
// Paramètres fusionnés en bloc (la modification la plus récente gagne)
const CONFIG_KEYS = ['creneaux','eglises','commissions','motifsPresence','adminCode'];

function applyDefaults(DB){
  RECORD_COLLECTIONS.forEach(k=>{ if(!Array.isArray(DB[k])) DB[k]=[]; });
  if(!DB.creneaux || !DB.creneaux.length) DB.creneaux = seedDB().creneaux;
  if(!DB.compteurs) DB.compteurs = {expose:0,rapport:0};
  if(!DB.eglises || !DB.eglises.length) DB.eglises = seedDB().eglises;
  if(!DB.commissions) DB.commissions = [];
  if(!DB.motifsPresence || !DB.motifsPresence.length) DB.motifsPresence = seedDB().motifsPresence;
  if(!DB.tombstones) DB.tombstones = {};
  if(!DB.adminCode) DB.adminCode = ADMIN_CODE;
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
  applyDefaults(DB);
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
  applyDefaults(DB);
  takeSnapshot();
  const changed=ensureOfficialData(DB);
  if(changed){ stampChanges(); DIRTY=true; }   // base ancienne version : la mise à jour est renvoyée au serveur
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
LAST_RENDER_SIG=JSON.stringify(DB);
syncNow();
setInterval(()=>syncNow(), 5000);
