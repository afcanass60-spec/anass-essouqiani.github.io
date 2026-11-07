import type { Exam, ListeningTrack, ReadingText } from "@/lib/types";
import { itemFactory } from "./builders";

/*
 * Examens blancs d'entraînement. Formats INSPIRÉS des épreuves Cambridge
 * et IELTS (types de tâches, minutage) : ce ne sont pas des sujets officiels
 * et les résultats ne constituent pas une certification.
 */

/* ---------- Supports propres aux examens ---------- */

const xr1 = itemFactory("x-b1-r", "B1", "reading");
const xb1Reading: ReadingText = {
  id: "x-b1-reading",
  title: "Volunteer at the City Farm",
  level: "B1",
  genre: "news",
  intro: "An advert in a local newspaper.",
  paragraphs: [
    "Hillside City Farm is looking for volunteers to help this summer. No experience is needed — just enthusiasm and a love of animals!",
    "Volunteers usually work one morning or afternoon a week. Tasks include feeding the goats and chickens, cleaning the stables and helping visitors, especially school groups. Some volunteers also help in our café, where we sell vegetables grown on the farm.",
    "You must be at least 16 years old. Volunteers under 18 need a signed form from a parent. Please wear old clothes and strong shoes; we provide gloves and waterproof jackets.",
    "In return, you'll get free lunch on the days you work, a reference letter after three months, and a 20% discount in the café. To apply, fill in the form on our website before 15 May. A short training session will take place on Saturday 1 June.",
  ],
  questions: [
    xr1.mcq("What experience do volunteers need?", ["Experience with animals", "No experience", "Experience with children"], 1),
    xr1.mcq("How often do volunteers usually work?", ["Every day", "Once a week", "At weekends only"], 1),
    xr1.mcq("What must volunteers under 18 bring?", ["A signed parental form", "Their own gloves", "A reference letter"], 0),
    xr1.mcq("What do volunteers get after three months?", ["A free lunch", "A reference letter", "A paid job"], 1),
    xr1.gap("The training session is on Saturday 1 ___.", [["June"]]),
  ],
  summaryTask: { instruction: "", minWords: 0, maxWords: 0 },
  keyVocab: [],
};

const xl1 = itemFactory("x-b1-l", "B1", "listening");
const xb1Listening: ListeningTrack = {
  id: "x-b1-listening",
  title: "Planning a birthday surprise",
  level: "B1",
  genre: "conversation",
  context: "Two friends plan a surprise party.",
  baseRate: 0.95,
  speakers: [
    { name: "Ella", accent: "en-GB", gender: "f" },
    { name: "Ben", accent: "en-GB", gender: "m" },
  ],
  lines: [
    { speaker: 0, text: "Ben, have you thought about Maya's birthday? It's on the twentieth." },
    { speaker: 1, text: "I have! I thought we could have a surprise party at my place on the Saturday before, the eighteenth." },
    { speaker: 0, text: "Great idea. But your flat's quite small. How many people are you thinking of inviting?" },
    { speaker: 1, text: "About fifteen. My flatmate will be away, so we'll have the living room and the kitchen." },
    { speaker: 0, text: "OK. I can make a cake — chocolate, because she hates fruit cakes." },
    { speaker: 1, text: "Perfect. I'll organise the music. How do we get her there without her guessing?" },
    { speaker: 0, text: "I'll tell her we're going to the cinema and that I need to pick something up from your flat first." },
    { speaker: 1, text: "Brilliant. Let's say everyone arrives at seven and you bring her at half past." },
  ],
  questions: [
    xl1.gap("The party will be on the ___ (date).", [["18th", "eighteenth", "18"]]),
    xl1.mcq("How many people will they invite?", ["About 5", "About 15", "About 50"], 1),
    xl1.mcq("What kind of cake will Ella make?", ["Fruit", "Chocolate", "Lemon"], 1),
    xl1.mcq("What will Ella tell Maya?", ["They're going to a restaurant", "They're going to the cinema", "It's a party"], 1),
    xl1.mcq("What time will Maya arrive?", ["7.00", "7.30", "8.00"], 1),
  ],
  expressions: [{ en: "without her guessing", fr: "sans qu'elle devine" }],
};

