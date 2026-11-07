import type { GrammarTopic } from "@/lib/types";
import { itemFactory } from "../builders";

/* =====================================================================
   B2+ — Inversion, phrases clivées, connecteurs, ponctuation et style
   ===================================================================== */

const iv = itemFactory("g-inversion", "B2+", "grammar", "inversion", "b2p-gr-emphasis");
const inversion: GrammarTopic = {
  id: "inversion",
  title: "Inversion for emphasis",
  titleFr: "L'inversion emphatique",
  level: "B2+",
  summaryFr: "Mettre en relief avec Never have I…, Not only…, Had I known…",
  explanationFr: [
    "Après certains **adverbes négatifs ou restrictifs placés en tête de phrase**, l'anglais soutenu inverse le sujet et l'auxiliaire, comme dans une question : *Never have I seen such a mess.* Expressions courantes : *never, rarely, seldom, hardly … when, no sooner … than, not only … but also, under no circumstances, at no time, only then, only after, little*.",
    "S'il n'y a pas d'auxiliaire, on ajoute **do / does / did** : *Rarely do we receive complaints.* *Little did she know that…*",
    "**Inversion conditionnelle** (sans *if*) : *Had I known* (= If I had known), *Should you need help* (= If you need help), *Were it not for* (= If it weren't for). C'est très fréquent dans les courriers formels : *Should you have any questions, please do not hesitate to contact me.*",
    "L'inversion est un **outil de style** : elle apporte de la force à un essai ou un discours. Ne l'utilisez pas dans chaque phrase, ni dans une conversation détendue.",
  ],
  explanationEn: [
    "In formal or emphatic English, a negative or restrictive adverbial at the start of a clause triggers question-style inversion of subject and auxiliary.",
    "Conditional inversion (Had I…, Should you…, Were it not for…) replaces if in formal registers.",
  ],
  forms: [
    { label: "Negative adverbial", pattern: "Never/Rarely/Seldom + aux + subject + verb", example: "Seldom have I felt so welcome." },
    { label: "Not only", pattern: "Not only + aux + subject…, but … also", example: "Not only did he lie, but he also blamed me." },
    { label: "Time sequence", pattern: "No sooner had + S + p.p. … than / Hardly had … when", example: "No sooner had we sat down than the fire alarm went off." },
    { label: "Conditional", pattern: "Had / Should / Were + subject …", example: "Should you require assistance, call reception." },
  ],
  examples: [
    { en: "Under no circumstances should you share your password.", fr: "Vous ne devez en aucun cas partager votre mot de passe." },
    { en: "Only after the meeting did I realise my mistake.", fr: "Ce n'est qu'après la réunion que j'ai compris mon erreur." },
    { en: "Had they invested earlier, they would have doubled their profits.", fr: "S'ils avaient investi plus tôt, ils auraient doublé leurs bénéfices." },
    { en: "Little did we know what was about to happen.", fr: "Nous étions loin de nous douter de ce qui allait se passer." },
  ],
  mistakes: [
    { wrong: "Never I have seen such a beautiful view.", right: "Never have I seen such a beautiful view.", why: "Après never en tête de phrase : auxiliaire + sujet." },
    { wrong: "Not only he speaks French, but also German.", right: "Not only does he speak French, but he also speaks German.", why: "En tête de phrase, not only déclenche l'inversion avec do/does/did." },
    { wrong: "No sooner had we arrived when it started raining.", right: "No sooner had we arrived than it started raining.", why: "no sooner … than ; hardly … when." },
  ],
  exercises: {
    easy: [
      iv.at("easy").mcq("Never ___ such a delicious meal.", ["I have eaten", "have I eaten", "I ate"], 1),
      iv.mcq("Rarely ___ late for work.", ["she is", "is she", "she does"], 1),
      iv.gap("___ you need any help, please call me.", [["Should"]], "Inversion conditionnelle formelle (= If you need…)."),
      iv.mcq("Not only ___ the exam, but she also got the highest mark.", ["she passed", "did she pass", "passed she"], 1),
    ],
    medium: [
      iv.at("medium").transform("If I had known about the problem, I would have helped.", ["Had I known about the problem, I would have helped."], { frame: "Had I ___", instruction: "Réécrivez avec une inversion." }),
      iv.transform("I have never been so embarrassed.", ["Never have I been so embarrassed."], { frame: "Never ___", instruction: "Réécrivez avec une inversion." }),
      iv.correct("Hardly we had started when the power went off.", ["Hardly had we started when the power went off."]),
      iv.gap("Little ___ he know that his life was about to change.", [["did"]]),
    ],
    hard: [
      iv.at("hard").transform("As soon as I got home, the phone rang.", ["No sooner had I got home than the phone rang.", "No sooner had I gotten home than the phone rang."], { frame: "No sooner ___", instruction: "Réécrivez avec une inversion." }),
      iv.transform("You must not leave the building at any time during the exam.", ["At no time must you leave the building during the exam.", "At no time should you leave the building during the exam.", "Under no circumstances must you leave the building during the exam.", "Under no circumstances should you leave the building during the exam."], { frame: "At no time ___", instruction: "Réécrivez avec une inversion." }),
      iv.transform("If it weren't for your support, I would have given up.", ["Were it not for your support, I would have given up.", "Had it not been for your support, I would have given up."], { frame: "Were it not ___", instruction: "Réécrivez avec une inversion." }),
      iv.free(
        "Écrivez le dernier paragraphe d'un discours ou d'un essai avec au moins 3 inversions différentes.",
        "Inversions négatives (never, not only, rarely), no sooner … than, inversion conditionnelle.",
        70,
        "Never before has our planet faced such a combination of challenges. Not only must we reduce emissions, but we must also adapt our cities. Should we fail to act now, the cost for future generations will be enormous.",
      ),
    ],
  },
  exam: [
    iv.at("hard").mcq("Under no circumstances ___ the door unlocked.", ["you should leave", "should you leave", "you leave"], 1),
    iv.transform("I didn't realise how serious it was until later.", ["Only later did I realise how serious it was.", "Only later did I realize how serious it was.", "Not until later did I realise how serious it was.", "Not until later did I realize how serious it was."], { frame: "Only later ___", instruction: "Inversion." }),
    iv.gap("Seldom ___ we see such talent in a young player.", [["do"]]),
    iv.correct("Should you will have any questions, contact us.", ["Should you have any questions, contact us."]),
    iv.gap("No sooner ___ she sent the email ___ she noticed the typo.", [["had"], ["than"]]),
    iv.transform("If the weather had been better, we would have stayed longer.", ["Had the weather been better, we would have stayed longer."], { frame: "Had ___", instruction: "Inversion conditionnelle." }),
  ],
};

