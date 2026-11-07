import type { GrammarTopic } from "@/lib/types";
import { itemFactory } from "../builders";

/* =====================================================================
   B1 — Consolidation : temps, present perfect, récit, futur, conditionnels
   ===================================================================== */

const tr = itemFactory("g-tenses", "B1", "grammar", "tenses-review", "b1-gr-tenses");
const tensesReview: GrammarTopic = {
  id: "tenses-review",
  title: "The English tense system",
  titleFr: "Panorama des temps anglais",
  level: "B1",
  summaryFr: "Comprendre la logique aspect simple / continu / parfait pour choisir le bon temps.",
  explanationFr: [
    "En anglais, un temps combine une **époque** (passé, présent, futur) et un **aspect**. L'aspect **simple** présente un fait global ou habituel ; l'aspect **continu** (be + -ing) présente une action en cours, temporaire ou inachevée ; l'aspect **parfait** (have + participe passé) relie deux moments : une action antérieure et son lien avec un point de référence.",
    "Le **present simple** exprime les habitudes, les vérités générales et les états (I *work* in Lyon). Le **present continuous** exprime ce qui se passe maintenant ou temporairement (I*'m working* from home this week).",
    "Le **past simple** décrit une action terminée à un moment précis du passé (I *moved* in 2019). Le **past continuous** décrit l'arrière-plan, une action en cours dans le passé (I *was cooking* when you called).",
    "Les **verbes d'état** (know, believe, want, belong, seem…) ne se mettent normalement pas à la forme continue : on dit *I know*, jamais *I'm knowing*.",
  ],
  explanationEn: [
    "English tenses combine time (past, present, future) with aspect. Simple aspect presents an action as a complete fact or habit. Continuous aspect (be + -ing) shows an action in progress, temporary or unfinished. Perfect aspect (have + past participle) connects an earlier action with a later point of reference.",
    "Choosing the right tense is less about translating from French and more about asking: is this a habit, a temporary situation, a finished event, or something connected to now?",
  ],
  forms: [
    { label: "Present simple", pattern: "subject + base verb (+s)", example: "She works in finance." },
    { label: "Present continuous", pattern: "am/is/are + verb-ing", example: "She's working on a new report." },
    { label: "Past simple", pattern: "verb-ed / irregular past", example: "We met in 2018." },
    { label: "Past continuous", pattern: "was/were + verb-ing", example: "It was raining when we left." },
  ],
  examples: [
    { en: "Water boils at 100 °C.", fr: "L'eau bout à 100 °C.", note: "vérité générale → present simple" },
    { en: "I'm staying with my cousin until I find a flat.", fr: "Je loge chez mon cousin jusqu'à ce que je trouve un appartement.", note: "situation temporaire" },
    { en: "While I was waiting for the bus, I read the news.", fr: "Pendant que j'attendais le bus, j'ai lu les infos.", note: "arrière-plan + action ponctuelle" },
    { en: "This bag belongs to Tom.", fr: "Ce sac appartient à Tom.", note: "verbe d'état : pas de -ing" },
  ],
  mistakes: [
    { wrong: "I am knowing the answer.", right: "I know the answer.", why: "know est un verbe d'état : il ne se met pas à la forme continue." },
    { wrong: "Every morning I am taking the train.", right: "Every morning I take the train.", why: "Une habitude s'exprime au present simple." },
    { wrong: "When I arrived, they had dinner.", right: "When I arrived, they were having dinner.", why: "Pour une action en cours au moment d'un événement passé, on utilise le past continuous." },
  ],
  exercises: {
    easy: [
      tr.at("easy").mcq("Look! It ___ again.", ["rains", "is raining", "rained"], 1, "« Look! » signale une action en cours maintenant → present continuous."),
      tr.gap("My brother ___ (work) in a bank. He's been there for years.", [["works"]], "Situation stable → present simple, 3e personne : -s."),
      tr.mcq("I ___ my keys yesterday.", ["lose", "was losing", "lost"], 2, "Action terminée, moment précis (yesterday) → past simple."),
      tr.gap("I ___ (not / understand) what you mean.", [["don't understand", "do not understand"]], "understand est un verbe d'état → present simple."),
    ],
    medium: [
      tr.at("medium").gap("When the phone rang, I ___ (have) a shower.", [["was having"]], "Action en cours interrompue → past continuous."),
      tr.gap("She usually ___ (drive) to work, but this week she ___ (take) the bus.", [["drives"], ["is taking", "'s taking"]], "Habitude vs situation temporaire."),
      tr.correct("I am wanting a new laptop.", ["I want a new laptop."], "want est un verbe d'état."),
      tr.mcq("What ___ at 8 pm last night? I called but you didn't answer.", ["did you do", "were you doing", "do you do"], 1, "Action en cours à un moment précis du passé."),
    ],
    hard: [
      tr.at("hard").gap("I ___ (think) about changing jobs. I ___ (think) it's time.", [["'m thinking", "am thinking"], ["think"]], "think = réfléchir (action, -ing possible) vs think = penser/croire (état)."),
      tr.correct("While I walked home, I was seeing an accident.", ["While I was walking home, I saw an accident."], "L'arrière-plan est au past continuous, l'événement ponctuel au past simple."),
      tr.order(["the", "kids", "were", "playing", "while", "we", "were", "cooking"], ["the kids were playing while we were cooking", "while we were cooking the kids were playing"], "Deux actions simultanées en cours → past continuous des deux côtés."),
      tr.free(
        "Décrivez en 4 à 6 phrases votre routine habituelle puis ce qui est différent cette semaine.",
        "Opposer present simple (habitudes) et present continuous (situation temporaire).",
        50,
        "Normally I get up at seven and take the metro to work. This week, however, I'm working from home because the office is being renovated, so I'm getting up later and I'm cycling in the afternoon.",
      ),
    ],
  },
  exam: [
    tr.at("medium").mcq("Prices ___ every year.", ["are rising", "rise", "rose"], 1, "Vérité générale / tendance habituelle."),
    tr.gap("I ___ (read) an interesting book at the moment.", [["'m reading", "am reading"]]),
    tr.gap("We ___ (watch) TV when the lights ___ (go) out.", [["were watching"], ["went"]]),
    tr.correct("Do you understand? — Yes, I am understanding.", ["Do you understand? — Yes, I understand."]),
    tr.mcq("This coffee ___ delicious.", ["tastes", "is tasting", "tasting"], 0, "taste = avoir un goût (état)."),
    tr.gap("Where ___ you ___ (live) when you were a student?", [["did"], ["live"]]),
  ],
};