const xr2 = itemFactory("x-b2-r", "B2", "reading");
const xb2Reading: ReadingText = {
  id: "x-b2-reading",
  title: "The rise of 'quiet quitting'",
  level: "B2",
  genre: "news",
  intro: "A magazine article.",
  paragraphs: [
    "The phrase 'quiet quitting' spread rapidly across social media a few years ago, and it has proved surprisingly durable. Despite its name, it does not involve resigning. Instead, it describes employees who do exactly what their job description requires — and nothing more.",
    "Supporters argue that this is simply a healthy response to a culture of overwork. For years, they say, employees have been expected to answer emails late at night, take on extra responsibilities without extra pay, and treat their jobs as an identity rather than a contract. Setting boundaries, in this view, is not laziness but self-respect.",
    "Critics, however, see something more worrying. They argue that careers are built on going beyond the minimum, and that workers who disengage may find themselves overlooked for promotion. Some managers also point out that teams depend on informal goodwill: covering for a sick colleague, sharing knowledge, helping a newcomer.",
    "Perhaps the most interesting aspect of the debate is what it reveals about expectations. Surveys suggest that many employees who describe themselves as quiet quitters are not lazy at all; they feel undervalued. When their efforts were recognised, many said, they would happily do more. The solution, then, may lie less in changing workers' attitudes than in changing how organisations reward commitment.",
  ],
  questions: [
    xr2.mcq("What does 'quiet quitting' refer to?", ["Leaving a job without notice", "Doing only what the job requires", "Working from home secretly"], 1),
    xr2.mcq("According to supporters, quiet quitting is…", ["a form of laziness", "a way of protecting oneself from overwork", "illegal in some countries"], 1),
    xr2.mcq("What concern do critics raise?", ["Workers may miss out on promotion.", "Salaries will fall.", "Companies will close."], 0),
    xr2.mcq("What does the writer suggest in the final paragraph?", ["Workers must change their attitude.", "Organisations should recognise effort better.", "The trend will disappear soon."], 1),
    xr2.mcq("'Proved surprisingly durable' means the phrase…", ["has lasted longer than expected", "was difficult to understand", "became illegal"], 0),
  ],
  summaryTask: { instruction: "", minWords: 0, maxWords: 0 },
  keyVocab: [],
};

const xl2 = itemFactory("x-b2-l", "B2", "listening");
const xb2Listening: ListeningTrack = {
  id: "x-b2-listening",
  title: "Radio interview: a rewilding project",
  level: "B2",
  genre: "interview",
  context: "A radio presenter talks to an ecologist about reintroducing beavers.",
  baseRate: 1.05,
  speakers: [
    { name: "Presenter", accent: "en-GB", gender: "f" },
    { name: "Dr Hale", accent: "en-GB", gender: "m" },
  ],
  lines: [
    { speaker: 0, text: "Dr Hale, your team reintroduced beavers to this valley five years ago. Why beavers?" },
    { speaker: 1, text: "Because they're what we call ecosystem engineers. By building dams, they create wetlands, which slow down water during heavy rain and store it during droughts." },
    { speaker: 0, text: "And has it worked?" },
    { speaker: 1, text: "Remarkably well. Flooding in the village downstream has been reduced, and we've recorded a big increase in frogs, insects and birds." },
    { speaker: 0, text: "Not everyone is happy, though. Some farmers say beavers have damaged their fields." },
    { speaker: 1, text: "That's a fair concern, and we take it seriously. In a few places, dams have flooded farmland. We now have a management plan — we can lower a dam or, as a last resort, move a family of beavers." },
    { speaker: 0, text: "Would you recommend other regions do the same?" },
    { speaker: 1, text: "Yes, but only with proper consultation. The biggest lesson we've learnt is that the ecology is the easy part; the hard part is people." },
  ],
  questions: [
    xl2.mcq("Why are beavers called 'ecosystem engineers'?", ["They build dams that change the landscape.", "They are very intelligent.", "They were brought by engineers."], 0),
    xl2.mcq("What effect has the project had on the village?", ["More flooding", "Less flooding", "No change"], 1),
    xl2.mcq("What do some farmers complain about?", ["Noise", "Damage to fields", "Tourists"], 1),
    xl2.mcq("What is the 'last resort' option?", ["Moving a beaver family", "Building a wall", "Paying farmers"], 0),
    xl2.mcq("What is Dr Hale's main lesson?", ["The ecology is complicated.", "Managing people's concerns is the hardest part.", "Beavers should be everywhere."], 1),
  ],
  expressions: [{ en: "as a last resort", fr: "en dernier recours" }],
};