const cl = itemFactory("g-cleft", "B2+", "grammar", "cleft-sentences", "b2p-gr-emphasis");
const cleftSentences: GrammarTopic = {
  id: "cleft-sentences",
  title: "Cleft sentences",
  titleFr: "Les phrases clivées (mise en relief)",
  level: "B2+",
  summaryFr: "It was… that… / What I need is… : mettre l'information importante en valeur.",
  explanationFr: [
    "Une phrase **clivée** découpe une phrase en deux pour mettre un élément en relief, comme le français « c'est … qui / que ». **It-cleft** : *It was Sarah who found the bug* (c'est Sarah qui…) ; *It's the price that worries me.*",
    "**Wh-cleft** (pseudo-clivée) : *What + proposition + be + élément mis en valeur*. *What I need is a holiday.* *What annoys me is his attitude.* Avec un verbe : *What she did was (to) call the police.*",
    "Variantes utiles à l'oral et à l'écrit : *All I want is…* (tout ce que je veux), *The reason why … is that…*, *The thing (that) … is…*, *The place where…*, *It wasn't until … that…* (ce n'est qu'à … que…).",
    "Les clivées permettent aussi de **corriger** ou **contraster** : *It wasn't the design that failed, it was the testing.*",
  ],
  explanationEn: [
    "Cleft sentences split information to focus on one part. It-clefts (It is/was X that/who…) highlight a noun or adverbial; wh-clefts (What … is/was X) build suspense before the key information.",
  ],
  forms: [
    { label: "It-cleft", pattern: "It + be + focus + that/who + clause", example: "It was in 2015 that we launched the app." },
    { label: "Wh-cleft", pattern: "What + clause + be + focus", example: "What surprised me was the silence." },
    { label: "Action focus", pattern: "What + S + did + was + (to) verb", example: "What we did was rewrite the code." },
    { label: "Not until", pattern: "It wasn't until + time + that…", example: "It wasn't until midnight that he called." },
  ],
  examples: [
    { en: "It's not the money that matters, it's the experience.", fr: "Ce n'est pas l'argent qui compte, c'est l'expérience." },
    { en: "What I love about this city is its energy.", fr: "Ce que j'adore dans cette ville, c'est son énergie." },
    { en: "All we need is a bit more time.", fr: "Tout ce dont nous avons besoin, c'est d'un peu plus de temps." },
    { en: "The reason why I left is that I wanted a new challenge.", fr: "La raison pour laquelle je suis parti, c'est que je voulais un nouveau défi." },
  ],
  mistakes: [
    { wrong: "What I need it is a coffee.", right: "What I need is a coffee.", why: "Pas de pronom it supplémentaire dans une wh-cleft." },
    { wrong: "It was my brother which called.", right: "It was my brother who called.", why: "Pour une personne : who (ou that)." },
    { wrong: "The reason is because I was tired.", right: "The reason is that I was tired.", why: "The reason … is that (et non because) dans un style correct." },
  ],
  exercises: {
    easy: [
      cl.at("easy").mcq("___ was Maria who organised the event.", ["This", "It", "What"], 1),
      cl.mcq("What I really want ___ a quiet weekend.", ["it is", "is", "are"], 1),
      cl.gap("It was in Rome ___ they first met.", [["that", "where"]]),
      cl.mcq("All I need ___ some sleep.", ["is", "are", "it is"], 0),
    ],
    medium: [
      cl.at("medium").transform("The noise bothers me.", ["What bothers me is the noise.", "It's the noise that bothers me.", "It is the noise that bothers me."], { frame: "What ___", instruction: "Mettez en relief avec une wh-cleft." }),
      cl.transform("Tom broke the printer, not Lisa.", ["It was Tom who broke the printer, not Lisa.", "It was Tom that broke the printer, not Lisa."], { frame: "It was ___", instruction: "Mettez en relief avec une it-cleft." }),
      cl.correct("What I don't understand it is why he left.", ["What I don't understand is why he left."]),
      cl.gap("It wasn't ___ I moved abroad ___ I realised how much I loved my hometown.", [["until"], ["that"]]),
    ],
    hard: [
      cl.at("hard").transform("We decided to rebuild the whole system.", ["What we decided to do was (to) rebuild the whole system.", "What we decided to do was rebuild the whole system.", "What we decided to do was to rebuild the whole system."], { frame: "What we decided to do ___", instruction: "Mettez l'action en relief." }),
      cl.transform("I only understood the problem when I read the report.", ["It wasn't until I read the report that I understood the problem.", "It was not until I read the report that I understood the problem."], { frame: "It wasn't until ___", instruction: "Reformulez." }),
      cl.transform("He's rude, and that's why nobody likes him.", ["The reason why nobody likes him is that he's rude.", "The reason nobody likes him is that he's rude.", "The reason why nobody likes him is that he is rude.", "The reason nobody likes him is that he is rude."], { frame: "The reason ___", instruction: "Reformulez." }),
      cl.free(
        "Défendez une opinion (par ex. sur le télétravail) en 5 phrases avec au moins 3 phrases clivées différentes.",
        "It-cleft, wh-cleft, The reason why … is that…, It wasn't until … that…",
        60,
        "What most companies underestimate is how much remote work improves concentration. It's not the location that matters, it's the quality of communication. The reason why some teams struggle is that they never set clear rules.",
      ),
    ],
  },
  exam: [
    cl.at("hard").transform("I love her sense of humour.", ["What I love is her sense of humour.", "What I love about her is her sense of humour.", "It's her sense of humour that I love.", "It is her sense of humour that I love."], { frame: "What I love ___", instruction: "Wh-cleft." }),
    cl.gap("It ___ the lack of planning that caused the delay.", [["was"]]),
    cl.mcq("___ you should do is apologise.", ["That", "What", "Which"], 1),
    cl.correct("It was him who's responsible for the error.", ["It was he who was responsible for the error.", "It was him who was responsible for the error."]),
    cl.gap("It wasn't until the 1960s ___ women could open a bank account without their husband's permission in France.", [["that"]]),
    cl.transform("The ending surprised me most.", ["What surprised me most was the ending.", "It was the ending that surprised me most."], { frame: "What ___", instruction: "Wh-cleft." }),
  ],
};