const pp = itemFactory("g-pp", "B1", "grammar", "present-perfect", "b1-gr-pp");
const presentPerfect: GrammarTopic = {
  id: "present-perfect",
  title: "Present perfect vs past simple",
  titleFr: "Present perfect ou past simple ?",
  level: "B1",
  summaryFr: "Relier le passé au présent : expérience, résultat, durée jusqu'à maintenant.",
  explanationFr: [
    "Le **present perfect** (have/has + participe passé) relie une action passée au **moment présent**. On ne s'intéresse pas au *moment* de l'action, mais à son lien avec maintenant : une expérience (*I've been to Japan*), un résultat visible (*I've lost my keys*, je ne les ai toujours pas), une durée qui continue (*I've lived here for five years*, j'y vis encore).",
    "Le **past simple** situe une action dans un **passé terminé**, coupé du présent, souvent avec un repère précis : *yesterday, last year, in 2019, two days ago, when I was a child*. Dès qu'il y a un repère de temps passé et terminé, le present perfect est impossible.",
    "**for** + durée (for three years) ; **since** + point de départ (since 2020, since Monday). Attention, le français dit « j'habite ici depuis 5 ans » au présent, mais l'anglais exige *I have lived / I have been living here for 5 years*.",
    "Le **present perfect continuous** (have been + -ing) insiste sur la durée ou l'activité elle-même : *I've been working all day* (je suis fatigué), alors que *I've written three emails* insiste sur le résultat chiffré.",
  ],
  explanationEn: [
    "Use the present perfect when the time of the action is not important or not finished, and the action is connected to now: life experience, recent events with present results, and situations that started in the past and continue.",
    "Use the past simple for finished actions at a definite time in the past. Time expressions such as yesterday, last week, in 2015 or ago require the past simple.",
  ],
  forms: [
    { label: "Affirmative", pattern: "have/has + past participle", example: "She has finished the project." },
    { label: "Question", pattern: "Have/Has + subject + past participle?", example: "Have you ever worked abroad?" },
    { label: "Continuous", pattern: "have/has been + verb-ing", example: "They've been waiting for an hour." },
    { label: "Past simple contrast", pattern: "verb-ed + finished time", example: "She finished it last Friday." },
  ],
  examples: [
    { en: "I've never tried sushi.", fr: "Je n'ai jamais goûté de sushis.", note: "expérience de vie" },
    { en: "She has just left the office.", fr: "Elle vient de quitter le bureau.", note: "just = venir de" },
    { en: "We've known each other since university.", fr: "Nous nous connaissons depuis la fac.", note: "état qui continue" },
    { en: "I saw that film last week.", fr: "J'ai vu ce film la semaine dernière.", note: "repère passé terminé → past simple" },
    { en: "Have you finished yet? — Not yet.", fr: "Tu as fini ? — Pas encore.", note: "yet en question/négation" },
  ],
  mistakes: [
    { wrong: "I live here since 2018.", right: "I've lived here since 2018.", why: "Avec since/for et une situation qui dure jusqu'à maintenant, le français utilise le présent, l'anglais le present perfect." },
    { wrong: "I have seen him yesterday.", right: "I saw him yesterday.", why: "yesterday est un moment passé terminé : present perfect impossible." },
    { wrong: "How long are you working here?", right: "How long have you been working here?", why: "How long + durée jusqu'à maintenant → present perfect (continuous)." },
  ],
  exercises: {
    easy: [
      pp.at("easy").mcq("I ___ to Canada twice.", ["went", "have been", "am"], 1, "Expérience de vie sans moment précis → present perfect."),
      pp.gap("She ___ (work) here since 2021.", [["has worked", "'s worked", "has been working", "'s been working"]], "since + point de départ → present perfect."),
      pp.mcq("We ___ the contract last Monday.", ["have signed", "signed", "sign"], 1, "last Monday = passé terminé → past simple."),
      pp.gap("Have you ___ (ever / eat) Indian food?", [["ever eaten"]], "ever se place avant le participe passé."),
    ],
    medium: [
      pp.at("medium").gap("I ___ (lose) my phone. I can't find it anywhere.", [["'ve lost", "have lost"]], "Résultat présent (je ne le trouve pas) → present perfect."),
      pp.gap("He ___ (move) to Berlin three years ago and he ___ (live) there ever since.", [["moved"], ["has lived", "'s lived", "has been living", "'s been living"]], "ago → past simple ; ever since → present perfect."),
      pp.correct("I know her for ten years.", ["I've known her for ten years.", "I have known her for ten years."], "for + durée jusqu'à maintenant, avec un verbe d'état → present perfect simple."),
      pp.mcq("You look exhausted! What ___?", ["have you been doing", "did you do", "do you do"], 0, "Conséquence visible d'une activité qui a duré → present perfect continuous."),
    ],
    hard: [
      pp.at("hard").transform("I started learning English five years ago.", ["I have been learning English for five years.", "I've been learning English for five years.", "I have learnt English for five years.", "I've learnt English for five years.", "I have learned English for five years.", "I've learned English for five years."], { frame: "I have ___ for five years.", instruction: "Reformulez avec for." }),
      pp.transform("This is the first time I've flown business class.", ["I have never flown business class before.", "I've never flown business class before."], { keyword: "never", instruction: "Reformulez en utilisant le mot donné." }),
      pp.gap("I ___ (write) three chapters so far, but I ___ (write) since six this morning, so I need a break.", [["'ve written", "have written"], ["'ve been writing", "have been writing"]], "Résultat chiffré → simple ; durée de l'activité → continuous."),
      pp.free(
        "Présentez votre parcours professionnel ou scolaire en 5 phrases en combinant present perfect et past simple.",
        "Opposer événements datés (past simple) et expérience/durée jusqu'à maintenant (present perfect, for/since).",
        60,
        "I studied computer science in Rennes and graduated in 2020. Then I joined a small start-up, where I worked on mobile apps. I've been working as a network technician since 2022, and I've already managed two major migrations.",
      ),
    ],
  },
  exam: [
    pp.at("medium").mcq("Sorry I'm late. ___ long?", ["Did you wait", "Have you been waiting", "Are you waiting"], 1),
    pp.gap("I ___ (not / see) Paul since his wedding.", [["haven't seen", "have not seen"]]),
    pp.gap("When ___ you ___ (start) your new job?", [["did"], ["start"]]),
    pp.correct("She has graduated in 2019.", ["She graduated in 2019."]),
    pp.transform("It's ages since we last spoke.", ["We haven't spoken for ages.", "We have not spoken for ages.", "We haven't spoken in ages."], { keyword: "for", instruction: "Reformulez en utilisant le mot donné." }),
    pp.mcq("I ___ this book three times. It's my favourite.", ["have been reading", "have read", "read"], 1, "Nombre de fois → present perfect simple."),
  ],
};

