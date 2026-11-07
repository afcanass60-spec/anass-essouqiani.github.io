import type { GrammarTopic } from "@/lib/types";
import { itemFactory } from "../builders";

/* =====================================================================
   B1+ — Passif, discours indirect, relatives, gérondif / infinitif
   ===================================================================== */

const pa = itemFactory("g-passive", "B1+", "grammar", "passive", "b1p-gr-passive");
const passive: GrammarTopic = {
  id: "passive",
  title: "The passive voice",
  titleFr: "La voix passive",
  level: "B1+",
  summaryFr: "Mettre l'accent sur l'action ou son résultat plutôt que sur son auteur.",
  explanationFr: [
    "Le passif se forme avec **be** conjugué au temps voulu + **participe passé**. C'est le verbe *be* qui porte le temps : *is made, was made, has been made, will be made, is being made*.",
    "On l'utilise quand l'auteur de l'action est **inconnu, évident ou sans importance**, ou quand on veut mettre en valeur le résultat : *The bridge was built in 1890.* C'est très fréquent dans les textes techniques, scientifiques, journalistiques et professionnels.",
    "L'agent s'introduit avec **by** seulement s'il apporte une information utile : *The novel was written by a 19-year-old student.*",
    "Particularités : **get** + participe passé au passif informel (*He got promoted*) ; le passif des verbes à deux compléments (*I was given a laptop*) ; les tournures impersonnelles **It is said that… / He is thought to be…** (on dit que…, on pense que…). Le français utilise souvent « on » là où l'anglais utilise le passif.",
  ],
  explanationEn: [
    "Form the passive with be in the appropriate tense plus the past participle. Use it when the agent is unknown, obvious or unimportant, or when the focus is the process or result.",
    "Reporting structures such as It is believed that… or She is said to be… are common in formal writing and news reports.",
  ],
  forms: [
    { label: "Present", pattern: "am/is/are + p.p.", example: "Thousands of emails are sent every second." },
    { label: "Past", pattern: "was/were + p.p.", example: "The meeting was postponed." },
    { label: "Present perfect", pattern: "has/have been + p.p.", example: "Your order has been shipped." },
    { label: "Modal", pattern: "modal + be + p.p.", example: "The form must be signed." },
    { label: "Continuous", pattern: "is/was being + p.p.", example: "The road is being repaired." },
  ],
  examples: [
    { en: "English is spoken in many countries.", fr: "On parle anglais dans de nombreux pays." },
    { en: "The suspect has been arrested.", fr: "Le suspect a été arrêté." },
    { en: "I was offered a job in Dublin.", fr: "On m'a proposé un poste à Dublin.", note: "passif avec la personne en sujet" },
    { en: "The company is said to be in financial difficulty.", fr: "On dit que l'entreprise est en difficulté financière." },
  ],
  mistakes: [
    { wrong: "The house was build in 1920.", right: "The house was built in 1920.", why: "Il faut le participe passé (built), pas la base verbale." },
    { wrong: "It was happened yesterday.", right: "It happened yesterday.", why: "happen est intransitif (pas de complément d'objet) : il n'a pas de passif." },
    { wrong: "The results will publish next week.", right: "The results will be published next week.", why: "Avec un modal, le passif est modal + be + participe passé." },
  ],
  exercises: {
    easy: [
      pa.at("easy").mcq("This cheese ___ in Normandy.", ["makes", "is made", "is making"], 1),
      pa.gap("The letters ___ (deliver) every morning.", [["are delivered"]]),
      pa.gap("The Eiffel Tower ___ (build) in 1889.", [["was built"]]),
      pa.mcq("Your password must ___ every three months.", ["change", "be changed", "been changed"], 1),
    ],
    medium: [
      pa.at("medium").transform("Someone has stolen my bike.", ["My bike has been stolen."], { instruction: "Mettez la phrase au passif (sans agent)." }),
      pa.transform("They are repairing the lift.", ["The lift is being repaired."], { instruction: "Mettez la phrase au passif (sans agent)." }),
      pa.correct("The accident was happened at midnight.", ["The accident happened at midnight."]),
      pa.gap("I ___ (give) a warm welcome when I joined the team.", [["was given"]]),
    ],
    hard: [
      pa.at("hard").transform("People believe that the painting is a fake.", ["The painting is believed to be a fake.", "It is believed that the painting is a fake."], { instruction: "Reformulez avec une structure impersonnelle (believe)." }),
      pa.transform("They say the CEO resigned last night.", ["The CEO is said to have resigned last night.", "It is said that the CEO resigned last night."], { frame: "The CEO is said ___", instruction: "Reformulez." }),
      pa.transform("They will have finished the new stadium by 2028.", ["The new stadium will have been finished by 2028."], { instruction: "Mettez la phrase au passif." }),
      pa.free(
        "Décrivez en 5 phrases comment un produit que vous connaissez est fabriqué ou livré (processus).",
        "Passif à différents temps, by uniquement si utile.",
        60,
        "First, the coffee beans are harvested by hand. They are then dried in the sun and shipped to Europe, where they are roasted. Finally, the coffee is packaged and delivered to shops.",
      ),
    ],
  },
  exam: [
    pa.at("medium").gap("The new rules ___ (introduce) next January.", [["will be introduced", "are going to be introduced", "are being introduced"]]),
    pa.mcq("The keys ___ in the office yesterday.", ["found", "were found", "have been found"], 1),
    pa.transform("Somebody is cleaning the windows.", ["The windows are being cleaned."], { instruction: "Passif." }),
    pa.correct("A lot of mistakes have been make.", ["A lot of mistakes have been made."]),
    pa.gap("He ___ (think) to be the best surgeon in the country.", [["is thought"]]),
    pa.mcq("All applicants ___ by email within ten days.", ["will contact", "will be contacted", "will be contacting"], 1),
  ],
};