const xr3 = itemFactory("x-c1-r", "C1", "reading");
const xc1Reading: ReadingText = {
  id: "x-c1-reading",
  title: "The paradox of choice revisited",
  level: "C1",
  genre: "academic",
  intro: "An extract from a book on behavioural economics.",
  paragraphs: [
    "It has become something of a truism that too much choice is bad for us. The idea, popularised in the early 2000s, rests largely on a single memorable experiment in which shoppers presented with twenty-four varieties of jam were markedly less likely to buy any than those offered only six. Choice, it seemed, could paralyse.",
    "Yet subsequent attempts to replicate the effect have produced a rather less tidy picture. A meta-analysis of dozens of studies found that, on average, the effect of the number of options on satisfaction or purchasing was close to zero — although, crucially, the variation between studies was considerable. In some contexts, more choice demotivated people; in others, it did the opposite.",
    "The more productive question, then, is not whether choice overload exists, but when. The evidence points to several moderating factors: whether people have clear preferences beforehand, how easily options can be compared, and whether the decision is perceived as consequential. Faced with an unfamiliar, high-stakes decision and no easy way of comparing alternatives, people do appear to struggle. Choosing a jam they already know they like poses no such difficulty.",
    "This is not merely an academic quibble. Policies inspired by the original finding — such as drastically limiting the number of pension funds offered to employees — may be beneficial in some circumstances but counterproductive in others. The lesson, if there is one, is that striking findings deserve particular scrutiny precisely because they are so easy to remember.",
  ],
  questions: [
    xr3.mcq("What does the writer suggest about the original jam experiment?", ["It was fraudulent.", "Its conclusion has been oversimplified.", "It has been perfectly replicated."], 1),
    xr3.mcq("What did the meta-analysis find?", ["A strong, consistent effect", "An average effect close to zero with large variation", "No variation between studies"], 1),
    xr3.mcq("According to paragraph 3, choice overload is most likely when…", ["people already know what they like", "decisions are unfamiliar, important and hard to compare", "products are cheap"], 1),
    xr3.mcq("What does 'an academic quibble' mean?", ["A minor theoretical objection", "A university scandal", "A major discovery"], 0),
    xr3.mcq("What is the writer's final point?", ["Memorable findings should be examined especially carefully.", "Pension funds should be limited.", "Choice is always beneficial."], 0),
  ],
  summaryTask: { instruction: "", minWords: 0, maxWords: 0 },
  keyVocab: [],
};

const xl3 = itemFactory("x-c1-l", "C1", "listening");
const xc1Listening: ListeningTrack = {
  id: "x-c1-listening",
  title: "Panel discussion: the future of the office",
  level: "C1",
  genre: "debate",
  context: "Two experts discuss office design after the rise of remote work.",
  baseRate: 1.1,
  speakers: [
    { name: "Chair", accent: "en-US", gender: "f" },
    { name: "Ruth (architect)", accent: "en-GB", gender: "f" },
    { name: "Tariq (economist)", accent: "intl", gender: "m" },
  ],
  lines: [
    { speaker: 0, text: "Ruth, are we witnessing the end of the office?" },
    { speaker: 1, text: "I'd say we're witnessing the end of the office as a place where you go simply because you're expected to. What survives will have to justify itself — as a place for collaboration, mentoring, and the kind of chance encounters that video calls can't replicate." },
    { speaker: 2, text: "I'd push back slightly on the romanticism of chance encounters. The data on so-called serendipity is thin. What we can measure is that junior staff, in particular, learn faster when they're physically near experienced colleagues — that's the strongest economic case for the office." },
    { speaker: 1, text: "Which is essentially my point, though — that's a design brief. If learning is the purpose, you design for overhearing, for visibility, not for rows of identical desks." },
    { speaker: 2, text: "Granted. My concern is cost. Companies are holding leases on buildings that are half empty on Fridays. Unless they consolidate, the economics simply don't add up." },
    { speaker: 0, text: "So smaller, but better?" },
    { speaker: 1, text: "Smaller, better, and — dare I say — more honest about what it's for." },
  ],
  questions: [
    xl3.mcq("What is Ruth's view of the office?", ["It will disappear completely.", "It must now justify its purpose.", "It will return to normal."], 1),
    xl3.mcq("Why does Tariq 'push back'?", ["He thinks evidence for chance encounters is weak.", "He wants everyone back in the office.", "He disagrees about juniors."], 0),
    xl3.mcq("What does Tariq consider the strongest case for the office?", ["Lower costs", "Faster learning for junior staff", "Better technology"], 1),
    xl3.mcq("What is Tariq's main concern?", ["Underused buildings are expensive.", "Remote workers are less productive.", "Architects are too expensive."], 0),
    xl3.mcq("By 'more honest about what it's for', Ruth means offices should…", ["be cheaper", "be designed around a clear purpose", "have more glass walls"], 1),
  ],
  expressions: [{ en: "I'd push back slightly on…", fr: "je nuancerais un peu…" }, { en: "the economics don't add up", fr: "les comptes ne tiennent pas" }],
};