const pf = itemFactory("g-pastperf", "B1", "grammar", "past-perfect", "b1-gr-narrative");
const pastPerfect: GrammarTopic = {
  id: "past-perfect",
  title: "Past perfect & narrative tenses",
  titleFr: "Past perfect et temps du récit",
  level: "B1",
  summaryFr: "Raconter une histoire en hiérarchisant les événements : avant, pendant, après.",
  explanationFr: [
    "Le **past perfect** (had + participe passé) exprime une action **antérieure** à un autre moment du passé. C'est l'équivalent du plus-que-parfait français : *When I arrived, the train had left* (il était déjà parti avant mon arrivée).",
    "Dans un récit, on combine trois temps : le **past simple** pour la suite des événements principaux, le **past continuous** pour le décor et les actions en cours, le **past perfect** pour revenir en arrière.",
    "On ne met pas le past perfect partout : si l'ordre est évident (avec *after*, *before*, ou une simple chronologie), le past simple suffit. Le past perfect est indispensable quand l'ordre des événements serait sinon ambigu.",
    "Le **past perfect continuous** (had been + -ing) insiste sur la durée d'une activité avant un moment passé : *She was tired because she had been running.*",
  ],
  explanationEn: [
    "Use the past perfect to show that one past action happened before another past action or time. It helps the listener 'go back' in a story.",
    "Narratives typically use the past simple for main events, the past continuous for background, and the past perfect for earlier events.",
  ],
  forms: [
    { label: "Past perfect", pattern: "had + past participle", example: "They had already eaten." },
    { label: "Past perfect continuous", pattern: "had been + verb-ing", example: "He had been working there for years." },
    { label: "Typical markers", pattern: "already, just, never…before, by the time", example: "By the time we arrived, the show had started." },
  ],
  examples: [
    { en: "I didn't recognise her because she had changed so much.", fr: "Je ne l'ai pas reconnue car elle avait tellement changé." },
    { en: "By the time the police arrived, the thieves had escaped.", fr: "Quand la police est arrivée, les voleurs s'étaient enfuis." },
    { en: "It was the first time I had ever seen snow.", fr: "C'était la première fois que je voyais de la neige.", note: "first time + passé → past perfect" },
    { en: "We had been driving for hours when the car broke down.", fr: "Nous roulions depuis des heures quand la voiture est tombée en panne." },
  ],
  mistakes: [
    { wrong: "When I got to the station, the train already left.", right: "When I got to the station, the train had already left.", why: "Le départ du train est antérieur à mon arrivée : past perfect." },
    { wrong: "I had gone to the cinema yesterday.", right: "I went to the cinema yesterday.", why: "Sans autre repère passé, le past perfect n'a pas de raison d'être." },
    { wrong: "She was tired because she has worked all day.", right: "She was tired because she had been working all day.", why: "Dans un récit au passé, le present perfect devient past perfect." },
  ],
  exercises: {
    easy: [
      pf.at("easy").mcq("When we arrived, the film ___.", ["already started", "had already started", "has already started"], 1),
      pf.gap("She ___ (never / fly) before her trip to Rome.", [["had never flown", "'d never flown"]]),
      pf.mcq("I was hungry because I ___ breakfast.", ["didn't have", "hadn't had", "haven't had"], 1),
      pf.gap("They ___ (leave) by the time I got there.", [["had left", "'d left"]]),
    ],
    medium: [
      pf.at("medium").gap("I ___ (walk) home when I ___ (realise) I ___ (forget) my bag at the café.", [["was walking"], ["realised", "realized"], ["had forgotten", "'d forgotten"]], "décor (past continuous), événement (past simple), antériorité (past perfect)."),
      pf.correct("After he had finished, he has gone to bed.", ["After he had finished, he went to bed."]),
      pf.mcq("Her eyes were red. She ___.", ["had been crying", "has cried", "cried"], 0, "Conséquence visible d'une activité antérieure qui a duré."),
      pf.gap("It was the best meal I ___ (ever / have).", [["had ever had", "'d ever had"]]),
    ],
    hard: [
      pf.at("hard").transform("I arrived at the party. Most guests left before that.", ["By the time I arrived at the party, most guests had left."], { frame: "By the time I ___", instruction: "Combinez les deux phrases." }),
      pf.transform("He started working there in 2010. He was promoted in 2020.", ["He had been working there for ten years when he was promoted.", "He had worked there for ten years when he was promoted."], { frame: "He had ___ when he was promoted.", instruction: "Combinez avec for." }),
      pf.correct("I didn't know the city because I never was there before.", ["I didn't know the city because I had never been there before."]),
      pf.free(
        "Racontez en 6 à 8 phrases un voyage ou une journée qui ne s'est pas passée comme prévu.",
        "Utiliser past simple, past continuous et past perfect dans un récit cohérent.",
        80,
        "Last summer I was travelling to Lisbon when everything went wrong. I had booked my flight months earlier, but when I got to the airport I discovered that it had been cancelled...",
      ),
    ],
  },
  exam: [
    pf.at("medium").gap("When I opened the fridge, I saw that someone ___ (eat) my yoghurt.", [["had eaten", "'d eaten"]]),
    pf.mcq("While she ___ dinner, the doorbell rang.", ["had cooked", "was cooking", "cooked"], 1),
    pf.correct("By the time we got there, the shop closed.", ["By the time we got there, the shop had closed."]),
    pf.gap("We were exhausted because we ___ (walk) for hours.", [["had been walking", "'d been walking"]]),
    pf.mcq("I ___ him before, so I didn't know what he looked like.", ["never met", "had never met", "have never met"], 1),
    pf.order(["she", "had", "already", "left", "when", "I", "called"], ["she had already left when i called", "when i called she had already left"]),
  ],
};

