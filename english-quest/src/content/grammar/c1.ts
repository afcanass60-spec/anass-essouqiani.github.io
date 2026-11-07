import type { GrammarTopic } from "@/lib/types";
import { itemFactory } from "../builders";

/* =====================================================================
   C1 — Subjonctif, structures complexes, nuances
   ===================================================================== */

const sj = itemFactory("g-subj", "C1", "grammar", "subjunctive", "c1-gr-formal");
const subjunctive: GrammarTopic = {
  id: "subjunctive",
  title: "The subjunctive and formal hypotheticals",
  titleFr: "Le subjonctif et l'irréel formel",
  level: "C1",
  summaryFr: "It is essential that he be… / It's high time we left / as if, would rather.",
  explanationFr: [
    "Le **subjonctif présent** anglais est simplement la **base verbale**, identique à toutes les personnes (pas de -s, *be* reste *be*). Il apparaît après des verbes et adjectifs de recommandation ou d'exigence : *suggest, recommend, insist, demand, request, propose* ; *essential, vital, crucial, important, imperative*. *The committee recommends that the policy **be** reviewed.* *It is vital that she **attend** the meeting.*",
    "La négation se place avant la base verbale, sans *do* : *We insisted that he **not** be informed.* En anglais britannique courant, on utilise souvent *should* : *It is essential that she should attend.* L'indicatif (*that she attends*) existe à l'oral britannique mais reste moins soutenu.",
    "Le **subjonctif passé / irréel** (*were* à toutes les personnes) : *If I were you…, as if he were the boss, I wish it were Friday.*",
    "Structures d'irréel à connaître : **It's (high / about) time + past simple** (*It's high time we changed our approach* : il est grand temps que…) ; **would rather + sujet + past simple** (*I'd rather you didn't smoke here*) ; **as if / as though** + past (*He talks as if he knew everything*) ; **suppose / supposing** + past (*Suppose you lost your job, what would you do?*).",
  ],
  explanationEn: [
    "The mandative subjunctive uses the base form for all persons after verbs and adjectives of necessity or recommendation (insist, suggest, essential). Negatives use not + base form.",
    "Unreal past forms follow it's time, would rather (with a different subject), as if and wish.",
  ],
  forms: [
    { label: "Mandative", pattern: "suggest / insist / essential that + S + base verb", example: "They demanded that the CEO resign." },
    { label: "Negative", pattern: "that + S + not + base verb", example: "I recommend that he not sign yet." },
    { label: "It's time", pattern: "It's (high) time + S + past simple", example: "It's high time you learnt to cook." },
    { label: "Would rather", pattern: "would rather + S + past simple", example: "I'd rather you told me the truth." },
  ],
  examples: [
    { en: "The doctor insisted that he rest for a week.", fr: "Le médecin a insisté pour qu'il se repose une semaine." },
    { en: "It is imperative that every employee be trained.", fr: "Il est impératif que chaque salarié soit formé." },
    { en: "It's about time we went home.", fr: "Il serait temps qu'on rentre." },
    { en: "She behaves as though nothing had happened.", fr: "Elle se comporte comme si de rien n'était." },
  ],
  mistakes: [
    { wrong: "The board suggested that she resigns.", right: "The board suggested that she resign. / … that she should resign.", why: "Après suggest (recommandation), subjonctif (base verbale) ou should." },
    { wrong: "It's time we go.", right: "It's time we went. / It's time to go.", why: "It's time + sujet + past simple (irréel)." },
    { wrong: "I'd rather you don't tell anyone.", right: "I'd rather you didn't tell anyone.", why: "would rather + autre sujet + past simple." },
  ],
  exercises: {
    easy: [
      sj.at("easy").mcq("It is essential that every candidate ___ on time.", ["arrives", "arrive", "arrived"], 1),
      sj.mcq("It's high time we ___ a decision.", ["make", "made", "will make"], 1),
      sj.mcq("I'd rather you ___ the car tonight.", ["don't take", "didn't take", "not take"], 1),
      sj.gap("If I ___ (be) the minister, I would change this law.", [["were"]]),
    ],
    medium: [
      sj.at("medium").correct("The lawyer recommended that he signs nothing.", ["The lawyer recommended that he sign nothing.", "The lawyer recommended that he should sign nothing."]),
      sj.gap("We requested that the meeting ___ (postpone).", [["be postponed", "should be postponed"]]),
      sj.mcq("He spends money as if he ___ a millionaire.", ["is", "were", "be"], 1),
      sj.gap("They insisted that she ___ (not / be) told until the contract was signed.", [["not be", "should not be"]]),
    ],
    hard: [
      sj.at("hard").transform("You should really get a new phone.", ["It's high time you got a new phone.", "It is high time you got a new phone.", "It's time you got a new phone.", "It's about time you got a new phone."], { keyword: "time", instruction: "Reformulez avec It's (high) time." }),
      sj.transform("Please don't mention this to my parents.", ["I'd rather you didn't mention this to my parents.", "I would rather you didn't mention this to my parents.", "I would rather you did not mention this to my parents."], { keyword: "rather", instruction: "Reformulez." }),
      sj.transform("The union demanded a pay rise for all staff.", ["The union demanded that all staff be given a pay rise.", "The union demanded that all staff should be given a pay rise.", "The union demanded that all staff receive a pay rise."], { frame: "The union demanded that all staff ___", instruction: "Utilisez le subjonctif." }),
      sj.free(
        "Rédigez 4 recommandations formelles pour la conclusion d'un rapport (par ex. sur la cybersécurité dans votre entreprise), en utilisant le subjonctif.",
        "recommend / essential / vital / insist that + base verbale, négation not + base.",
        60,
        "In light of these findings, we recommend that all staff be trained in phishing awareness. It is essential that passwords be changed every ninety days, and that remote access not be granted without two-factor authentication. Finally, we propose that an external audit take place annually.",
      ),
    ],
  },
  exam: [
    sj.at("hard").gap("The manager proposed that the deadline ___ (extend).", [["be extended", "should be extended"]]),
    sj.mcq("It's about time the government ___ action.", ["take", "took", "takes"], 1),
    sj.correct("It is vital that he is informed immediately.", ["It is vital that he be informed immediately.", "It is vital that he should be informed immediately."]),
    sj.mcq("Suppose you ___ the lottery — what would you do first?", ["win", "won", "had won"], 1),
    sj.gap("She talks to me as though I ___ (be) a child.", [["were", "was"]]),
    sj.transform("Please be quiet.", ["I'd rather you were quiet.", "I would rather you were quiet.", "I'd rather you kept quiet."], { keyword: "rather", instruction: "Reformulez." }),
  ],
};