const rs = itemFactory("g-reported", "B1+", "grammar", "reported-speech", "b1p-gr-reported");
const reportedSpeech: GrammarTopic = {
  id: "reported-speech",
  title: "Reported speech",
  titleFr: "Le discours indirect",
  level: "B1+",
  summaryFr: "Rapporter des paroles, des questions et des ordres avec précision.",
  explanationFr: [
    "Quand le verbe introducteur est au passé (*said, told, asked*), on **recule généralement les temps** d'un cran : présent → passé, present perfect / past simple → past perfect, will → would, can → could, must → had to.",
    "Les repères changent aussi : *today → that day, tomorrow → the next day / the following day, yesterday → the day before, here → there, this → that, ago → before*.",
    "**say** s'emploie sans complément de personne (*She said that…*), **tell** exige un complément (*She told me that…*). Pour les questions : *He asked me where I lived* — **ordre affirmatif, pas d'auxiliaire do** ; pour les questions fermées : *He asked if / whether I was ready*.",
    "Ordres et demandes : *tell / ask someone (not) to do something*. Les verbes de rapport enrichissent le style : *suggest, recommend, admit, deny, warn, insist, promise, refuse, remind*. Si l'information est toujours vraie, le recul des temps est facultatif : *She said she lives in Lyon.*",
  ],
  explanationEn: [
    "In reported speech after a past reporting verb, tenses usually move one step back and time/place references change.",
    "Reported questions use statement word order without do/does/did. Use a range of reporting verbs (admit, suggest, warn, deny) to report the speaker's intention precisely.",
  ],
  forms: [
    { label: "Statement", pattern: "say (that) / tell sb (that) + backshift", example: "He said (that) he was tired." },
    { label: "Wh- question", pattern: "ask + wh- + subject + verb", example: "She asked where the station was." },
    { label: "Yes/no question", pattern: "ask + if/whether + subject + verb", example: "They asked if I could help." },
    { label: "Command", pattern: "tell/ask sb (not) to + verb", example: "He told us not to worry." },
    { label: "Reporting verbs", pattern: "suggest + -ing / admit + -ing / warn sb not to…", example: "She suggested taking a break." },
  ],
  examples: [
    { en: "\"I'm leaving tomorrow.\" → She said she was leaving the next day.", fr: "Elle a dit qu'elle partait le lendemain." },
    { en: "\"Have you seen my phone?\" → He asked me if I had seen his phone.", fr: "Il m'a demandé si j'avais vu son téléphone." },
    { en: "\"Don't touch the screen.\" → The technician told us not to touch the screen.", fr: "Le technicien nous a dit de ne pas toucher l'écran." },
    { en: "\"I didn't take the money.\" → He denied taking the money.", fr: "Il a nié avoir pris l'argent." },
  ],
  mistakes: [
    { wrong: "She said me that she was busy.", right: "She told me (that) she was busy.", why: "say n'a pas de complément de personne direct ; tell en exige un." },
    { wrong: "He asked me where did I live.", right: "He asked me where I lived.", why: "Dans une question indirecte, ordre sujet-verbe et pas d'auxiliaire do." },
    { wrong: "She suggested me to go.", right: "She suggested that I (should) go. / She suggested going.", why: "suggest ne se construit pas avec complément + to." },
  ],
  exercises: {
    easy: [
      rs.at("easy").mcq("She ___ me that she was tired.", ["said", "told", "asked"], 1),
      rs.gap("\"I like jazz.\" → He said he ___ jazz.", [["liked"]]),
      rs.gap("\"I will help you.\" → She said she ___ help me.", [["would"]]),
      rs.mcq("\"Where do you work?\" → He asked me where ___.", ["do I work", "I worked", "did I work"], 1),
    ],
    medium: [
      rs.at("medium").transform("\"Are you coming to the party?\" Tom asked me.", ["Tom asked me if I was coming to the party.", "Tom asked me whether I was coming to the party."], { instruction: "Passez au discours indirect." }),
      rs.transform("\"Don't be late,\" the teacher said to us.", ["The teacher told us not to be late."], { instruction: "Passez au discours indirect (tell)." }),
      rs.correct("He asked me what time was it.", ["He asked me what time it was."]),
      rs.gap("\"We moved here two years ago.\" → They said they ___ (move) there two years ___.", [["had moved"], ["before", "earlier"]]),
    ],
    hard: [
      rs.at("hard").transform("\"Why don't we take a taxi?\" said Anna.", ["Anna suggested taking a taxi.", "Anna suggested that we take a taxi.", "Anna suggested that we should take a taxi."], { keyword: "suggested", instruction: "Utilisez le verbe donné." }),
      rs.transform("\"I'm sorry I broke your glasses,\" said Leo.", ["Leo apologised for breaking my glasses.", "Leo apologized for breaking my glasses.", "Leo apologised for having broken my glasses.", "Leo apologized for having broken my glasses."], { keyword: "apologised", instruction: "Utilisez le verbe donné (apologised for + -ing)." }),
      rs.transform("\"Don't swim here — the current is dangerous,\" the lifeguard said to us.", ["The lifeguard warned us not to swim there because the current was dangerous.", "The lifeguard warned us not to swim there as the current was dangerous."], { keyword: "warned", instruction: "Utilisez le verbe donné." }),
      rs.free(
        "Rapportez une conversation récente (réunion, appel, discussion) en 5 phrases au discours indirect, avec au moins 3 verbes de rapport différents.",
        "Recul des temps, questions indirectes, verbes de rapport (suggest, admit, promise, warn…).",
        60,
        "During the meeting, my manager asked whether we had finished the report. I admitted that we were a week behind. She suggested hiring a freelancer and promised she would approve the budget the following day.",
      ),
    ],
  },
  exam: [
    rs.at("medium").gap("\"I can't swim.\" → She said she ___ swim.", [["couldn't", "could not"]]),
    rs.mcq("He asked me ___ I had ever been to Ireland.", ["that", "whether", "what"], 1),
    rs.transform("\"Close the door, please,\" she said to me.", ["She asked me to close the door.", "She told me to close the door."], { instruction: "Discours indirect." }),
    rs.correct("They told that the flight was delayed.", ["They said that the flight was delayed.", "They told us that the flight was delayed.", "They told me that the flight was delayed.", "They said the flight was delayed."]),
    rs.transform("\"I didn't cheat in the exam,\" said Max.", ["Max denied cheating in the exam.", "Max denied having cheated in the exam."], { keyword: "denied", instruction: "Utilisez le verbe donné." }),
    rs.gap("\"I'll see you tomorrow.\" → He said he would see me ___ ___ ___.", [["the"], ["next", "following"], ["day"]]),
  ],
};

