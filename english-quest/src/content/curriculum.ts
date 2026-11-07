import type { Cefr, Chapter, Objective } from "@/lib/types";

export const LEVEL_INFO: Record<Cefr, { name: string; nameFr: string; goalFr: string; color: string }> = {
  B1: { name: "Threshold", nameFr: "Niveau seuil", goalFr: "Consolider les bases et gagner en autonomie dans les situations courantes.", color: "#3d7bff" },
  "B1+": { name: "Threshold+", nameFr: "Seuil avancé", goalFr: "Enrichir le vocabulaire et maîtriser des structures plus complexes.", color: "#5b6cff" },
  B2: { name: "Vantage", nameFr: "Avancé", goalFr: "Interagir avec aisance, défendre un point de vue, comprendre des contenus complexes.", color: "#7a5cff" },
  "B2+": { name: "Vantage+", nameFr: "Avancé supérieur", goalFr: "Gagner en fluidité, nuancer, argumenter avec précision.", color: "#9b6bff" },
  C1: { name: "Effective operational proficiency", nameFr: "Autonome", goalFr: "S'exprimer avec spontanéité et précision, comprendre des textes longs et implicites.", color: "#2fd58b" },
};

/* ---------------------------------------------------------------
   Référentiel : objectifs inspirés des descripteurs du CECRL
   (formulations adaptées, non officielles).
   --------------------------------------------------------------- */