export const examReadings = [xb1Reading, xb2Reading, xc1Reading];
export const examTracks = [xb1Listening, xb2Listening, xc1Listening];

/* ---------- Use of English (items inédits) ---------- */

const ub1 = itemFactory("x-b1-u", "B1", "grammar");
const ub1v = itemFactory("x-b1-v", "B1", "vocabulary");
const ub2 = itemFactory("x-b2-u", "B2", "grammar");
const ub2v = itemFactory("x-b2-v", "B2", "vocabulary");
const uc1 = itemFactory("x-c1-u", "C1", "grammar");
const uc1v = itemFactory("x-c1-v", "C1", "vocabulary");
const ui = itemFactory("x-ielts-u", "B2+", "grammar");

export const exams: Exam[] = [
  {
    id: "exam-b1",
    level: "B1",
    title: "B1 Practice Test",
    format: "cambridge",
    minutes: 75,
    description: "Format inspiré des épreuves B1 (type « Preliminary ») : compréhension de documents courts, conversation, email, entretien.",
    sections: [
      { skill: "reading", title: "Reading — Notice", minutes: 15, items: [], reading: "x-b1-reading" },
      { skill: "listening", title: "Listening — Conversation", minutes: 10, items: [], listening: "x-b1-listening" },
      {
        skill: "grammar",
        title: "Use of English",
        minutes: 15,
        items: [
          ub1.mcq("I ___ never been to Scotland.", ["have", "had", "am"], 0),
          ub1.gap("If you ___ (see) Tom, tell him to call me.", [["see"]]),
          ub1.mcq("This book ___ by a famous journalist.", ["wrote", "was written", "has written"], 1),
          ub1.gap("We were watching TV when the phone ___ (ring).", [["rang"]]),
          ub1.correct("She is living here since three years.", ["She has lived here for three years.", "She has been living here for three years.", "She's lived here for three years.", "She's been living here for three years."]),
          ub1v.mcq("Can you ___ my plants while I'm on holiday?", ["look after", "look for", "look up"], 0),
          ub1v.mcq("The train was ___ because of the strike.", ["cancelled", "stopped", "finished"], 0),
          ub1v.gap("I'm going to ___ for the job at the bank. (= send an application)", [["apply"]]),
        ],
      },
      { skill: "writing", title: "Writing — Email", minutes: 25, items: [], writing: "w-email-colleague" },
      { skill: "speaking", title: "Speaking — Describe a picture", minutes: 10, items: [], speaking: "sp-desc-1" },
    ],
  },
  {
    id: "exam-b2",
    level: "B2",
    title: "B2 Practice Test",
    format: "cambridge",
    minutes: 110,
    description: "Format inspiré des épreuves B2 (type « First ») : article d'opinion, interview radio, transformations de phrases, essai, entretien.",
    sections: [
      { skill: "reading", title: "Reading — Article", minutes: 20, items: [], reading: "x-b2-reading" },
      { skill: "listening", title: "Listening — Radio interview", minutes: 15, items: [], listening: "x-b2-listening" },
      {
        skill: "grammar",
        title: "Use of English",
        minutes: 20,
        items: [
          ub2.transform("I regret not studying harder.", ["I wish I had studied harder.", "I wish I'd studied harder."], { keyword: "wish", instruction: "Key word transformation." }),
          ub2.transform("It's possible that she forgot about the meeting.", ["She might have forgotten about the meeting.", "She may have forgotten about the meeting.", "She could have forgotten about the meeting."], { keyword: "might", instruction: "Key word transformation." }),
          ub2.transform("They will finish the bridge before the end of the year.", ["The bridge will have been finished by the end of the year.", "They will have finished the bridge by the end of the year."], { keyword: "by", instruction: "Key word transformation." }),
          ub2.gap("___ the bad weather, the event was a great success.", [["Despite", "In spite of"]]),
          ub2.gap("If I ___ (know) you were ill, I would have visited you.", [["had known", "'d known"]]),
          ub2v.mcq("The company has a proven ___ record in renewable energy.", ["track", "trace", "path"], 0),
          ub2v.mcq("We need to ___ our carbon footprint.", ["reduce", "lower down", "decline"], 0),
          ub2v.gap("The new law aims to ___ inequality. (= deal with a difficult problem)", [["tackle", "address", "reduce"]]),
        ],
      },
      { skill: "writing", title: "Writing — Essay", minutes: 40, items: [], writing: "w-essay-tech" },
      { skill: "speaking", title: "Speaking — Long turn", minutes: 15, items: [], speaking: "sp-op-2" },
    ],
  },
  {
    id: "exam-c1",
    level: "C1",
    title: "C1 Practice Test",
    format: "cambridge",
    minutes: 135,
    description: "Format inspiré des épreuves C1 (type « Advanced ») : texte académique, table ronde, transformations exigeantes, essai académique, présentation.",
    sections: [
      { skill: "reading", title: "Reading — Academic text", minutes: 25, items: [], reading: "x-c1-reading" },
      { skill: "listening", title: "Listening — Panel discussion", minutes: 15, items: [], listening: "x-c1-listening" },
      {
        skill: "grammar",
        title: "Use of English",
        minutes: 25,
        items: [
          uc1.transform("As soon as we arrived, it started to rain.", ["No sooner had we arrived than it started to rain.", "Hardly had we arrived when it started to rain."], { keyword: "sooner", instruction: "Key word transformation." }),
          uc1.transform("The committee recommended reviewing the policy.", ["The committee recommended that the policy be reviewed.", "The committee recommended that the policy should be reviewed."], { frame: "The committee recommended that the policy ___", instruction: "Use the subjunctive." }),
          uc1.transform("We only understood the risk when the report came out.", ["It wasn't until the report came out that we understood the risk.", "It was not until the report came out that we understood the risk.", "Only when the report came out did we understand the risk."], { keyword: "until", instruction: "Key word transformation." }),
          uc1.gap("___ (have) reviewed the data, the team revised its forecast.", [["Having"]]),
          uc1.correct("Walking into the room, the lights went out.", ["Walking into the room, I noticed that the lights went out.", "As I walked into the room, the lights went out.", "As I was walking into the room, the lights went out.", "When I walked into the room, the lights went out."]),
          uc1v.mcq("The evidence is ___ — it neither proves nor disproves the theory.", ["inconclusive", "incomplete", "inconsiderate"], 0),
          uc1v.mcq("The minister's comments ___ concerns among scientists.", ["raised", "rose", "arose"], 0),
          uc1v.gap("Planting trees can help ___ the effects of flooding. (= make less severe)", [["mitigate", "reduce", "lessen", "alleviate"]]),
        ],
      },
      { skill: "writing", title: "Writing — Academic essay", minutes: 45, items: [], writing: "w-academic" },
      { skill: "speaking", title: "Speaking — Presentation", minutes: 15, items: [], speaking: "sp-pres-2" },
    ],
  },
  {
    id: "exam-ielts",
    level: "B2+",
    title: "IELTS-style Academic Practice",
    format: "ielts",
    minutes: 120,
    description: "Format inspiré de l'IELTS Academic : lecture académique, écoute d'un séminaire, essai argumentatif, entretien. Résultat exprimé en estimation de band, à titre indicatif uniquement.",
    sections: [
      { skill: "reading", title: "Reading — Academic passage", minutes: 25, items: [], reading: "x-c1-reading" },
      { skill: "listening", title: "Listening — Seminar", minutes: 15, items: [], listening: "seminar-cities" },
      {
        skill: "grammar",
        title: "Grammar & Vocabulary check",
        minutes: 15,
        items: [
          ui.mcq("The results ___ that the trend is slowing.", ["suggests", "suggest", "suggesting"], 1, "results est pluriel → suggest."),
          ui.gap("___ (although) the sample was small, the results were significant.", [["Although", "Even though", "Though", "While"]]),
          ui.mcq("There has been a sharp ___ in unemployment.", ["rise", "raise", "arise"], 0),
          ui.transform("Prices increased dramatically.", ["There was a dramatic increase in prices.", "There was a dramatic rise in prices."], { frame: "There was a dramatic ___", instruction: "Nominalise." }),
          ui.mcq("Choose the best academic phrasing:", ["Lots of people think it's bad.", "It is widely believed to be harmful.", "Everybody hates it."], 1),
        ],
      },
      { skill: "writing", title: "Writing — Task 2 essay", minutes: 40, items: [], writing: "w-essay-tech" },
      { skill: "speaking", title: "Speaking — Part 3 discussion", minutes: 15, items: [], speaking: "sp-q-3" },
    ],
  },
];
