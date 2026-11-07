import type { GrammarTopic } from "@/lib/types";
import { itemFactory } from "../builders";

/* =====================================================================
   B2 — Conditionnels irréels, future perfect, modaux avancés
   ===================================================================== */

const cd = itemFactory("g-cond23", "B2", "grammar", "conditionals-23", "b2-gr-cond");
const conditionals23: GrammarTopic = {
  id: "conditionals-23",
  title: "Second, third & mixed conditionals",
  titleFr: "Conditionnels 2, 3 et mixtes (irréel)",
  level: "B2",
  summaryFr: "Imaginer, regretter, refaire le passé : l'hypothèse irréelle.",
  explanationFr: [
    "Le **deuxième conditionnel** (*If + past simple, would + base verbale*) exprime une situation **irréelle ou peu probable au présent / futur** : *If I had more time, I would learn Japanese* (mais je n'ai pas le temps). Avec *be*, la forme soutenue est *If I were* (*If I were you, I'd accept*).",
    "Le **troisième conditionnel** (*If + past perfect, would have + participe passé*) exprime une hypothèse sur le **passé**, qui ne peut plus changer : *If we had left earlier, we wouldn't have missed the flight.* Il sert souvent à exprimer un regret ou une critique.",
    "Le **conditionnel mixte** croise les époques. Passé → présent : *If I had studied medicine, I would be a doctor now.* Présent → passé : *If I weren't so shy, I would have spoken to her yesterday.*",
    "Formes associées : **I wish / If only** + past simple (regret présent), + past perfect (regret passé), + would (agacement) ; **could / might** à la place de *would* pour la possibilité. En style soutenu, l'inversion remplace *if* : *Had I known, I would have called* (voir le cours *Inversion*).",
  ],
  explanationEn: [
    "Second conditional: if + past simple, would + infinitive — hypothetical present or future. Third conditional: if + past perfect, would have + past participle — hypothetical past.",
    "Mixed conditionals combine a past condition with a present result, or a present condition with a past result. Wish and if only express regret with the same backshift.",
  ],
  forms: [
    { label: "Second", pattern: "If + past simple, would + verb", example: "If I won the lottery, I'd travel the world." },
    { label: "Third", pattern: "If + had + p.p., would have + p.p.", example: "If she had applied, she would have got the job." },
    { label: "Mixed (past → now)", pattern: "If + had + p.p., would + verb", example: "If I had taken that job, I'd live in London now." },
    { label: "Wish (past regret)", pattern: "I wish + had + p.p.", example: "I wish I had listened to you." },
  ],
  examples: [
    { en: "If I were in your position, I'd ask for a pay rise.", fr: "À ta place, je demanderais une augmentation." },
    { en: "We would have won if the referee hadn't made that mistake.", fr: "Nous aurions gagné si l'arbitre n'avait pas fait cette erreur." },
    { en: "If he had saved more money, he wouldn't be in debt now.", fr: "S'il avait épargné davantage, il ne serait pas endetté aujourd'hui.", note: "mixte" },
    { en: "I wish I could speak Spanish.", fr: "J'aimerais savoir parler espagnol." },
  ],
  mistakes: [
    { wrong: "If I would have known, I would have come.", right: "If I had known, I would have come.", why: "Jamais would dans la subordonnée en if : on utilise le past perfect." },
    { wrong: "If I would be rich, I would buy a boat.", right: "If I were rich, I would buy a boat.", why: "Le deuxième conditionnel utilise le past simple après if (were pour be)." },
    { wrong: "I wish I have more free time.", right: "I wish I had more free time.", why: "wish + past simple pour un regret au présent." },
  ],
  exercises: {
    easy: [
      cd.at("easy").mcq("If I ___ you, I'd take the job.", ["am", "were", "would be"], 1),
      cd.gap("If she ___ (have) a car, she would drive to work.", [["had"]]),
      cd.mcq("If we had booked earlier, we ___ a better seat.", ["would get", "would have got", "will get"], 1),
      cd.gap("I wish I ___ (live) closer to the sea.", [["lived"]]),
    ],
    medium: [
      cd.at("medium").correct("If you would have asked me, I would have helped you.", ["If you had asked me, I would have helped you."]),
      cd.gap("If I ___ (not / miss) the bus, I ___ (not / be) late for the interview.", [["hadn't missed", "had not missed"], ["wouldn't have been", "would not have been"]]),
      cd.transform("I don't have enough money, so I can't buy a house.", ["If I had enough money, I could buy a house.", "If I had enough money, I would buy a house."], { frame: "If I ___", instruction: "Reformulez avec un conditionnel." }),
      cd.mcq("If I had studied law, I ___ a lawyer now.", ["would have been", "would be", "will be"], 1, "Conditionnel mixte : cause passée, conséquence présente."),
    ],
    hard: [
      cd.at("hard").transform("I regret not learning to play an instrument.", ["I wish I had learnt to play an instrument.", "I wish I had learned to play an instrument."], { keyword: "wish", instruction: "Reformulez en utilisant le mot donné." }),
      cd.transform("She isn't organised, so she missed the deadline.", ["If she were more organised, she wouldn't have missed the deadline.", "If she was more organised, she wouldn't have missed the deadline.", "If she were organised, she wouldn't have missed the deadline.", "If she were more organized, she wouldn't have missed the deadline."], { frame: "If she were ___", instruction: "Conditionnel mixte (présent → passé)." }),
      cd.gap("If only you ___ (tell) me earlier! Now it's too late.", [["had told", "'d told"]]),
      cd.free(
        "Décrivez une décision importante de votre vie : que se serait-il passé si vous aviez fait un autre choix ? Que seriez-vous aujourd'hui ? (6 phrases)",
        "Troisième conditionnel, conditionnel mixte, I wish / if only.",
        80,
        "If I hadn't moved to Lyon after my degree, I would never have met my partner. I'd probably still be living with my parents, and I wouldn't be working in IT now. Sometimes I wish I had travelled more before starting work, though.",
      ),
    ],
  },
  exam: [
    cd.at("medium").gap("If I ___ (know) the answer, I would tell you.", [["knew"]]),
    cd.gap("We ___ (not / get) lost if we had taken the map.", [["wouldn't have got", "would not have got", "wouldn't have gotten", "would not have gotten"]]),
    cd.mcq("If he hadn't been so rude, she ___ to him now.", ["would talk", "would have talked", "talks"], 0),
    cd.correct("I wish I didn't eat so much last night.", ["I wish I hadn't eaten so much last night.", "I wish I had not eaten so much last night."]),
    cd.transform("I didn't know about the strike, so I went to the station.", ["If I had known about the strike, I wouldn't have gone to the station.", "If I'd known about the strike, I wouldn't have gone to the station.", "If I had known about the strike, I would not have gone to the station."], { frame: "If I had ___", instruction: "Troisième conditionnel." }),
    cd.mcq("What ___ if you lost your job tomorrow?", ["will you do", "would you do", "would you have done"], 1),
  ],
};