const cx = itemFactory("g-complex", "C1", "grammar", "complex-sentences", "c1-gr-complex");
const complexSentences: GrammarTopic = {
  id: "complex-sentences",
  title: "Complex sentences: participle clauses & nominalisation",
  titleFr: "Phrases complexes : participiales et nominalisation",
  level: "C1",
  summaryFr: "Condenser l'information comme dans les textes académiques et professionnels.",
  explanationFr: [
    "Les **propositions participiales** condensent l'information. **-ing** pour une action simultanée ou active : *Walking into the room, she noticed the silence.* **Participe passé** pour un sens passif : *Built in 1890, the station is now a museum.* **Having + p.p.** pour l'antériorité : *Having finished the report, he went home.* Le sujet de la participiale doit être le même que celui de la principale, sinon c'est un *dangling participle* (erreur).",
    "La **nominalisation** transforme verbes et adjectifs en noms, ce qui rend le style plus abstrait et formel : *The company expanded rapidly, which surprised analysts* → *The company's rapid expansion surprised analysts.* Très utile en écriture académique, mais à doser pour rester lisible.",
    "Autres outils de complexité : les relatives réduites (*the people living here* = who live here), *with + nom + -ing/p.p.* (*With prices rising, consumers are cutting back*), les propositions en *what* (*What matters is…*) et l'emboîtement de subordonnées.",
    "Un texte C1 alterne phrases complexes et phrases courtes. La clarté prime : une idée principale par phrase.",
  ],
  explanationEn: [
    "Participle clauses (present, past and perfect) allow concise, sophisticated sentences, but the implied subject must match the subject of the main clause.",
    "Nominalisation turns processes into nouns (decide → decision, increase → an increase), producing the dense style typical of academic and professional writing.",
  ],
  forms: [
    { label: "Present participle", pattern: "Verb-ing …, main clause", example: "Feeling unwell, she left early." },
    { label: "Past participle", pattern: "P.p. …, main clause", example: "Written in plain English, the guide is easy to follow." },
    { label: "Perfect participle", pattern: "Having + p.p. …, main clause", example: "Having lived abroad, he adapts quickly." },
    { label: "Nominalisation", pattern: "verb/adj → noun phrase", example: "They failed to respond → Their failure to respond…" },
  ],
  examples: [
    { en: "Having reviewed the evidence, the court dismissed the case.", fr: "Après avoir examiné les preuves, le tribunal a rejeté l'affaire." },
    { en: "Founded in 1998, the company now employs 4,000 people.", fr: "Fondée en 1998, l'entreprise emploie aujourd'hui 4 000 personnes." },
    { en: "The introduction of the new tax led to widespread protests.", fr: "L'introduction de la nouvelle taxe a entraîné de nombreuses manifestations.", note: "nominalisation" },
    { en: "With unemployment falling, the government is under less pressure.", fr: "Avec la baisse du chômage, le gouvernement subit moins de pression." },
  ],
  mistakes: [
    { wrong: "Walking down the street, the rain started.", right: "Walking down the street, I got caught in the rain. / As I was walking down the street, it started to rain.", why: "Dangling participle : ce n'est pas la pluie qui marche." },
    { wrong: "Finishing the report, he sent it to his boss.", right: "Having finished the report, he sent it to his boss.", why: "Pour une action antérieure et achevée : having + p.p." },
    { wrong: "The decide of the board was surprising.", right: "The decision of the board was surprising. / The board's decision was surprising.", why: "Il faut le nom (decision), pas le verbe." },
  ],
  exercises: {
    easy: [
      cx.at("easy").mcq("___ in 1889, the tower was initially criticised.", ["Building", "Built", "Having built"], 1, "Sens passif → participe passé."),
      cx.mcq("___ his keys, he couldn't get into the flat.", ["Having lost", "Lost", "Being lost"], 0),
      cx.gap("The people ___ (live) next door are very noisy.", [["living"]], "Relative réduite (= who live)."),
      cx.mcq("Nominalisation of 'They arrived late':", ["Their late arrival", "Their late arrive", "Their lately arrival"], 0),
    ],
    medium: [
      cx.at("medium").transform("After she had graduated, she moved to London.", ["Having graduated, she moved to London."], { frame: "Having ___", instruction: "Utilisez une participiale." }),
      cx.transform("Because he didn't know the answer, he stayed silent.", ["Not knowing the answer, he stayed silent."], { frame: "Not ___", instruction: "Utilisez une participiale négative." }),
      cx.correct("Arriving at the airport, my flight had been cancelled.", ["Arriving at the airport, I discovered that my flight had been cancelled.", "When I arrived at the airport, my flight had been cancelled.", "Arriving at the airport, I found that my flight had been cancelled.", "On arriving at the airport, I discovered that my flight had been cancelled."], "Le sujet de la participiale doit être celui de la principale."),
      cx.transform("The government decided to raise taxes, and this angered voters.", ["The government's decision to raise taxes angered voters."], { frame: "The government's decision ___", instruction: "Nominalisez." }),
    ],
    hard: [
      cx.at("hard").transform("Prices are increasing, so many families are struggling.", ["With prices increasing, many families are struggling.", "With prices rising, many families are struggling."], { frame: "With ___", instruction: "Utilisez with + nom + -ing." }),
      cx.transform("The number of students fell dramatically, which worried the university.", ["The dramatic fall in the number of students worried the university.", "The dramatic decrease in the number of students worried the university.", "The dramatic drop in the number of students worried the university."], { frame: "The dramatic ___", instruction: "Nominalisez." }),
      cx.transform("The novel was translated into 40 languages and it became a global success.", ["Translated into 40 languages, the novel became a global success.", "Having been translated into 40 languages, the novel became a global success."], { instruction: "Condensez avec une participiale." }),
      cx.free(
        "Rédigez l'introduction (5 phrases) d'un rapport académique sur l'impact de l'IA sur l'emploi, en utilisant au moins 2 participiales et 2 nominalisations.",
        "Participiales correctes (pas de dangling participle), nominalisations, style académique.",
        80,
        "The rapid development of generative AI has raised serious questions about the future of work. Having automated many routine tasks, these systems are now entering creative professions. Drawing on recent surveys, this report examines the likely consequences for employment, with particular attention to the reskilling of workers.",
      ),
    ],
  },
  exam: [
    cx.at("hard").mcq("___ by the news, she burst into tears.", ["Shocking", "Shocked", "Having shocked"], 1),
    cx.transform("He had spent all his money, so he had to walk home.", ["Having spent all his money, he had to walk home."], { frame: "Having ___", instruction: "Participiale." }),
    cx.correct("Looking out of the window, the mountains were beautiful.", ["Looking out of the window, I saw that the mountains were beautiful.", "Looking out of the window, I could see the beautiful mountains.", "Looking out of the window, we admired the beautiful mountains."]),
    cx.transform("They failed to act, and this had serious consequences.", ["Their failure to act had serious consequences."], { frame: "Their ___", instruction: "Nominalisez." }),
    cx.gap("___ (not / want) to disturb anyone, he left quietly.", [["Not wanting"]]),
    cx.mcq("Choose the most academic version:", ["Lots of people think AI is dangerous.", "There is widespread concern about the potential dangers of AI.", "People are kind of scared of AI."], 1),
  ],
};