const rc = itemFactory("g-relative", "B1+", "grammar", "relative-clauses", "b1p-gr-relative");
const relativeClauses: GrammarTopic = {
  id: "relative-clauses",
  title: "Relative clauses",
  titleFr: "Les propositions relatives",
  level: "B1+",
  summaryFr: "Définir ou compléter une information avec who, which, that, whose, where.",
  explanationFr: [
    "**who** pour les personnes, **which** pour les choses, **that** pour les deux (seulement dans les relatives *déterminatives*), **whose** pour la possession (dont le / la), **where** pour un lieu, **when** pour un moment.",
    "Une relative **déterminative** (*defining*) est indispensable pour identifier de qui ou de quoi on parle : *The colleague who helped me is on holiday.* Pas de virgules.",
    "Une relative **explicative** (*non-defining*) ajoute une information supplémentaire, entre **virgules** ; *that* y est interdit : *My manager, who is French, speaks four languages.* *which* peut aussi reprendre toute une proposition : *He missed the train, which annoyed him.*",
    "Dans une déterminative, on peut **omettre le pronom quand il est complément** : *The book (that) I'm reading is brilliant.* Mais pas quand il est sujet : *The man who lives next door…* En style soutenu, la préposition se place avant *whom/which* : *the person to whom I spoke* ; en style courant, à la fin : *the person I spoke to*.",
  ],
  explanationEn: [
    "Defining relative clauses identify the noun and take no commas; that is possible and the pronoun can be omitted when it is the object. Non-defining clauses add extra information, use commas and never take that.",
    "Whose shows possession; where and when refer to places and times. Which can refer back to a whole clause.",
  ],
  forms: [
    { label: "Defining (subject)", pattern: "noun + who/which/that + verb", example: "People who exercise sleep better." },
    { label: "Defining (object)", pattern: "noun + (that/which/who) + subject + verb", example: "The app (that) I use is free." },
    { label: "Non-defining", pattern: "noun, who/which + clause,", example: "Lyon, which is my hometown, is famous for food." },
    { label: "Possession", pattern: "noun + whose + noun", example: "The student whose essay won is from Lille." },
  ],
  examples: [
    { en: "That's the restaurant where we had our first date.", fr: "C'est le restaurant où nous avons eu notre premier rendez-vous." },
    { en: "I have a friend whose father is an astronaut.", fr: "J'ai un ami dont le père est astronaute." },
    { en: "She passed all her exams, which surprised everyone.", fr: "Elle a réussi tous ses examens, ce qui a surpris tout le monde." },
    { en: "The person I spoke to was very helpful.", fr: "La personne à qui j'ai parlé a été très serviable.", note: "pronom omis, préposition finale" },
  ],
  mistakes: [
    { wrong: "My sister, that lives in Paris, is a doctor.", right: "My sister, who lives in Paris, is a doctor.", why: "that est interdit dans une relative explicative (entre virgules)." },
    { wrong: "The man which called you is here.", right: "The man who called you is here.", why: "Pour une personne : who (ou that)." },
    { wrong: "He failed the test, what disappointed him.", right: "He failed the test, which disappointed him.", why: "Pour reprendre toute une proposition : which (« ce qui »)." },
  ],
  exercises: {
    easy: [
      rc.at("easy").mcq("The woman ___ lives upstairs is a pilot.", ["which", "who", "whose"], 1),
      rc.mcq("This is the hotel ___ we stayed last year.", ["which", "where", "who"], 1),
      rc.gap("I met a man ___ brother works with you.", [["whose"]]),
      rc.mcq("The phone ___ I bought last week has already broken.", ["who", "whose", "that"], 2),
    ],
    medium: [
      rc.at("medium").correct("Paris, that is the capital of France, attracts millions of tourists.", ["Paris, which is the capital of France, attracts millions of tourists."]),
      rc.transform("I'm reading a book. My friend recommended it.", ["I'm reading a book my friend recommended.", "I'm reading a book that my friend recommended.", "I'm reading a book which my friend recommended.", "I am reading a book my friend recommended.", "I am reading a book that my friend recommended.", "I am reading a book which my friend recommended."], { instruction: "Combinez les deux phrases avec une relative." }),
      rc.gap("She didn't call me back, ___ was strange.", [["which"]]),
      rc.mcq("Is that the colleague ___ you were talking about?", ["(nothing)", "whose", "where"], 0, "Le pronom complément peut être omis : the colleague you were talking about."),
    ],
    hard: [
      rc.at("hard").transform("The candidate was hired. Her references were excellent.", ["The candidate whose references were excellent was hired."], { instruction: "Combinez avec whose." }),
      rc.transform("The professor I wrote to never replied.", ["The professor to whom I wrote never replied."], { instruction: "Réécrivez en style formel (préposition + whom)." }),
      rc.correct("The day when I met her it was raining.", ["The day when I met her, it was raining.", "The day I met her, it was raining.", "On the day I met her, it was raining."], "Il faut séparer la relative de la proposition principale ; ne répétez pas le sujet de façon ambiguë."),
      rc.free(
        "Présentez votre ville ou votre entreprise en 5 phrases, avec au moins une relative explicative, une déterminative et whose.",
        "Relatives déterminatives / explicatives, ponctuation, whose, where, which reprenant une proposition.",
        60,
        "Rennes, which is the capital of Brittany, is a lively student city. The district where I live is full of small cafés. I work for a company whose clients are mainly hospitals, which means our work really matters.",
      ),
    ],
  },
  exam: [
    rc.at("medium").mcq("The report, ___ was published yesterday, is very critical.", ["that", "which", "what"], 1),
    rc.gap("Do you know anyone ___ speaks Japanese?", [["who", "that"]]),
    rc.gap("That's the café ___ I usually work on Fridays.", [["where"]]),
    rc.correct("The candidate who's CV I read was impressive.", ["The candidate whose CV I read was impressive."]),
    rc.transform("We visited a village. My grandmother was born there.", ["We visited the village where my grandmother was born.", "We visited a village where my grandmother was born."], { instruction: "Combinez avec where." }),
    rc.mcq("He gave me some advice, ___ was very useful.", ["what", "which", "that"], 1),
  ],
};