const fp = itemFactory("g-futperf", "B2", "grammar", "future-perfect", "b2-gr-future");
const futurePerfect: GrammarTopic = {
  id: "future-perfect",
  title: "Future perfect & future continuous",
  titleFr: "Future perfect et future continuous",
  level: "B2",
  summaryFr: "Se projeter : ce qui sera en cours ou accompli à un moment futur.",
  explanationFr: [
    "Le **future continuous** (*will be + -ing*) décrit une action **en cours à un moment précis du futur** : *This time tomorrow, I'll be flying to Montreal.* Il sert aussi à demander poliment des projets : *Will you be using the car tonight?*",
    "Le **future perfect** (*will have + participe passé*) décrit une action **accomplie avant** un moment futur : *By 2030, we will have reduced our emissions by 40%.* Le marqueur typique est **by** (d'ici, au plus tard) : *by Friday, by the time you arrive, by then*.",
    "Le **future perfect continuous** (*will have been + -ing*) insiste sur la **durée** jusqu'à un moment futur : *In June, I'll have been working here for ten years.*",
    "Après *by the time / when* (sens futur), on garde le présent : *By the time you get here, we'll have finished.*",
  ],
  explanationEn: [
    "Use the future continuous for actions in progress at a future time; the future perfect for actions completed before a future time (often with by); the future perfect continuous for duration up to a future point.",
  ],
  forms: [
    { label: "Future continuous", pattern: "will be + verb-ing", example: "At 10, I'll be presenting our results." },
    { label: "Future perfect", pattern: "will have + p.p.", example: "By noon, they'll have signed the deal." },
    { label: "Future perfect continuous", pattern: "will have been + verb-ing", example: "By May, she'll have been training for a year." },
  ],
  examples: [
    { en: "Don't call at 8 — we'll be having dinner.", fr: "N'appelle pas à 20h, on sera en train de dîner." },
    { en: "By the end of the course, you'll have learnt 2,000 words.", fr: "À la fin du cours, vous aurez appris 2 000 mots." },
    { en: "Next month I'll have been living abroad for five years.", fr: "Le mois prochain, cela fera cinq ans que je vis à l'étranger." },
  ],
  mistakes: [
    { wrong: "By next year I will finish my degree.", right: "By next year I will have finished my degree.", why: "by + moment futur → action accomplie avant : future perfect." },
    { wrong: "By the time you will arrive, we'll have left.", right: "By the time you arrive, we'll have left.", why: "Présent après by the time à valeur future." },
    { wrong: "At 9 tomorrow I'll work.", right: "At 9 tomorrow I'll be working.", why: "Action en cours à un moment précis du futur → future continuous." },
  ],
  exercises: {
    easy: [
      fp.at("easy").mcq("By Friday, I ___ the report.", ["will finish", "will have finished", "finish"], 1),
      fp.mcq("This time next week, we ___ on the beach.", ["will lie", "will be lying", "will have lain"], 1),
      fp.gap("By 2035, scientists ___ (find) a cure, I hope.", [["will have found"]]),
      fp.gap("Don't phone at 3 — I ___ (sit) an exam.", [["'ll be sitting", "will be sitting"]]),
    ],
    medium: [
      fp.at("medium").correct("By the time you will read this, I'll have left.", ["By the time you read this, I'll have left.", "By the time you read this, I will have left."]),
      fp.gap("In September, she ___ (teach) for twenty years.", [["will have been teaching", "'ll have been teaching"]]),
      fp.mcq("___ the projector this afternoon? If not, I'll borrow it.", ["Will you use", "Will you be using", "Will you have used"], 1, "Question polie sur des projets → future continuous."),
      fp.gap("Hurry up! By the time we get there, the film ___ (start).", [["will have started", "'ll have started"]]),
    ],
    hard: [
      fp.at("hard").transform("The builders will finish the house before the end of May.", ["The builders will have finished the house by the end of May.", "The house will have been finished by the end of May."], { keyword: "by", instruction: "Reformulez avec by." }),
      fp.transform("I started this job in 2019. It will be seven years next month.", ["Next month I will have been working in this job for seven years.", "Next month I'll have been working in this job for seven years.", "Next month I will have worked in this job for seven years.", "Next month I'll have worked in this job for seven years."], { frame: "Next month I will have ___", instruction: "Future perfect (continuous)." }),
      fp.correct("Tomorrow at noon I will have flown over the Atlantic.", ["Tomorrow at noon I will be flying over the Atlantic.", "Tomorrow at noon I'll be flying over the Atlantic."], "En cours à midi → future continuous."),
      fp.free(
        "Imaginez votre vie dans 10 ans : que serez-vous en train de faire, qu'aurez-vous accompli ? (5 phrases)",
        "future continuous, future perfect, by + date.",
        60,
        "In ten years I'll be running my own consultancy. By then, I'll have reached C1 in English and I'll have worked on projects in at least three countries. I'll probably be living near the coast.",
      ),
    ],
  },
  exam: [
    fp.at("medium").gap("By the time he retires, he ___ (work) here for 40 years.", [["will have worked", "will have been working", "'ll have worked", "'ll have been working"]]),
    fp.mcq("At 8 pm I ___ the match, so text me instead.", ["will watch", "will be watching", "watch"], 1),
    fp.gap("We ___ (pay) off the loan by 2030.", [["will have paid", "'ll have paid"]]),
    fp.correct("By the end of the day, I will write ten emails.", ["By the end of the day, I will have written ten emails.", "By the end of the day, I'll have written ten emails."]),
    fp.mcq("By the time you ___, I'll have cooked dinner.", ["will arrive", "arrive", "will have arrived"], 1),
    fp.gap("Don't worry, I ___ (not / forget) by tomorrow.", [["won't have forgotten", "will not have forgotten"]]),
  ],
};