const fu = itemFactory("g-future", "B1", "grammar", "future-forms", "b1-gr-future");
const futureForms: GrammarTopic = {
  id: "future-forms",
  title: "Talking about the future",
  titleFr: "Exprimer le futur : will, going to, present continuous",
  level: "B1",
  summaryFr: "Choisir la forme du futur selon l'intention, la décision ou l'organisation.",
  explanationFr: [
    "L'anglais n'a pas un seul futur : la forme dépend de ce que vous voulez dire. **will** exprime une décision prise sur le moment (*I'll get it!*), une promesse, une offre, ou une prédiction fondée sur une opinion (*I think it will rain*).",
    "**be going to** exprime une **intention déjà décidée** (*I'm going to look for a new job*) ou une prédiction fondée sur un indice présent (*Look at those clouds — it's going to rain*).",
    "Le **present continuous** exprime un **arrangement organisé** avec d'autres personnes, souvent avec une date (*I'm meeting the client on Tuesday*). Le **present simple** sert aux horaires officiels (*The train leaves at 6.15*).",
    "Après **when, as soon as, before, after, until** à valeur future, on utilise le présent : *I'll call you when I arrive* (et non *when I will arrive*).",
  ],
  explanationEn: [
    "Use will for spontaneous decisions, offers, promises and opinions about the future; be going to for plans and evidence-based predictions; the present continuous for fixed arrangements; and the present simple for timetables.",
    "In time clauses introduced by when, as soon as, until, before and after, use a present tense to refer to the future.",
  ],
  forms: [
    { label: "will", pattern: "will + base verb", example: "I'll send you the file tonight." },
    { label: "be going to", pattern: "am/is/are going to + base verb", example: "We're going to redesign the website." },
    { label: "Arrangement", pattern: "present continuous + time", example: "She's flying to Madrid on Friday." },
    { label: "Timetable", pattern: "present simple", example: "The conference starts at 9." },
  ],
  examples: [
    { en: "The phone's ringing. — Don't worry, I'll answer it.", fr: "Le téléphone sonne. — T'inquiète, je réponds.", note: "décision spontanée" },
    { en: "I'm going to take a year off to travel.", fr: "Je vais prendre une année sabbatique pour voyager.", note: "intention" },
    { en: "We're having dinner with the Martins on Saturday.", fr: "On dîne chez les Martin samedi.", note: "arrangement" },
    { en: "Let me know as soon as you hear from them.", fr: "Préviens-moi dès que tu as de leurs nouvelles.", note: "présent après as soon as" },
  ],
  mistakes: [
    { wrong: "I will call you when I will arrive.", right: "I'll call you when I arrive.", why: "Après when (sens futur), on utilise le présent." },
    { wrong: "I meet my dentist tomorrow at 10.", right: "I'm seeing my dentist tomorrow at 10.", why: "Un rendez-vous organisé s'exprime au present continuous." },
    { wrong: "Look at that car! It will crash!", right: "Look at that car! It's going to crash!", why: "Prédiction fondée sur un indice visible → going to." },
  ],
  exercises: {
    easy: [
      fu.at("easy").mcq("— I'm cold. — ___ close the window.", ["I'm going to", "I'll", "I close"], 1, "Offre / décision immédiate → will."),
      fu.mcq("We've decided: we ___ buy a flat next year.", ["will", "are going to", "buy"], 1, "Intention déjà décidée."),
      fu.gap("The train ___ (leave) at 7.45 tomorrow.", [["leaves"]], "Horaire officiel → present simple."),
      fu.gap("I'll text you as soon as I ___ (get) home.", [["get"]]),
    ],
    medium: [
      fu.at("medium").gap("I ___ (meet) the new manager at three o'clock — it's in my diary.", [["'m meeting", "am meeting"]]),
      fu.correct("Before you will leave, please turn off the lights.", ["Before you leave, please turn off the lights."]),
      fu.mcq("The sky's getting dark. It ___.", ["will rain", "is going to rain", "rains"], 1),
      fu.mcq("— I've failed my driving test again. — Don't worry, I'm sure you ___ next time.", ["will pass", "are passing", "pass"], 0, "Opinion / encouragement → will."),
    ],
    hard: [
      fu.at("hard").gap("— Have you decided about the job offer? — Yes, I ___ (accept) it. I ___ (tell) them on Monday — we have a meeting at 10.", [["'m going to accept", "am going to accept"], ["'m telling", "am telling"]]),
      fu.correct("I promise I am telling nobody.", ["I promise I'll tell nobody.", "I promise I will tell nobody.", "I promise I won't tell anybody.", "I promise I won't tell anyone."]),
      fu.transform("My plan is to study data science next year.", ["I'm going to study data science next year.", "I am going to study data science next year."], { keyword: "going", instruction: "Reformulez en utilisant le mot donné." }),
      fu.free(
        "Décrivez vos projets pour l'année prochaine : une intention, un rendez-vous déjà fixé et une prédiction.",
        "going to (intention), present continuous (arrangement), will (prédiction/opinion), présent après when.",
        60,
        "Next year I'm going to apply for a master's degree. I'm meeting a careers adviser on 12 March to discuss it. I think it will be hard, but when I finish, I'll have much better opportunities.",
      ),
    ],
  },
  exam: [
    fu.at("medium").mcq("Watch out! You ___ fall!", ["will", "are going to", "fall"], 1),
    fu.gap("— There's no milk. — Really? I ___ (buy) some on my way home.", [["'ll buy", "will buy"]]),
    fu.gap("We can't come on Sunday. We ___ (visit) my grandparents.", [["'re visiting", "are visiting", "'re going to visit", "are going to visit"]]),
    fu.correct("I'll wait here until you will come back.", ["I'll wait here until you come back.", "I will wait here until you come back."]),
    fu.mcq("The museum ___ at 6 pm on weekdays.", ["is closing", "closes", "will be close"], 1),
    fu.gap("Do you think people ___ (live) on Mars one day?", [["will live"]]),
  ],
};