const lw = itemFactory("g-linking", "B2+", "grammar", "linking-words", "b2p-gr-linking");
const linkingWords: GrammarTopic = {
  id: "linking-words",
  title: "Advanced linking words",
  titleFr: "Connecteurs logiques avancés",
  level: "B2+",
  summaryFr: "Articuler un raisonnement : concession, cause, conséquence, contraste.",
  explanationFr: [
    "**Concession** : *although / even though / though* + proposition ; *despite / in spite of* + **nom ou -ing** (*despite the rain, despite being tired*, ou *despite the fact that* + proposition) ; *however* (adverbe : en début de phrase, suivi d'une virgule) ; *nevertheless / nonetheless* (néanmoins).",
    "**Contraste** : *whereas / while* (tandis que) ; *on the other hand* (en revanche) ; *on the contrary* sert à **contredire** ce qui précède (au contraire), pas à comparer.",
    "**Cause et conséquence** : *because of / due to / owing to* + nom ; *as / since* + proposition ; *therefore, consequently, as a result, thus, hence* (donc, par conséquent). **Ajout** : *moreover, furthermore, in addition, what is more*. **But** : *so that, in order to, so as not to*.",
    "Attention à la **ponctuation** : *however* et *therefore* ne relient pas deux propositions avec une simple virgule. On écrit *…, but…* ou *…. However, …* ou *…; however, …*.",
  ],
  explanationEn: [
    "Advanced linkers signal the logic of an argument. Pay attention to grammar: although + clause, despite + noun/-ing; however and therefore are sentence adverbs, not conjunctions.",
  ],
  forms: [
    { label: "Concession + clause", pattern: "Although / Even though + S + V", example: "Although it was late, we kept working." },
    { label: "Concession + noun", pattern: "Despite / In spite of + noun / -ing", example: "Despite the cost, the project went ahead." },
    { label: "Sentence adverb", pattern: "S + V. However, / Therefore, S + V.", example: "Sales fell. However, profits rose." },
    { label: "Purpose", pattern: "so that + S + can/could ; in order (not) to", example: "Speak slowly so that everyone can follow." },
  ],
  examples: [
    { en: "Despite having little experience, she was hired.", fr: "Bien qu'elle ait peu d'expérience, elle a été embauchée." },
    { en: "Some people love cities, whereas others prefer the countryside.", fr: "Certains adorent la ville, tandis que d'autres préfèrent la campagne." },
    { en: "The flight was cancelled due to the storm.", fr: "Le vol a été annulé en raison de la tempête." },
    { en: "The data is incomplete; therefore, no conclusion can be drawn.", fr: "Les données sont incomplètes ; on ne peut donc tirer aucune conclusion." },
  ],
  mistakes: [
    { wrong: "Despite it was raining, we went out.", right: "Although it was raining, we went out. / Despite the rain, we went out.", why: "despite est suivi d'un nom ou d'un -ing, pas d'une proposition." },
    { wrong: "I was tired, however I finished the report.", right: "I was tired. However, I finished the report.", why: "however n'est pas une conjonction : point (ou point-virgule) + virgule." },
    { wrong: "He's rich. On the contrary, his brother is poor.", right: "He's rich. On the other hand, his brother is poor.", why: "on the contrary contredit ; on the other hand compare." },
  ],
  exercises: {
    easy: [
      lw.at("easy").mcq("___ the traffic, we arrived on time.", ["Although", "Despite", "However"], 1),
      lw.mcq("I love coffee, ___ my sister hates it.", ["whereas", "despite", "therefore"], 0),
      lw.gap("The match was postponed ___ ___ the heavy snow.", [["because", "due"], ["of", "to"]]),
      lw.mcq("The product is cheap. ___, it's not very reliable.", ["Although", "However", "Despite"], 1),
    ],
    medium: [
      lw.at("medium").correct("In spite of he was ill, he went to work.", ["In spite of being ill, he went to work.", "In spite of the fact that he was ill, he went to work.", "Although he was ill, he went to work.", "Even though he was ill, he went to work."]),
      lw.transform("Although she trained hard, she lost the race.", ["Despite training hard, she lost the race.", "In spite of training hard, she lost the race.", "Despite her hard training, she lost the race.", "Despite having trained hard, she lost the race."], { keyword: "despite", instruction: "Reformulez." }),
      lw.mcq("I left early ___ miss the last train.", ["so that not", "so as not to", "in order not"], 1),
      lw.gap("Costs have risen sharply. ___, we have to increase our prices.", [["Therefore", "Consequently", "As a result", "Thus", "Hence"]]),
    ],
    hard: [
      lw.at("hard").transform("He's very talented, but he lacks discipline.", ["Talented though he is, he lacks discipline.", "Although he is very talented, he lacks discipline.", "Although he's very talented, he lacks discipline.", "Even though he is very talented, he lacks discipline."], { instruction: "Reformulez avec une concession (although / though)." }),
      lw.correct("The plan is expensive, moreover it is risky.", ["The plan is expensive. Moreover, it is risky.", "The plan is expensive; moreover, it is risky.", "The plan is expensive and, moreover, it is risky."]),
      lw.mcq("— Is the new manager strict? — ___, she's very relaxed.", ["On the other hand", "On the contrary", "Whereas"], 1),
      lw.free(
        "Écrivez un paragraphe argumentatif (6 phrases) sur « Les réseaux sociaux font-ils plus de mal que de bien ? », avec au moins 5 connecteurs variés.",
        "Concession, contraste, cause, conséquence, ajout ; ponctuation correcte des adverbes.",
        90,
        "Social media has undeniably transformed the way we communicate. Although it allows us to stay in touch with friends abroad, it can also fuel anxiety. Moreover, algorithms tend to reinforce existing opinions; as a result, public debate becomes more polarised. Nevertheless, banning these platforms would be unrealistic.",
      ),
    ],
  },
  exam: [
    lw.at("medium").gap("___ the fact that it was expensive, the hotel was full.", [["Despite", "In spite of"]]),
    lw.mcq("He studied hard ___ he could get a scholarship.", ["so that", "in order to", "despite"], 0),
    lw.correct("Even though the bad weather, the concert went ahead.", ["Despite the bad weather, the concert went ahead.", "In spite of the bad weather, the concert went ahead.", "Even though the weather was bad, the concert went ahead."]),
    lw.mcq("Some experts support the reform, ___ others reject it completely.", ["while", "however", "therefore"], 0),
    lw.transform("We couldn't land because of the fog.", ["We couldn't land due to the fog.", "We could not land due to the fog.", "We couldn't land owing to the fog."], { keyword: "due", instruction: "Reformulez." }),
    lw.gap("The software is outdated. ___, it is no longer supported by the manufacturer.", [["Furthermore", "Moreover", "In addition", "What is more", "What's more"]]),
  ],
};