const md = itemFactory("g-modals", "B2", "grammar", "modals-advanced", "b2-gr-modals");
const modalsAdvanced: GrammarTopic = {
  id: "modals-advanced",
  title: "Advanced modal verbs",
  titleFr: "Modaux avancés : déduction, passé, obligation",
  level: "B2",
  summaryFr: "Exprimer certitude, probabilité, reproche et nécessité avec nuance.",
  explanationFr: [
    "**Déduction au présent** : *must* (certitude positive : il doit être…), *can't* (certitude négative : ce n'est pas possible), *might / may / could* (possibilité). *She must be at home — her car is outside.* *He can't be serious!*",
    "**Déduction au passé** : modal + **have + participe passé**. *They must have missed the train* (ils ont dû rater le train), *She can't have forgotten* (elle n'a pas pu oublier), *He might have got lost* (il s'est peut-être perdu).",
    "**Reproche / regret** : *should have + p.p.* (aurait dû), *shouldn't have* (n'aurait pas dû), *could have* (aurait pu — possibilité non réalisée). *You should have told me!*",
    "**Nécessité** : *must* (obligation venant du locuteur) vs *have to* (obligation extérieure) ; *mustn't* = interdiction, mais *don't have to* = absence d'obligation. *needn't have + p.p.* = on l'a fait, mais c'était inutile ; *didn't need to* = ce n'était pas nécessaire (souvent pas fait).",
  ],
  explanationEn: [
    "Use must, can't, might, may and could for deductions about the present; add have + past participle for deductions about the past.",
    "Should have / could have express criticism, regret and unrealised possibilities. Distinguish mustn't (prohibition) from don't have to (no obligation), and needn't have done (done, but unnecessary).",
  ],
  forms: [
    { label: "Present deduction", pattern: "must / can't / might + verb", example: "You must be exhausted." },
    { label: "Past deduction", pattern: "must / can't / might + have + p.p.", example: "She must have left early." },
    { label: "Criticism", pattern: "should(n't) have + p.p.", example: "We should have checked the forecast." },
    { label: "Unnecessary past action", pattern: "needn't have + p.p.", example: "You needn't have brought wine — we had plenty." },
  ],
  examples: [
    { en: "The lights are off. They must have gone to bed.", fr: "Les lumières sont éteintes. Ils ont dû aller se coucher." },
    { en: "That can't be the right address — it's a car park.", fr: "Ça ne peut pas être la bonne adresse, c'est un parking." },
    { en: "You could have hurt yourself!", fr: "Tu aurais pu te blesser !" },
    { en: "You don't have to come, but you mustn't tell anyone.", fr: "Tu n'es pas obligé de venir, mais tu ne dois le dire à personne." },
  ],
  mistakes: [
    { wrong: "He must forgot his keys.", right: "He must have forgotten his keys.", why: "Déduction au passé : must + have + participe passé." },
    { wrong: "You mustn't pay — it's free.", right: "You don't have to pay — it's free.", why: "mustn't = interdiction ; absence d'obligation = don't have to." },
    { wrong: "She can't have be ill.", right: "She can't have been ill.", why: "have est suivi du participe passé (been)." },
  ],
  exercises: {
    easy: [
      md.at("easy").mcq("He's been working for 14 hours. He ___ be exhausted.", ["can't", "must", "mustn't"], 1),
      md.mcq("You ___ wear a suit — the dress code is casual.", ["mustn't", "don't have to", "can't"], 1),
      md.gap("She ___ (might / be) in a meeting. Try again later.", [["might be"]]),
      md.mcq("That ___ be Tom — he's in Australia this week.", ["can't", "must", "should"], 0),
    ],
    medium: [
      md.at("medium").gap("The road is wet. It ___ (must / rain) during the night.", [["must have rained"]]),
      md.correct("You should told me you were coming.", ["You should have told me you were coming."]),
      md.mcq("I can't find my wallet. I ___ it in the taxi.", ["might leave", "might have left", "must leave"], 1),
      md.gap("He ___ (can't / see) us — he didn't even wave.", [["can't have seen", "cannot have seen", "couldn't have seen"]]),
    ],
    hard: [
      md.at("hard").transform("It was unnecessary for you to buy flowers, but thank you.", ["You needn't have bought flowers, but thank you."], { keyword: "needn't", instruction: "Reformulez en utilisant le mot donné." }),
      md.transform("I'm sure she didn't take your phone.", ["She can't have taken your phone.", "She couldn't have taken your phone."], { keyword: "taken", instruction: "Reformulez avec un modal de déduction." }),
      md.transform("It was a mistake to sell the house.", ["We shouldn't have sold the house.", "We should not have sold the house.", "I shouldn't have sold the house.", "They shouldn't have sold the house."], { keyword: "shouldn't", instruction: "Reformulez en utilisant le mot donné." }),
      md.free(
        "Une collègue n'est pas venue à une réunion importante et ne répond pas. Faites 5 hypothèses et 1 reproche.",
        "must / might / can't have + p.p., should have.",
        50,
        "She must have forgotten about the meeting, or she might have been stuck in traffic. She can't have been ill — I saw her this morning. Her phone may have run out of battery. Still, she should have warned someone.",
      ),
    ],
  },
  exam: [
    md.at("medium").mcq("They ___ arrived by now — the flight landed two hours ago.", ["must have", "can't have", "should"], 0),
    md.gap("You ___ (not / have to) print the ticket — the app is enough.", [["don't have to", "do not have to"]]),
    md.correct("He mustn't have heard the alarm — he slept through it.", ["He can't have heard the alarm — he slept through it.", "He couldn't have heard the alarm — he slept through it."]),
    md.gap("We ___ (could / win) if we had trained harder.", [["could have won"]]),
    md.mcq("Visitors ___ smoke anywhere in the building — it's against the law.", ["don't have to", "mustn't", "needn't"], 1),
    md.transform("Perhaps he missed the email.", ["He might have missed the email.", "He may have missed the email.", "He could have missed the email."], { keyword: "might", instruction: "Reformulez." }),
  ],
};

export const grammarB2 = [conditionals23, futurePerfect, modalsAdvanced];