const c1 = itemFactory("g-cond01", "B1", "grammar", "conditionals-01", "b1-gr-cond");
const conditionals01: GrammarTopic = {
  id: "conditionals-01",
  title: "Zero & first conditionals",
  titleFr: "Conditionnels 0 et 1 (réel)",
  level: "B1",
  summaryFr: "Exprimer des vérités générales et des conséquences probables.",
  explanationFr: [
    "Le **conditionnel zéro** (*If + présent, présent*) exprime une vérité générale ou un fait toujours vrai : *If you heat ice, it melts.* *If* peut souvent être remplacé par *when*.",
    "Le **premier conditionnel** (*If + présent, will + base verbale*) exprime une condition **réelle et probable** dans le futur : *If it rains tomorrow, we'll cancel the picnic.* Comme en français (« s'il pleut, nous annulerons »), on ne met **jamais will après if** dans ce sens.",
    "**unless** = *if not* (à moins que) : *We'll be late unless we leave now.* On peut aussi utiliser *as long as / provided that* (à condition que), *in case* (au cas où, par précaution).",
    "La subordonnée peut venir en premier (avec une virgule) ou en second (sans virgule).",
  ],
  explanationEn: [
    "Zero conditional: if + present, present — for facts and things that are always true. First conditional: if + present, will + verb — for real, likely situations in the future.",
    "Unless means 'if not'. In case means 'as a precaution against something that might happen'.",
  ],
  forms: [
    { label: "Zero", pattern: "If + present simple, present simple", example: "If you press this button, the machine stops." },
    { label: "First", pattern: "If + present simple, will + verb", example: "If you finish early, you'll get a bonus." },
    { label: "Unless", pattern: "unless + present (= if … not)", example: "I won't go unless you come with me." },
    { label: "In case", pattern: "in case + present", example: "Take an umbrella in case it rains." },
  ],
  examples: [
    { en: "If customers are unhappy, they leave bad reviews.", fr: "Si les clients sont mécontents, ils laissent de mauvais avis.", note: "vérité générale" },
    { en: "If you send me the slides, I'll check them tonight.", fr: "Si tu m'envoies les slides, je les vérifierai ce soir." },
    { en: "You won't improve unless you practise every day.", fr: "Tu ne progresseras pas à moins de t'entraîner tous les jours." },
    { en: "I'll take my laptop in case I need to work on the train.", fr: "Je prends mon ordi au cas où je devrais travailler dans le train." },
  ],
  mistakes: [
    { wrong: "If it will rain, we will stay home.", right: "If it rains, we'll stay home.", why: "Pas de will après if dans le premier conditionnel." },
    { wrong: "Unless you don't hurry, you'll miss the bus.", right: "Unless you hurry, you'll miss the bus.", why: "unless est déjà négatif : pas de double négation." },
    { wrong: "Take a coat if it gets cold.", right: "Take a coat in case it gets cold.", why: "Pour une précaution, on utilise in case." },
  ],
  exercises: {
    easy: [
      c1.at("easy").mcq("If you mix blue and yellow, you ___ green.", ["get", "will got", "got"], 0, "Fait toujours vrai → conditionnel zéro."),
      c1.gap("If she ___ (call), I'll tell her the news.", [["calls"]]),
      c1.gap("If we leave now, we ___ (catch) the train.", [["'ll catch", "will catch"]]),
      c1.mcq("I won't sign the contract ___ they change this clause.", ["if", "unless", "in case"], 1),
    ],
    medium: [
      c1.at("medium").correct("If you will need help, call me.", ["If you need help, call me."]),
      c1.gap("___ you water the plants, they will die.", [["Unless", "If you don't"]], "Notez : on peut dire Unless you water… ou If you don't water…", "Un mot ou plusieurs"),
      c1.mcq("Save your work regularly ___ the computer crashes.", ["unless", "in case", "if not"], 1),
      c1.gap("If the price ___ (go) up again, we ___ (look) for another supplier.", [["goes"], ["'ll look", "will look"]]),
    ],
    hard: [
      c1.at("hard").transform("You must book in advance or you won't get a table.", ["Unless you book in advance, you won't get a table.", "You won't get a table unless you book in advance."], { keyword: "unless", instruction: "Reformulez en utilisant le mot donné." }),
      c1.transform("I'll lend you my car, but you must drive carefully.", ["I'll lend you my car as long as you drive carefully.", "I will lend you my car as long as you drive carefully."], { keyword: "long", instruction: "Reformulez en utilisant le mot donné." }),
      c1.correct("In case you don't understand, ask me — I'll explain it.", ["If you don't understand, ask me — I'll explain it."], "Ici il s'agit d'une condition (si), pas d'une précaution."),
      c1.free(
        "Rédigez 4 règles ou conseils pour un nouveau collègue en utilisant if, unless et in case.",
        "Conditionnels 0/1, unless, in case — sans will après if.",
        50,
        "If you arrive before 8, the main door is locked, so use the side entrance. Unless your manager says otherwise, you can work from home on Fridays. Keep a copy of your files in case the network goes down.",
      ),
    ],
  },
  exam: [
    c1.at("medium").gap("If you ___ (not / hurry), you'll miss the beginning.", [["don't hurry", "do not hurry"]]),
    c1.mcq("Plants die ___ they don't get enough light.", ["if", "unless", "in case"], 0),
    c1.correct("I'll call you if I will have time.", ["I'll call you if I have time.", "I will call you if I have time."]),
    c1.mcq("Bring some cash ___ the restaurant doesn't accept cards.", ["unless", "in case", "as long as"], 1),
    c1.gap("We ___ (not / start) the meeting unless everyone is here.", [["won't start", "will not start"]]),
    c1.transform("If you don't apologise, she won't forgive you.", ["Unless you apologise, she won't forgive you.", "Unless you apologize, she won't forgive you.", "She won't forgive you unless you apologise.", "She won't forgive you unless you apologize."], { keyword: "unless", instruction: "Reformulez en utilisant le mot donné." }),
  ],
};

export const grammarB1 = [tensesReview, presentPerfect, pastPerfect, futureForms, conditionals01];