const ps = itemFactory("g-punct", "B2+", "grammar", "punctuation-style", "b2p-wr-style");
const punctuationStyle: GrammarTopic = {
  id: "punctuation-style",
  title: "Punctuation and style",
  titleFr: "Ponctuation et style",
  level: "B2+",
  summaryFr: "Virgules, points-virgules, apostrophes, majuscules et registre.",
  explanationFr: [
    "La **comma splice** (deux phrases complètes reliées par une simple virgule) est l'erreur la plus fréquente des francophones : *It was late, we went home* ✗. Solutions : un point, un point-virgule, ou une conjonction (*It was late, so we went home*).",
    "**Apostrophes** : possession (*the company's profits*, singulier ; *the employees' rights*, pluriel), contractions (*it's = it is*). **its** (possessif) n'a jamais d'apostrophe. Les contractions sont à éviter dans un écrit formel.",
    "**Majuscules** : en anglais, les jours, mois, langues, nationalités et adjectifs de nationalité prennent une majuscule : *Monday, March, French, a Spanish company*. Pas de majuscule aux saisons (*summer*).",
    "**Style** : préférez la voix active quand l'agent compte, variez la longueur des phrases, évitez les répétitions, choisissez le **registre** adapté (*get → obtain/receive*, *a lot of → a significant number of*, *but → however*) et utilisez la virgule après une subordonnée en tête (*If you agree, …*). Pas d'espace avant ? ! : ; en anglais.",
  ],
  explanationEn: [
    "Avoid comma splices; use full stops, semicolons or conjunctions. Use apostrophes for possession and contractions, but not in its (possessive). Capitalise days, months, languages and nationalities.",
    "Good style means choosing the right register, varying sentence length, and using punctuation to guide the reader.",
  ],
  forms: [
    { label: "Joining clauses", pattern: "Clause. Clause. / Clause; clause. / Clause, and/but/so clause.", example: "Sales rose; costs, however, rose faster." },
    { label: "Possessive", pattern: "noun's (singular) / nouns' (plural)", example: "the manager's office / the managers' meeting" },
    { label: "Intro clause", pattern: "Subordinate clause, main clause", example: "Although the plan is ambitious, it is realistic." },
  ],
  examples: [
    { en: "The meeting is on Tuesday, 4 March.", fr: "La réunion a lieu le mardi 4 mars.", note: "majuscules" },
    { en: "It's clear that the company has lost its way.", fr: "Il est clair que l'entreprise a perdu son cap.", note: "it's vs its" },
    { en: "We missed the deadline; as a result, the client cancelled.", fr: "Nous avons raté la date limite ; le client a donc annulé." },
  ],
  mistakes: [
    { wrong: "The results were good, we celebrated.", right: "The results were good, so we celebrated. / The results were good. We celebrated.", why: "Comma splice : deux phrases indépendantes ne se relient pas par une virgule seule." },
    { wrong: "The company lost it's biggest client.", right: "The company lost its biggest client.", why: "its (possessif) ne prend pas d'apostrophe." },
    { wrong: "I speak english and spanish.", right: "I speak English and Spanish.", why: "Les langues prennent une majuscule." },
  ],
  exercises: {
    easy: [
      ps.at("easy").mcq("Choose the correct sentence.", ["The dog wagged it's tail.", "The dog wagged its tail.", "The dog wagged its' tail."], 1),
      ps.mcq("Choose the correct sentence.", ["We met on monday in june.", "We met on Monday in June.", "We met on Monday in june."], 1),
      ps.mcq("Choose the correctly punctuated sentence.", ["It was raining, we stayed inside.", "It was raining, so we stayed inside.", "It was raining so, we stayed inside."], 1),
      ps.mcq("The ___ toys were all over the floor. (several children)", ["childrens'", "children's", "childs'"], 1, "children est un pluriel irrégulier : children's."),
    ],
    medium: [
      ps.at("medium").correct("I sent the email, however nobody replied.", ["I sent the email. However, nobody replied.", "I sent the email; however, nobody replied.", "I sent the email, but nobody replied."]),
      ps.correct("The employee's union met all the company directors yesterday.", ["The employees' union met all the company directors yesterday."], "L'union appartient à plusieurs employés : employees'."),
      ps.mcq("Most formal version:", ["We got a lot of complaints, so we changed the policy.", "We received a significant number of complaints; consequently, the policy was revised.", "Loads of people complained, so we changed stuff."], 1),
      ps.correct("If you have any questions please contact me.", ["If you have any questions, please contact me."]),
    ],
    hard: [
      ps.at("hard").correct("The report which was published last week contains several errors, it will be revised.", ["The report, which was published last week, contains several errors. It will be revised.", "The report, which was published last week, contains several errors; it will be revised.", "The report which was published last week contains several errors. It will be revised.", "The report which was published last week contains several errors; it will be revised."]),
      ps.transform("We got your letter and we'll look at your problem soon.", ["We have received your letter and will examine your problem shortly.", "We have received your letter and will look into your problem shortly.", "We have received your letter and will examine your issue shortly."], { instruction: "Réécrivez dans un registre formel (received, examine / look into, shortly)." }),
      ps.correct("Its important to check it's settings before you start.", ["It's important to check its settings before you start.", "It is important to check its settings before you start."]),
      ps.free(
        "Réécrivez ce message informel en email professionnel : « hi, got your mail, the files are not ok, can you send them again asap, thanks »",
        "Registre formel, ponctuation correcte, pas de comma splice, formules de politesse.",
        40,
        "Dear Ms Taylor,\n\nThank you for your email. Unfortunately, the files you sent appear to be corrupted. Could you please send them again at your earliest convenience?\n\nKind regards,\nAnass",
      ),
    ],
  },
  exam: [
    ps.at("medium").mcq("Correct punctuation:", ["The price is high; however, the quality is excellent.", "The price is high, however the quality is excellent.", "The price is high however, the quality is excellent."], 0),
    ps.correct("The company announced it's results on thursday.", ["The company announced its results on Thursday."]),
    ps.mcq("More formal:", ["We need to fix this ASAP.", "This issue needs to be addressed as a matter of urgency.", "We gotta sort this out quickly."], 1),
    ps.correct("The teachers room is on the second floor.", ["The teachers' room is on the second floor.", "The teacher's room is on the second floor."]),
    ps.correct("Although he apologised. She refused to forgive him.", ["Although he apologised, she refused to forgive him.", "Although he apologized, she refused to forgive him."], "Une subordonnée ne forme pas une phrase à elle seule."),
    ps.mcq("Correct sentence:", ["My french colleague arrives in august.", "My French colleague arrives in August.", "My French Colleague arrives in August."], 1),
  ],
};

export const grammarB2Plus = [inversion, cleftSentences, linkingWords, punctuationStyle];