export const objectives: Objective[] = [
  // B1
  { id: "b1-gr-tenses", level: "B1", skill: "grammar", descriptor: "Uses simple and continuous tenses accurately in familiar contexts.", descriptorFr: "Utilise correctement les temps simples et continus dans des contextes familiers." },
  { id: "b1-gr-pp", level: "B1", skill: "grammar", descriptor: "Distinguishes the present perfect from the past simple.", descriptorFr: "Distingue le present perfect du past simple." },
  { id: "b1-gr-narrative", level: "B1", skill: "grammar", descriptor: "Narrates past events using narrative tenses.", descriptorFr: "Raconte des événements passés avec les temps du récit." },
  { id: "b1-gr-future", level: "B1", skill: "grammar", descriptor: "Talks about plans, arrangements and predictions.", descriptorFr: "Parle de projets, de rendez-vous et de prédictions." },
  { id: "b1-gr-cond", level: "B1", skill: "grammar", descriptor: "Expresses real conditions and their consequences.", descriptorFr: "Exprime des conditions réelles et leurs conséquences." },
  { id: "b1-vo-range", level: "B1", skill: "vocabulary", descriptor: "Has sufficient vocabulary for everyday topics such as work, travel and daily life.", descriptorFr: "Dispose d'un vocabulaire suffisant pour les sujets du quotidien (travail, voyages, vie courante)." },
  { id: "b1-li-everyday", level: "B1", skill: "listening", descriptor: "Understands the main points of clear standard speech on familiar matters.", descriptorFr: "Comprend les points essentiels d'un discours clair sur des sujets familiers." },
  { id: "b1-li-work", level: "B1", skill: "listening", descriptor: "Follows short, clearly structured work discussions.", descriptorFr: "Suit de courtes discussions professionnelles clairement structurées." },
  { id: "b1-re-story", level: "B1", skill: "reading", descriptor: "Understands the description of events and feelings in narrative texts.", descriptorFr: "Comprend la description d'événements et de sentiments dans un récit." },
  { id: "b1-re-article", level: "B1", skill: "reading", descriptor: "Identifies the main conclusions in clearly argued texts.", descriptorFr: "Identifie les principales conclusions d'un texte argumentatif clair." },
  { id: "b1-sp-describe", level: "B1", skill: "speaking", descriptor: "Describes experiences, events and plans with simple connected sentences.", descriptorFr: "Décrit expériences, événements et projets avec des phrases simples et reliées." },
  { id: "b1-wr-email", level: "B1", skill: "writing", descriptor: "Writes simple connected texts and personal emails.", descriptorFr: "Écrit des textes simples et cohérents et des emails personnels." },
  // B1+
  { id: "b1p-gr-passive", level: "B1+", skill: "grammar", descriptor: "Uses the passive to focus on processes and results.", descriptorFr: "Utilise le passif pour mettre en avant un processus ou un résultat." },
  { id: "b1p-gr-reported", level: "B1+", skill: "grammar", descriptor: "Reports statements, questions and requests.", descriptorFr: "Rapporte des propos, des questions et des demandes." },
  { id: "b1p-gr-relative", level: "B1+", skill: "grammar", descriptor: "Uses defining and non-defining relative clauses.", descriptorFr: "Utilise les relatives déterminatives et explicatives." },
  { id: "b1p-gr-gerinf", level: "B1+", skill: "grammar", descriptor: "Chooses between gerund and infinitive after verbs and prepositions.", descriptorFr: "Choisit entre gérondif et infinitif après verbes et prépositions." },
  { id: "b1p-vo-range", level: "B1+", skill: "vocabulary", descriptor: "Uses common phrasal verbs and collocations appropriately.", descriptorFr: "Utilise à bon escient les phrasal verbs et collocations courants." },
  { id: "b1p-li-announcements", level: "B1+", skill: "listening", descriptor: "Understands detailed practical information and announcements.", descriptorFr: "Comprend des informations pratiques détaillées et des annonces." },
  { id: "b1p-li-podcast", level: "B1+", skill: "listening", descriptor: "Follows the main ideas of podcasts on familiar topics.", descriptorFr: "Suit les idées principales d'un podcast sur un sujet familier." },
  { id: "b1p-re-professional", level: "B1+", skill: "reading", descriptor: "Finds and understands relevant information in workplace documents.", descriptorFr: "Repère et comprend les informations utiles dans des documents professionnels." },
  { id: "b1p-sp-story", level: "B1+", skill: "speaking", descriptor: "Narrates a story and gives reasons for opinions.", descriptorFr: "Raconte une histoire et justifie ses opinions." },
  { id: "b1p-wr-formal", level: "B1+", skill: "writing", descriptor: "Writes formal letters and short reports on routine matters.", descriptorFr: "Rédige des lettres formelles et de courts comptes rendus." },
  // B2
  { id: "b2-gr-cond", level: "B2", skill: "grammar", descriptor: "Expresses hypotheses and regrets about present and past.", descriptorFr: "Exprime hypothèses et regrets sur le présent et le passé." },
  { id: "b2-gr-future", level: "B2", skill: "grammar", descriptor: "Projects into the future with continuous and perfect forms.", descriptorFr: "Se projette dans le futur avec les formes continue et parfaite." },
  { id: "b2-gr-modals", level: "B2", skill: "grammar", descriptor: "Makes deductions and criticisms with modal verbs.", descriptorFr: "Fait des déductions et des reproches avec les modaux." },
  { id: "b2-vo-range", level: "B2", skill: "vocabulary", descriptor: "Has a broad vocabulary on professional and social issues; varies formulation.", descriptorFr: "Possède un vocabulaire étendu sur les sujets professionnels et sociétaux ; varie la formulation." },
  { id: "b2-li-news", level: "B2", skill: "listening", descriptor: "Understands most news and current affairs programmes.", descriptorFr: "Comprend la plupart des informations et émissions d'actualité." },
  { id: "b2-li-interview", level: "B2", skill: "listening", descriptor: "Follows extended speech and interviews, including the speaker's attitude.", descriptorFr: "Suit un discours long et des entretiens, y compris l'attitude du locuteur." },
  { id: "b2-re-article", level: "B2", skill: "reading", descriptor: "Reads articles on contemporary problems in which writers adopt particular viewpoints.", descriptorFr: "Lit des articles sur des problèmes contemporains où l'auteur adopte un point de vue." },
  { id: "b2-re-tech", level: "B2", skill: "reading", descriptor: "Understands explanatory texts on specialised topics.", descriptorFr: "Comprend des textes explicatifs sur des sujets spécialisés." },
  { id: "b2-sp-argue", level: "B2", skill: "speaking", descriptor: "Explains a viewpoint giving the advantages and disadvantages of various options.", descriptorFr: "Développe un point de vue en exposant avantages et inconvénients." },
  { id: "b2-wr-essay", level: "B2", skill: "writing", descriptor: "Writes clear, detailed essays developing an argument.", descriptorFr: "Rédige des essais clairs et détaillés développant une argumentation." },
  // B2+
  { id: "b2p-gr-emphasis", level: "B2+", skill: "grammar", descriptor: "Uses inversion and cleft sentences for emphasis.", descriptorFr: "Utilise l'inversion et les phrases clivées pour l'emphase." },
  { id: "b2p-gr-linking", level: "B2+", skill: "grammar", descriptor: "Links ideas with a wide range of cohesive devices.", descriptorFr: "Articule ses idées avec une large gamme de connecteurs." },
  { id: "b2p-wr-style", level: "B2+", skill: "writing", descriptor: "Controls punctuation, register and style.", descriptorFr: "Maîtrise ponctuation, registre et style." },
  { id: "b2p-vo-range", level: "B2+", skill: "vocabulary", descriptor: "Uses idiomatic expressions and precise vocabulary.", descriptorFr: "Emploie des expressions idiomatiques et un vocabulaire précis." },
  { id: "b2p-li-debate", level: "B2+", skill: "listening", descriptor: "Follows complex lines of argument in debates.", descriptorFr: "Suit des argumentations complexes lors de débats." },
  { id: "b2p-li-work", level: "B2+", skill: "listening", descriptor: "Understands negotiations and detailed professional exchanges.", descriptorFr: "Comprend des négociations et des échanges professionnels détaillés." },
  { id: "b2p-re-essay", level: "B2+", skill: "reading", descriptor: "Understands opinion essays, including concessions and irony.", descriptorFr: "Comprend des essais d'opinion, y compris concessions et ironie." },
  { id: "b2p-sp-debate", level: "B2+", skill: "speaking", descriptor: "Takes part in debates, responding to counter-arguments.", descriptorFr: "Participe à un débat en répondant aux contre-arguments." },
  // C1
  { id: "c1-gr-formal", level: "C1", skill: "grammar", descriptor: "Uses the subjunctive and formal hypothetical structures.", descriptorFr: "Utilise le subjonctif et les structures hypothétiques formelles." },
  { id: "c1-gr-complex", level: "C1", skill: "grammar", descriptor: "Produces complex sentences with participle clauses and nominalisation.", descriptorFr: "Produit des phrases complexes (participiales, nominalisation)." },
  { id: "c1-gr-nuance", level: "C1", skill: "grammar", descriptor: "Expresses fine shades of meaning and hedges claims appropriately.", descriptorFr: "Exprime des nuances fines et atténue ses affirmations à bon escient." },
  { id: "c1-vo-range", level: "C1", skill: "vocabulary", descriptor: "Has a good command of a broad lexical repertoire, including idioms.", descriptorFr: "Maîtrise un large répertoire lexical, y compris idiomatique." },
  { id: "c1-li-lecture", level: "C1", skill: "listening", descriptor: "Understands extended lectures, even when not clearly structured.", descriptorFr: "Comprend des conférences longues, même peu structurées." },
  { id: "c1-li-academic", level: "C1", skill: "listening", descriptor: "Follows abstract, complex academic discussions.", descriptorFr: "Suit des discussions académiques abstraites et complexes." },
  { id: "c1-re-science", level: "C1", skill: "reading", descriptor: "Understands long, complex texts and their implicit meaning.", descriptorFr: "Comprend des textes longs et complexes ainsi que leurs implicites." },
  { id: "c1-re-academic", level: "C1", skill: "reading", descriptor: "Understands academic argumentation and the writer's stance.", descriptorFr: "Comprend une argumentation académique et la position de l'auteur." },
  { id: "c1-sp-present", level: "C1", skill: "speaking", descriptor: "Presents clear, well-structured descriptions of complex subjects spontaneously.", descriptorFr: "Présente spontanément un sujet complexe de façon claire et structurée." },
  { id: "c1-wr-academic", level: "C1", skill: "writing", descriptor: "Writes clear, well-structured texts on complex subjects with appropriate style.", descriptorFr: "Rédige des textes clairs et bien structurés sur des sujets complexes, au style adapté." },
];