const nu = itemFactory("g-nuance", "C1", "grammar", "nuances", "c1-gr-nuance");
const nuances: GrammarTopic = {
  id: "nuances",
  title: "Grammatical nuance: hedging, distancing & habits",
  titleFr: "Nuances : atténuation, distance, habitudes",
  level: "C1",
  summaryFr: "Nuancer une affirmation, prendre de la distance, parler d'habitudes passées et actuelles.",
  explanationFr: [
    "**Hedging (atténuation)** : en anglais académique et professionnel, on évite les affirmations trop catégoriques. Outils : modaux (*may, might, could*), verbes (*appear, seem, tend to, suggest, indicate*), adverbes (*arguably, possibly, largely, relatively*), expressions (*to some extent, it could be argued that*). *The results suggest that…* plutôt que *The results prove that…*.",
    "**Distance et politesse** : le passé et le continu adoucissent une demande : *I was wondering if you could…*, *I was hoping to discuss…*, *Would you mind…?* Les tournures *It seems / It appears that…* prennent de la distance par rapport à une information.",
    "**Habitudes** : *used to* (habitude ou état passé révolu : *I used to live in Nice*), *would* (habitude passée répétée, **pas pour les états** : *Every summer we would go camping* ; *I would have a dog* ✗), *be / get used to + -ing* (être / s'habituer à). Au présent, *will* et *keep + -ing* peuvent exprimer une habitude caractéristique ou agaçante : *He'll sit there for hours*, *She keeps interrupting me*, *He's always complaining*.",
    "**Aspect et sens** : certains verbes d'état prennent un sens dynamique au continu : *I'm seeing a client* (rencontrer) / *I see what you mean* ; *She's being difficult* (comportement temporaire) / *She is difficult* (caractère).",
  ],
  explanationEn: [
    "Hedging language (may, appear, tend to, arguably, to some extent) allows you to make cautious, credible claims. Past and continuous forms create politeness and distance.",
    "Used to describes past habits and states; would describes repeated past actions only. Always + continuous or keep + -ing express annoying habits.",
  ],
  forms: [
    { label: "Hedging", pattern: "seem/appear/tend + to ; may/might ; arguably", example: "This approach appears to reduce costs." },
    { label: "Polite distance", pattern: "I was wondering if… / I was hoping…", example: "I was wondering if we could reschedule." },
    { label: "Past habit", pattern: "used to + verb / would + verb (actions only)", example: "We used to live in Lille. We would walk to school." },
    { label: "Annoying habit", pattern: "be always + -ing / keep + -ing", example: "He's always leaving the door open." },
  ],
  examples: [
    { en: "The findings would seem to indicate a link.", fr: "Les résultats sembleraient indiquer un lien.", note: "atténuation forte" },
    { en: "It could be argued that the policy has largely failed.", fr: "On pourrait soutenir que la politique a en grande partie échoué." },
    { en: "When I was a child, my grandfather would tell us stories every night.", fr: "Quand j'étais enfant, mon grand-père nous racontait des histoires tous les soirs." },
    { en: "You're being very quiet today. Is everything OK?", fr: "Tu es bien silencieux aujourd'hui. Tout va bien ?" },
  ],
  mistakes: [
    { wrong: "When I was young, I would have long hair.", right: "When I was young, I used to have long hair.", why: "would ne s'emploie pas pour un état passé (have, be, live…)." },
    { wrong: "This study proves that social media causes depression.", right: "This study suggests that social media may contribute to depression.", why: "En contexte académique, une affirmation trop forte n'est pas crédible : il faut nuancer." },
    { wrong: "I'm not used to wake up early.", right: "I'm not used to waking up early.", why: "be used to + -ing." },
  ],
  exercises: {
    easy: [
      nu.at("easy").mcq("Most cautious statement:", ["This proves the theory.", "This may support the theory.", "This is the theory."], 1),
      nu.mcq("I ___ live in Marseille, but now I live in Paris.", ["would", "used to", "am used to"], 1),
      nu.gap("I ___ (wonder) if you could help me with something.", [["was wondering", "'m wondering", "am wondering"]]),
      nu.mcq("He's always ___ his phone at the dinner table! It's so annoying.", ["check", "checking", "checked"], 1),
    ],
    medium: [
      nu.at("medium").correct("When we were kids, we would live in a small flat.", ["When we were kids, we used to live in a small flat.", "When we were kids, we lived in a small flat."]),
      nu.transform("Remote workers are more productive.", ["Remote workers tend to be more productive.", "Remote workers appear to be more productive.", "Remote workers seem to be more productive.", "Remote workers may be more productive."], { instruction: "Nuancez avec tend / appear / seem / may." }),
      nu.mcq("It took me months to ___ driving on the left.", ["use to", "get used to", "used to"], 1),
      nu.gap("You ___ (be) very unreasonable today — this isn't like you.", [["'re being", "are being"]]),
    ],
    hard: [
      nu.at("hard").transform("The new policy has failed.", ["It could be argued that the new policy has largely failed.", "It could be argued that the new policy has failed.", "The new policy appears to have failed.", "The new policy seems to have failed.", "Arguably, the new policy has failed."], { instruction: "Reformulez de façon nuancée (académique)." }),
      nu.transform("Can you send me the contract today?", ["I was wondering if you could send me the contract today.", "I was wondering whether you could send me the contract today.", "Would you mind sending me the contract today?"], { instruction: "Reformulez de façon plus polie et indirecte." }),
      nu.correct("It seems that the results are proving that the drug works in every case.", ["The results seem to suggest that the drug works in most cases.", "It seems that the results suggest that the drug works in most cases.", "The results appear to suggest that the drug may work in most cases."], "Combinez atténuation et précision : suggest plutôt que prove, most plutôt que every."),
      nu.free(
        "Rédigez un paragraphe (6 phrases) présentant les résultats d'une étude fictive sur le sommeil des étudiants, avec un langage nuancé.",
        "Hedging : may, appear, tend, suggest, to some extent, arguably ; éviter les affirmations absolues.",
        80,
        "The data suggest that students who use their phones late at night tend to sleep less. However, this correlation does not necessarily imply causation. To some extent, stress may also explain the shorter sleep duration observed. Further research would therefore appear necessary.",
      ),
    ],
  },
  exam: [
    nu.at("hard").mcq("Choose the best hedged statement:", ["Video games make children violent.", "There is some evidence that violent video games may be linked to aggression.", "Video games are always bad."], 1),
    nu.gap("Every Sunday, my father ___ (would / cook) a huge lunch for everyone.", [["would cook"]]),
    nu.correct("I'm used to live alone now.", ["I'm used to living alone now.", "I am used to living alone now."]),
    nu.transform("The economy will recover next year.", ["The economy is likely to recover next year.", "The economy may recover next year.", "The economy might recover next year.", "The economy could recover next year.", "The economy is expected to recover next year."], { instruction: "Nuancez." }),
    nu.mcq("She ___ interrupting me during meetings. I'm going to say something.", ["keeps", "used to", "would"], 0),
    nu.gap("I ___ (hope) we could discuss my contract.", [["was hoping", "'ve been hoping", "had hoped"]]),
  ],
};

export const grammarC1 = [subjunctive, complexSentences, nuances];