const gi = itemFactory("g-gerinf", "B1+", "grammar", "gerunds-infinitives", "b1p-gr-gerinf");
const gerundsInfinitives: GrammarTopic = {
  id: "gerunds-infinitives",
  title: "Gerunds and infinitives",
  titleFr: "Gérondif (-ing) ou infinitif (to) ?",
  level: "B1+",
  summaryFr: "Savoir quelle forme suit un verbe, une préposition ou un adjectif.",
  explanationFr: [
    "Certains verbes sont suivis de **-ing** : *enjoy, avoid, mind, finish, suggest, consider, keep, practise, deny, risk, can't stand*. D'autres de **to + base verbale** : *want, decide, hope, plan, agree, refuse, manage, afford, promise, expect*.",
    "Après une **préposition**, on utilise toujours **-ing** : *interested in learning, good at solving, before leaving, instead of complaining*. Attention : dans *look forward to*, *be used to*, *object to*, **to est une préposition** → *I look forward to hearing from you.*",
    "Certains verbes changent de **sens** : *remember / forget + -ing* (souvenir d'une action passée) vs *+ to* (se souvenir de faire quelque chose) ; *stop smoking* (arrêter de fumer) vs *stop to smoke* (s'arrêter pour fumer) ; *try opening the window* (essayer, comme expérience) vs *try to open* (faire un effort).",
    "Le gérondif peut être **sujet** de la phrase : *Learning a language takes time.* L'infinitif exprime le **but** : *I came here to learn.*",
  ],
  explanationEn: [
    "Some verbs take -ing, others take to-infinitive, and some take both with a change in meaning (remember, forget, stop, try, regret).",
    "After prepositions, always use the -ing form. Remember that 'to' is a preposition in look forward to, be used to, get used to and object to.",
  ],
  forms: [
    { label: "Verb + -ing", pattern: "enjoy / avoid / suggest + -ing", example: "I avoid driving at night." },
    { label: "Verb + to", pattern: "decide / manage / refuse + to + verb", example: "She managed to fix it." },
    { label: "Preposition + -ing", pattern: "preposition + -ing", example: "Thanks for helping me." },
    { label: "Meaning change", pattern: "stop/remember/try + -ing vs to", example: "Remember to lock the door." },
  ],
  examples: [
    { en: "I'm looking forward to meeting you.", fr: "J'ai hâte de vous rencontrer." },
    { en: "We can't afford to lose this client.", fr: "Nous ne pouvons pas nous permettre de perdre ce client." },
    { en: "I remember visiting this museum as a child.", fr: "Je me souviens d'avoir visité ce musée enfant." },
    { en: "He stopped to answer the phone.", fr: "Il s'est arrêté pour répondre au téléphone." },
  ],
  mistakes: [
    { wrong: "I look forward to hear from you.", right: "I look forward to hearing from you.", why: "Dans look forward to, to est une préposition → -ing." },
    { wrong: "She suggested to go to the beach.", right: "She suggested going to the beach.", why: "suggest est suivi de -ing (ou de that…)." },
    { wrong: "I'm used to work late.", right: "I'm used to working late.", why: "be used to (être habitué à) + -ing." },
  ],
  exercises: {
    easy: [
      gi.at("easy").mcq("I enjoy ___ in the mountains.", ["to walk", "walking", "walk"], 1),
      gi.mcq("They decided ___ a new car.", ["buying", "to buy", "buy"], 1),
      gi.gap("She's good at ___ (solve) problems.", [["solving"]]),
      gi.gap("We hope ___ (see) you soon.", [["to see"]]),
    ],
    medium: [
      gi.at("medium").correct("Would you mind to open the window?", ["Would you mind opening the window?"]),
      gi.gap("Don't forget ___ (send) me the invoice.", [["to send"]]),
      gi.mcq("I'll never forget ___ the Northern Lights for the first time.", ["to see", "seeing", "see"], 1, "Souvenir d'une expérience passée → -ing."),
      gi.gap("He finally managed ___ (convince) his boss.", [["to convince"]]),
    ],
    hard: [
      gi.at("hard").transform("It's not easy for me to get up early.", ["I'm not used to getting up early.", "I am not used to getting up early."], { keyword: "used", instruction: "Reformulez en utilisant le mot donné." }),
      gi.transform("\"Let's postpone the launch,\" said the manager.", ["The manager suggested postponing the launch."], { keyword: "suggested", instruction: "Utilisez le verbe donné." }),
      gi.gap("I regret ___ (tell) you that your application has been unsuccessful. I really regret ___ (not / study) harder at school.", [["to tell", "to inform"], ["not studying", "not having studied"]], "regret to = annonce formelle ; regret + -ing = regretter une action passée."),
      gi.free(
        "Écrivez 5 phrases sur vos goûts et vos objectifs d'apprentissage en utilisant au moins 3 verbes + -ing et 3 verbes + to.",
        "enjoy/avoid/keep + -ing ; want/hope/decide + to ; préposition + -ing.",
        50,
        "I really enjoy watching series in English, but I avoid using French subtitles. I've decided to read one article a day, and I hope to reach C1 next year. I'm interested in improving my pronunciation.",
      ),
    ],
  },
  exam: [
    gi.at("medium").gap("She refused ___ (answer) the question.", [["to answer"]]),
    gi.mcq("I'm thinking of ___ jobs.", ["change", "to change", "changing"], 2),
    gi.correct("I'm looking forward to see you.", ["I'm looking forward to seeing you.", "I am looking forward to seeing you."]),
    gi.mcq("We stopped ___ a coffee on the way.", ["having", "to have", "have"], 1, "S'arrêter pour (but)."),
    gi.gap("___ (learn) a language requires patience.", [["Learning"]]),
    gi.gap("Try ___ (restart) the computer — that often fixes it.", [["restarting"]], "try + -ing = faire un essai pour voir le résultat."),
  ],
};

export const grammarB1Plus = [passive, reportedSpeech, relativeClauses, gerundsInfinitives];