/* ---------------------------------------------------------------
   Parcours : niveaux → chapitres → leçons
   --------------------------------------------------------------- */
export const chapters: Chapter[] = [
  {
    id: "b1-c1",
    level: "B1",
    title: "Everyday Life & Experience",
    titleFr: "Vie quotidienne et expériences",
    story: "Vous arrivez à Port Lexis, une ville portuaire où tout le monde parle anglais. Première mission : vous installer et raconter votre parcours.",
    boss: { name: "The Time Keeper", title: "Gardien des temps", lore: "Il confond le passé et le présent de quiconque hésite. Prouvez que vous maîtrisez les temps.", avatar: "clock" },
    lessons: [
      { id: "b1-l1", title: "Habits and changes", titleFr: "Habitudes et situations temporaires", grammarTopic: "tenses-review", vocabTheme: "daily", vocabCount: 8, listening: "flat-viewing", speaking: "sp-rep-1", objectives: ["b1-gr-tenses", "b1-li-everyday"] },
      { id: "b1-l2", title: "Your story so far", titleFr: "Votre parcours jusqu'ici", grammarTopic: "present-perfect", vocabTheme: "work", vocabCount: 8, reading: "repair-cafe", speaking: "sp-q-1", objectives: ["b1-gr-pp", "b1-re-story"] },
      { id: "b1-l3", title: "Travel tales", titleFr: "Récits de voyage", grammarTopic: "past-perfect", vocabTheme: "travel", vocabCount: 8, speaking: "sp-read-1", objectives: ["b1-gr-narrative", "b1-sp-describe"] },
    ],
  },
  {
    id: "b1-c2",
    level: "B1",
    title: "Plans & Possibilities",
    titleFr: "Projets et possibilités",
    story: "Le port prépare un grand festival. On vous confie l'organisation : planifier, prévoir, anticiper.",
    boss: { name: "The Oracle of If", title: "L'Oracle du Si", lore: "Elle ne répond qu'à ceux qui savent exprimer une condition.", avatar: "orb" },
    lessons: [
      { id: "b1-l4", title: "Future plans", titleFr: "Parler de l'avenir", grammarTopic: "future-forms", vocabTheme: "education", vocabCount: 8, reading: "teen-sleep", speaking: "sp-desc-1", objectives: ["b1-gr-future", "b1-re-article"] },
      { id: "b1-l5", title: "Real conditions at work", titleFr: "Conditions réelles au travail", grammarTopic: "conditionals-01", vocabTheme: "tech", vocabCount: 8, listening: "team-standup", writing: "w-email-colleague", objectives: ["b1-gr-cond", "b1-li-work", "b1-wr-email"] },
    ],
  },
  {
    id: "b1p-c1",
    level: "B1+",
    title: "Reports & Rumours",
    titleFr: "Rapports et rumeurs",
    story: "Le journal de Port Lexis vous recrute comme reporter stagiaire. Il faut décrire, rapporter, citer.",
    boss: { name: "The Echo", title: "L'Écho", lore: "Elle répète tout de travers. Rapportez fidèlement les paroles pour la faire taire.", avatar: "wave" },
    lessons: [
      { id: "b1p-l1", title: "How things are made", titleFr: "Comment c'est fait", grammarTopic: "passive", vocabTheme: "science", vocabCount: 8, listening: "habits-podcast", objectives: ["b1p-gr-passive", "b1p-li-podcast"] },
      { id: "b1p-l2", title: "Who said what?", titleFr: "Qui a dit quoi ?", grammarTopic: "reported-speech", vocabTheme: "social", vocabCount: 8, listening: "airport-problem", speaking: "sp-story-1", objectives: ["b1p-gr-reported", "b1p-li-announcements", "b1p-sp-story"] },
    ],
  },
  {
    id: "b1p-c2",
    level: "B1+",
    title: "Describing the World",
    titleFr: "Décrire le monde",
    story: "Vous rejoignez une entreprise de la ville. Courriers, notes internes, réclamations : il faut être précis.",
    boss: { name: "The Bureaucrat", title: "Le Bureaucrate", lore: "Il rejette tout document mal construit. Vos phrases devront être impeccables.", avatar: "stamp" },
    lessons: [
      { id: "b1p-l3", title: "People, places, things", titleFr: "Personnes, lieux, choses", grammarTopic: "relative-clauses", vocabTheme: "culture", vocabCount: 8, reading: "remote-policy", writing: "w-minutes", objectives: ["b1p-gr-relative", "b1p-re-professional"] },
      { id: "b1p-l4", title: "Likes, plans and complaints", titleFr: "Goûts, projets et réclamations", grammarTopic: "gerunds-infinitives", vocabTheme: "daily", vocabCount: 8, writing: "w-complaint", speaking: "sp-op-1", objectives: ["b1p-gr-gerinf", "b1p-wr-formal"] },
    ],
  },
  {
    id: "b2-c1",
    level: "B2",
    title: "What If?",
    titleFr: "Et si… ?",
    story: "Une tempête menace l'archipel. Le conseil de la ville vous demande d'imaginer les scénarios possibles.",
    boss: { name: "The Regret Wraith", title: "Le Spectre du Regret", lore: "Il se nourrit des « si seulement ». Maîtrisez l'irréel pour le dissiper.", avatar: "ghost" },
    lessons: [
      { id: "b2-l1", title: "Hypotheses and regrets", titleFr: "Hypothèses et regrets", grammarTopic: "conditionals-23", vocabTheme: "society", vocabCount: 8, listening: "news-four-day-week", reading: "fast-fashion", objectives: ["b2-gr-cond", "b2-li-news", "b2-re-article"] },
      { id: "b2-l2", title: "Looking ahead", titleFr: "Se projeter", grammarTopic: "future-perfect", vocabTheme: "environment", vocabCount: 8, writing: "w-essay-tech", speaking: "sp-op-2", objectives: ["b2-gr-future", "b2-wr-essay"] },
    ],
  },
  {
    id: "b2-c2",
    level: "B2",
    title: "Deduction & Persuasion",
    titleFr: "Déduction et persuasion",
    story: "Un mystère agite la Bourse de Port Lexis. Enquêtez, déduisez, convainquez.",
    boss: { name: "The Detective", title: "Le Détective", lore: "Il ne croit que ceux qui déduisent avec rigueur.", avatar: "magnifier" },
    lessons: [
      { id: "b2-l3", title: "It must have been…", titleFr: "Ça a dû être…", grammarTopic: "modals-advanced", vocabTheme: "business", vocabCount: 8, listening: "job-interview", reading: "recommendation-algorithms", speaking: "sp-int-1", objectives: ["b2-gr-modals", "b2-li-interview", "b2-re-tech"] },
      { id: "b2-l4", title: "Making your case", titleFr: "Défendre son point de vue", vocabTheme: "ai", vocabCount: 8, writing: "w-article", speaking: "sp-desc-2", objectives: ["b2-sp-argue", "b2-vo-range"] },
    ],
  },
  {
    id: "b2p-c1",
    level: "B2+",
    title: "The Art of Emphasis",
    titleFr: "L'art de l'emphase",
    story: "Le théâtre de la ville vous demande d'écrire et de prononcer des discours marquants.",
    boss: { name: "The Herald", title: "Le Héraut", lore: "Seuls les orateurs capables de mettre leurs idées en relief peuvent passer.", avatar: "trumpet" },
    lessons: [
      { id: "b2p-l1", title: "Never have I…", titleFr: "Jamais je n'ai…", grammarTopic: "inversion", vocabTheme: "ai", vocabCount: 8, listening: "supplier-negotiation", objectives: ["b2p-gr-emphasis", "b2p-li-work"] },
      { id: "b2p-l2", title: "What really matters is…", titleFr: "Ce qui compte vraiment, c'est…", grammarTopic: "cleft-sentences", vocabTheme: "work", vocabCount: 8, listening: "debate-cars-city", reading: "in-praise-of-boredom", speaking: "sp-deb-1", objectives: ["b2p-gr-emphasis", "b2p-li-debate", "b2p-re-essay", "b2p-sp-debate"] },
    ],
  },
  {
    id: "b2p-c2",
    level: "B2+",
    title: "Building an Argument",
    titleFr: "Construire une argumentation",
    story: "Vous représentez Port Lexis au grand concours d'éloquence de l'archipel.",
    boss: { name: "The Sophist", title: "Le Sophiste", lore: "Il retourne chaque argument mal articulé contre vous.", avatar: "mask" },
    lessons: [
      { id: "b2p-l3", title: "Linking ideas", titleFr: "Articuler ses idées", grammarTopic: "linking-words", vocabTheme: "environment", vocabCount: 8, writing: "w-report", speaking: "sp-arg-1", objectives: ["b2p-gr-linking", "b2p-vo-range"] },
      { id: "b2p-l4", title: "Polish your style", titleFr: "Soigner son style", grammarTopic: "punctuation-style", vocabTheme: "business", vocabCount: 8, writing: "w-proposal", objectives: ["b2p-wr-style"] },
    ],
  },
  {
    id: "c1-c1",
    level: "C1",
    title: "Formal Precision",
    titleFr: "Précision formelle",
    story: "L'Université du Sommet vous invite comme chercheur associé. Le niveau d'exigence est maximal.",
    boss: { name: "The Archivist", title: "L'Archiviste", lore: "Gardienne des textes savants, elle teste chaque nuance de registre.", avatar: "scroll" },
    lessons: [
      { id: "c1-l1", title: "It is essential that…", titleFr: "Il est essentiel que…", grammarTopic: "subjunctive", vocabTheme: "education", vocabCount: 8, listening: "lecture-memory", reading: "gut-microbiome", objectives: ["c1-gr-formal", "c1-li-lecture", "c1-re-science"] },
      { id: "c1-l2", title: "Dense and clear", titleFr: "Dense et clair", grammarTopic: "complex-sentences", vocabTheme: "science", vocabCount: 8, reading: "machine-translation", writing: "w-summary", speaking: "sp-pres-2", objectives: ["c1-gr-complex", "c1-re-academic", "c1-sp-present"] },
    ],
  },
  {
    id: "c1-c2",
    level: "C1",
    title: "The Summit: Nuance",
    titleFr: "Le Sommet : la nuance",
    story: "Dernière ascension. Au sommet, seule la maîtrise des nuances permet de passer.",
    boss: { name: "The Summit Sphinx", title: "Le Sphinx du Sommet", lore: "L'ultime gardien. Il pose ses énigmes dans un anglais d'une grande finesse.", avatar: "sphinx" },
    lessons: [
      { id: "c1-l3", title: "Hedging and distance", titleFr: "Nuancer et prendre du recul", grammarTopic: "nuances", vocabTheme: "culture", vocabCount: 8, listening: "seminar-cities", writing: "w-academic", speaking: "sp-deb-2", objectives: ["c1-gr-nuance", "c1-li-academic", "c1-wr-academic", "c1-vo-range"] },
    ],
  },
];
