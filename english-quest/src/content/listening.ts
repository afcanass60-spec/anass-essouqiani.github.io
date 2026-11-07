import type { ListeningTrack } from "@/lib/types";
import { itemFactory } from "./builders";

/*
 * Scripts originaux. L'audio est produit par la synthèse vocale du navigateur
 * (Web Speech API) avec une voix par locuteur et l'accent indiqué lorsque le
 * système en dispose. Les questions évaluent la compréhension globale, le
 * détail et l'implicite.
 */

const t1 = itemFactory("l-flat", "B1", "listening", undefined, "b1-li-everyday");
const flatViewing: ListeningTrack = {
  id: "flat-viewing",
  title: "Viewing a flat",
  level: "B1",
  genre: "conversation",
  context: "Chloe visits a flat in Manchester with the landlord, Mr Davies.",
  baseRate: 0.9,
  speakers: [
    { name: "Mr Davies", accent: "en-GB", gender: "m" },
    { name: "Chloe", accent: "en-GB", gender: "f" },
  ],
  lines: [
    { speaker: 0, text: "Come in, come in. So, this is the living room. It gets a lot of light in the afternoon." },
    { speaker: 1, text: "Oh, it's bigger than it looked in the photos. Is the furniture included?" },
    { speaker: 0, text: "Most of it, yes. The sofa and the table stay, but the previous tenant is taking the bookshelves." },
    { speaker: 1, text: "That's fine, I've got my own. And how much is the rent exactly? The advert said eight hundred and fifty." },
    { speaker: 0, text: "That's right, eight hundred and fifty a month, but that doesn't include bills. Gas and electricity are usually around ninety pounds in winter." },
    { speaker: 1, text: "OK. And is there a deposit?" },
    { speaker: 0, text: "Yes, five weeks' rent, which is protected in a government scheme, so you get it back when you leave, as long as there's no damage." },
    { speaker: 1, text: "Right. How far is it from the tram stop? I work in the city centre." },
    { speaker: 0, text: "It's a five-minute walk, and the tram gets you into town in about fifteen minutes." },
    { speaker: 1, text: "That's perfect. When would it be available?" },
    { speaker: 0, text: "From the first of next month. But I've got two other people coming to see it tomorrow, so if you're interested, let me know fairly quickly." },
    { speaker: 1, text: "I'll talk to my partner tonight and call you first thing tomorrow morning." },
  ],
  questions: [
    t1.mcq("What will the previous tenant take?", ["The sofa", "The bookshelves", "The table"], 1),
    t1.gap("The monthly rent is £___.", [["850", "eight hundred and fifty"]]),
    t1.mcq("What does the rent NOT include?", ["The furniture", "The deposit", "Gas and electricity"], 2),
    t1.mcq("How long does it take to get into town by tram?", ["5 minutes", "15 minutes", "50 minutes"], 1),
    t1.mcq("Why does Mr Davies suggest Chloe decides quickly?", ["The rent will go up.", "Other people are interested in the flat.", "He is leaving the country."], 1, "Implicite : « two other people coming to see it tomorrow »."),
  ],
  expressions: [
    { en: "Is the furniture included?", fr: "Les meubles sont-ils compris ?" },
    { en: "bills", fr: "les charges (gaz, électricité…)" },
    { en: "a deposit", fr: "une caution, un dépôt de garantie" },
    { en: "first thing tomorrow morning", fr: "demain à la première heure" },
  ],
};

const t2 = itemFactory("l-standup", "B1", "listening", undefined, "b1-li-work");
const standup: ListeningTrack = {
  id: "team-standup",
  title: "Monday stand-up meeting",
  level: "B1",
  genre: "professional",
  context: "A short team meeting at a software company in Boston.",
  baseRate: 0.95,
  speakers: [
    { name: "Priya (team lead)", accent: "en-US", gender: "f" },
    { name: "Marcus", accent: "en-US", gender: "m" },
    { name: "Lena", accent: "intl", gender: "f" },
  ],
  lines: [
    { speaker: 0, text: "Morning, everyone. Let's keep this quick — we've got the client demo on Thursday. Marcus, do you want to start?" },
    { speaker: 1, text: "Sure. Last week I finished the login page, and I've fixed most of the bugs the testers reported. Today I'm working on the password reset feature." },
    { speaker: 0, text: "Great. Any blockers?" },
    { speaker: 1, text: "Kind of. I'm still waiting for the new email templates from the design team, so I can't test the whole flow yet." },
    { speaker: 0, text: "OK, I'll chase them after this meeting. Lena?" },
    { speaker: 2, text: "I've been working on the dashboard. The charts are done, but the page loads too slowly — about six seconds. I think the problem is the database queries." },
    { speaker: 0, text: "Six seconds is way too long for the demo. Can you and Marcus look at it together this afternoon?" },
    { speaker: 2, text: "Yes, no problem. If we can't fix it by Wednesday, we could show the client a version with sample data." },
    { speaker: 0, text: "Good idea, let's keep that as plan B. OK, so to sum up: Marcus on password reset, Lena and Marcus on performance this afternoon, and I'll talk to design. Thanks, everyone." },
  ],
  questions: [
    t2.mcq("When is the client demo?", ["Monday", "Wednesday", "Thursday"], 2),
    t2.mcq("Why can't Marcus test the whole password reset process?", ["He has too many bugs to fix.", "He is waiting for email templates.", "The testers are on holiday."], 1),
    t2.gap("The dashboard takes about ___ seconds to load.", [["6", "six"]]),
    t2.mcq("What is 'plan B'?", ["Postponing the demo", "Showing a version with sample data", "Hiring a database expert"], 1),
    t2.mcq("What will Priya do after the meeting?", ["Contact the design team", "Fix the database", "Call the client"], 0, "« I'll chase them » = je vais les relancer."),
  ],
  expressions: [
    { en: "Any blockers?", fr: "Des points bloquants ?" },
    { en: "I'll chase them.", fr: "Je vais les relancer." },
    { en: "plan B", fr: "solution de repli" },
    { en: "to sum up", fr: "pour résumer" },
  ],
};

const t3 = itemFactory("l-airport", "B1+", "listening", undefined, "b1p-li-announcements");
const airport: ListeningTrack = {
  id: "airport-problem",
  title: "A problem at the airport",
  level: "B1+",
  genre: "conversation",
  context: "Tom's flight has been cancelled. He talks to an airline agent at Dublin Airport.",
  baseRate: 1,
  speakers: [
    { name: "Agent", accent: "intl", gender: "f" },
    { name: "Tom", accent: "en-GB", gender: "m" },
  ],
  lines: [
    { speaker: 1, text: "Hi. My flight to Lyon has just been cancelled, and nobody seems to know what's going on." },
    { speaker: 0, text: "I'm really sorry about that, sir. It's due to the air traffic control strike in France. Could I see your booking reference?" },
    { speaker: 1, text: "Here you go. I've got an important meeting tomorrow afternoon, so I really need to get there tonight if possible." },
    { speaker: 0, text: "Let me check. Unfortunately, all our direct flights to Lyon today are cancelled. I could put you on a flight to Geneva at nine forty tonight. From there, it's about two hours by train to Lyon." },
    { speaker: 1, text: "Geneva… That could work. Would I have to pay for the train?" },
    { speaker: 0, text: "Under EU rules, we'll reimburse reasonable transport costs. Just keep your receipt and fill in the online claim form." },
    { speaker: 1, text: "OK. And what about my suitcase? I've already checked it in." },
    { speaker: 0, text: "It'll be transferred automatically to the Geneva flight. You'll collect it there." },
    { speaker: 1, text: "Right. And I've been here since three o'clock — is there anything for food?" },
    { speaker: 0, text: "Of course. Here's a meal voucher for fifteen euros. You can use it at any restaurant after security." },
    { speaker: 1, text: "Thanks. You've been very helpful — it's not your fault, I know." },
  ],
  questions: [
    t3.mcq("Why was the flight cancelled?", ["Bad weather", "A strike", "A technical problem"], 1),
    t3.gap("The new flight goes to ___.", [["Geneva"]]),
    t3.mcq("How will Tom get his money back for the train?", ["The agent pays him in cash.", "He fills in an online form with his receipt.", "It's included in his ticket."], 1),
    t3.mcq("What does Tom receive for food?", ["A free meal in the lounge", "A €15 voucher", "Nothing"], 1),
    t3.mcq("How does Tom feel at the end?", ["Angry with the agent", "Grateful despite the situation", "Indifferent"], 1, "« You've been very helpful — it's not your fault »."),
  ],
  expressions: [
    { en: "booking reference", fr: "numéro de réservation" },
    { en: "we'll reimburse", fr: "nous rembourserons" },
    { en: "fill in a claim form", fr: "remplir un formulaire de réclamation" },
    { en: "after security", fr: "après le contrôle de sécurité" },
  ],
};

const t4 = itemFactory("l-podcast", "B1+", "listening", undefined, "b1p-li-podcast");
const podcast: ListeningTrack = {
  id: "habits-podcast",
  title: "Podcast: Why habits fail",
  level: "B1+",
  genre: "podcast",
  context: "Two hosts of a self-improvement podcast discuss why New Year's resolutions often fail.",
  baseRate: 1,
  speakers: [
    { name: "Jake", accent: "en-US", gender: "m" },
    { name: "Nora", accent: "en-US", gender: "f" },
  ],
  lines: [
    { speaker: 0, text: "Welcome back to Small Steps. Nora, it's February, which means most people have already given up on their New Year's resolutions." },
    { speaker: 1, text: "Right, and there's actually research on this. One study found that about a quarter of people quit their resolutions within the first week." },
    { speaker: 0, text: "Within a week! So what's going wrong?" },
    { speaker: 1, text: "The main problem is that people set goals that are way too big. 'I'm going to run every day' or 'I'm going to learn Spanish this year.' Those are outcomes, not habits." },
    { speaker: 0, text: "So what should they do instead?" },
    { speaker: 1, text: "Make the habit so small it's almost ridiculous. Instead of running for an hour, just put your running shoes on every morning. Instead of learning Spanish, do five minutes on an app after breakfast." },
    { speaker: 0, text: "I like the 'after breakfast' part. You're attaching the new habit to something you already do." },
    { speaker: 1, text: "Exactly. Psychologists call it habit stacking. Your existing routine becomes the trigger. And the other key thing is to track it — even just a tick on a calendar. Seeing a chain of ticks is surprisingly motivating." },
    { speaker: 0, text: "And if you miss a day?" },
    { speaker: 1, text: "Never miss twice. Missing once is an accident. Missing twice is the start of a new habit — the wrong one." },
  ],
  questions: [
    t4.mcq("According to the study, how many people quit within the first week?", ["About 25%", "About 50%", "Almost everyone"], 0, "« a quarter » = un quart."),
    t4.mcq("What is the main mistake people make?", ["They don't buy the right equipment.", "Their goals are too big.", "They start in January."], 1),
    t4.gap("Attaching a new habit to an existing routine is called habit ___.", [["stacking"]]),
    t4.mcq("Why does Nora recommend ticking a calendar?", ["It is required by apps.", "Seeing progress is motivating.", "It helps you sleep."], 1),
    t4.mcq("What does 'never miss twice' mean?", ["Don't skip the habit two days in a row.", "Do the habit twice a day.", "Never repeat a mistake at work."], 0),
  ],
  expressions: [
    { en: "to give up on something", fr: "renoncer à quelque chose" },
    { en: "way too big", fr: "beaucoup trop ambitieux" },
    { en: "the trigger", fr: "le déclencheur" },
    { en: "surprisingly motivating", fr: "étonnamment motivant" },
  ],
};

const t5 = itemFactory("l-news", "B2", "listening", undefined, "b2-li-news");
const news: ListeningTrack = {
  id: "news-four-day-week",
  title: "News report: the four-day week",
  level: "B2",
  genre: "news",
  context: "A radio news report from the UK about a four-day working week trial.",
  baseRate: 1.05,
  speakers: [
    { name: "Newsreader", accent: "en-GB", gender: "f" },
    { name: "Reporter", accent: "en-GB", gender: "m" },
    { name: "Business owner", accent: "intl", gender: "f" },
  ],
  lines: [
    { speaker: 0, text: "The results of the largest trial of a four-day working week have been published today. Our business correspondent has the details." },
    { speaker: 1, text: "Sixty-one companies took part in the six-month experiment, with staff working four days a week for the same pay. At the end of the trial, fifty-six of them decided to continue, and eighteen made the change permanent." },
    { speaker: 1, text: "According to the researchers, revenue stayed broadly the same during the trial, while the number of employees taking sick days fell by around two thirds. Staff reported lower levels of stress and burnout." },
    { speaker: 2, text: "Honestly, I was sceptical at first. But we cut unnecessary meetings, we stopped answering emails all day, and productivity actually went up. Recruitment has also become much easier — candidates love it." },
    { speaker: 1, text: "However, not everyone is convinced. Critics point out that most participating companies were small and worked in offices. They argue the model would be far harder to apply in sectors such as healthcare, retail or manufacturing, where services must be provided every day." },
    { speaker: 0, text: "And is the government likely to act on these findings?" },
    { speaker: 1, text: "Not in the short term. Ministers say they welcome the research but have no plans to change employment law. For now, it's up to individual employers." },
  ],
  questions: [
    t5.gap("___ companies continued the four-day week after the trial.", [["56", "fifty-six", "fifty six"]]),
    t5.mcq("What happened to sick days?", ["They fell by about two thirds.", "They doubled.", "They stayed the same."], 0),
    t5.mcq("What did the business owner change to make the system work?", ["She hired more staff.", "She reduced meetings and constant emailing.", "She reduced salaries."], 1),
    t5.mcq("What is the critics' main argument?", ["Productivity fell.", "The trial was too long.", "The results may not apply to all sectors."], 2),
    t5.mcq("What is the government's position?", ["It will introduce a new law next year.", "It welcomes the research but won't change the law for now.", "It opposes the four-day week."], 1),
  ],
  expressions: [
    { en: "for the same pay", fr: "pour le même salaire" },
    { en: "broadly the same", fr: "globalement inchangé" },
    { en: "I was sceptical at first", fr: "j'étais sceptique au début" },
    { en: "it's up to individual employers", fr: "c'est à chaque employeur de décider" },
  ],
};

const t6 = itemFactory("l-interview", "B2", "listening", undefined, "b2-li-interview");
const interview: ListeningTrack = {
  id: "job-interview",
  title: "Job interview: project manager",
  level: "B2",
  genre: "interview",
  context: "Daniel interviews Amira for a project manager position at a renewable energy company.",
  baseRate: 1,
  speakers: [
    { name: "Daniel (interviewer)", accent: "en-GB", gender: "m" },
    { name: "Amira (candidate)", accent: "intl", gender: "f" },
  ],
  lines: [
    { speaker: 0, text: "Thanks for coming in, Amira. Let's start with an easy one: why are you interested in this role?" },
    { speaker: 1, text: "Well, I've spent the last five years managing IT projects in banking, and while I've learnt a lot, I'd like my work to have a more direct impact. Renewable energy is a sector I genuinely care about." },
    { speaker: 0, text: "Can you tell me about a project that didn't go to plan, and what you did?" },
    { speaker: 1, text: "Sure. Two years ago, we were migrating a payment system, and halfway through, our main supplier went bankrupt. We were suddenly three months behind schedule." },
    { speaker: 1, text: "Rather than panicking, I got the stakeholders together, we re-prioritised the features, and we delivered the essential part on time. The rest followed six weeks later." },
    { speaker: 0, text: "Impressive. What would you say is your main weakness?" },
    { speaker: 1, text: "I used to find it hard to delegate — I wanted to control everything. These days I'm much better at trusting my team, partly because I've seen how much more we achieve when people feel responsible." },
    { speaker: 0, text: "This role involves a lot of travel to wind farms in Scotland. Would that be a problem?" },
    { speaker: 1, text: "Not at all. Actually, I'd see it as an advantage — I think you only really understand a project when you've seen it on the ground." },
    { speaker: 0, text: "Great. Do you have any questions for us?" },
    { speaker: 1, text: "Yes — how do you measure success for this role in the first six months?" },
  ],
  questions: [
    t6.mcq("Why does Amira want to change jobs?", ["She wants a higher salary.", "She wants her work to have more impact.", "She was made redundant."], 1),
    t6.mcq("What caused the delay in her past project?", ["A supplier went bankrupt.", "The client changed its mind.", "A team member left."], 0),
    t6.mcq("How did she solve the problem?", ["She asked for more money.", "She re-prioritised features with stakeholders.", "She cancelled the project."], 1),
    t6.mcq("What weakness does she describe?", ["She is often late.", "She used to struggle to delegate.", "She doesn't like travelling."], 1),
    t6.mcq("What can we infer about Amira from her final question?", ["She is worried about the salary.", "She is focused on results and expectations.", "She wants to work from home."], 1, "Question d'inférence."),
  ],
  expressions: [
    { en: "a project that didn't go to plan", fr: "un projet qui ne s'est pas déroulé comme prévu" },
    { en: "behind schedule", fr: "en retard sur le planning" },
    { en: "on the ground", fr: "sur le terrain" },
    { en: "I genuinely care about…", fr: "… me tient vraiment à cœur" },
  ],
};

const t7 = itemFactory("l-debate", "B2+", "listening", undefined, "b2p-li-debate");
const debate: ListeningTrack = {
  id: "debate-cars-city",
  title: "Debate: should cars be banned from city centres?",
  level: "B2+",
  genre: "debate",
  context: "A local radio debate between a city councillor and a shop owners' representative.",
  baseRate: 1.05,
  speakers: [
    { name: "Host", accent: "en-GB", gender: "m" },
    { name: "Councillor Hayes", accent: "en-GB", gender: "f" },
    { name: "Mr Ortiz", accent: "en-US", gender: "m" },
  ],
  lines: [
    { speaker: 0, text: "The council wants to ban private cars from the historic centre by 2027. Councillor Hayes, why?" },
    { speaker: 1, text: "Quite simply because our air is making people ill. Nitrogen dioxide levels in the centre regularly exceed legal limits. Cities that have done this — Ghent, Pontevedra — have seen cleaner air, fewer accidents and, crucially, more people walking into shops, not fewer." },
    { speaker: 0, text: "Mr Ortiz, you represent local businesses. Are you persuaded?" },
    { speaker: 2, text: "With respect, no. Those examples are cherry-picked. Pontevedra is a small town. Many of our customers are elderly or come from villages with no public transport. If they can't park, they'll simply drive to the out-of-town shopping centre instead." },
    { speaker: 1, text: "Nobody is suggesting we abandon those customers. The plan includes park-and-ride sites, free shuttle buses and exemptions for disabled drivers and deliveries." },
    { speaker: 2, text: "Plans are one thing. But when the roadworks start, it's shops like mine that'll pay the price. Some won't survive two years of disruption." },
    { speaker: 0, text: "So is there any middle ground?" },
    { speaker: 2, text: "A phased approach. Start with car-free weekends, measure the impact on footfall, and then decide. That's all we're asking for." },
    { speaker: 1, text: "I'm actually not opposed to a pilot phase, as long as it's not used as an excuse to delay indefinitely. Public health can't wait forever." },
  ],
  questions: [
    t7.mcq("What is the councillor's main argument?", ["Traffic jams cost money.", "Air pollution is harming people's health.", "The centre needs more car parks."], 1),
    t7.mcq("What does Mr Ortiz mean when he says the examples are 'cherry-picked'?", ["They were chosen to support one side.", "They are agricultural towns.", "They are very recent."], 0),
    t7.mcq("Which measure is NOT mentioned in the council's plan?", ["Park-and-ride sites", "Free shuttle buses", "Lower taxes for shops"], 2),
    t7.gap("Mr Ortiz suggests starting with car-free ___.", [["weekends"]]),
    t7.mcq("What is the councillor's attitude to a pilot phase at the end?", ["She refuses it completely.", "She accepts it under one condition.", "She says it already exists."], 1, "« as long as it's not used as an excuse to delay »."),
  ],
  expressions: [
    { en: "with respect, …", fr: "sauf votre respect, …" },
    { en: "cherry-picked", fr: "choisi de façon sélective / partiale" },
    { en: "pay the price", fr: "en payer le prix" },
    { en: "is there any middle ground?", fr: "y a-t-il un compromis possible ?" },
    { en: "footfall", fr: "fréquentation (nombre de passants / clients)" },
  ],
};

const t8 = itemFactory("l-lecture", "C1", "listening", undefined, "c1-li-lecture");
const lecture: ListeningTrack = {
  id: "lecture-memory",
  title: "Lecture: how memory really works",
  level: "C1",
  genre: "lecture",
  context: "Extract from an introductory cognitive psychology lecture at a university.",
  baseRate: 1.05,
  speakers: [{ name: "Dr Okafor", accent: "intl", gender: "m" }],
  lines: [
    { speaker: 0, text: "Today I want to challenge a metaphor most of you probably hold without realising it: the idea that memory works like a video recorder, faithfully storing events so that we can play them back later." },
    { speaker: 0, text: "In reality, remembering is a reconstructive process. Each time you recall an event, you rebuild it from fragments, and in doing so you can alter it. This is why eyewitness testimony, however confident, is notoriously unreliable." },
    { speaker: 0, text: "Elizabeth Loftus demonstrated this in the 1970s. Participants watched a film of a car accident and were then asked how fast the cars were going when they either 'hit' or 'smashed into' each other. Those who heard 'smashed' gave higher estimates, and a week later they were more than twice as likely to report seeing broken glass, although there was none." },
    { speaker: 0, text: "Now, the implications for learning are significant. If memory is reconstructive, then the act of retrieval itself strengthens it. Rereading your notes feels productive — the material looks familiar — but familiarity is not the same as being able to recall. Testing yourself, on the other hand, forces reconstruction, and that is precisely what consolidates the memory." },
    { speaker: 0, text: "Combine retrieval practice with spacing — reviewing material at increasing intervals — and you have arguably the two most robust findings in the entire field of educational psychology." },
    { speaker: 0, text: "For next week, I'd like you to read chapter four, and, rather than highlighting, close the book after each section and write down everything you can remember." },
  ],
  questions: [
    t8.mcq("What metaphor does the lecturer reject?", ["Memory as a muscle", "Memory as a video recorder", "Memory as a library"], 1),
    t8.mcq("In the Loftus experiment, what effect did the word 'smashed' have?", ["Participants remembered nothing.", "Participants estimated higher speeds and recalled false details.", "Participants refused to answer."], 1),
    t8.mcq("Why, according to the lecturer, is rereading misleading?", ["It takes too long.", "Familiarity is mistaken for the ability to recall.", "Notes are often wrong."], 1),
    t8.gap("Reviewing material at increasing intervals is called ___.", [["spacing", "spaced repetition", "spaced practice"]]),
    t8.mcq("What does the homework task aim to develop?", ["Retrieval practice", "Speed reading", "Note-taking with colours"], 0, "Fermer le livre et écrire ce dont on se souvient = retrieval practice."),
  ],
  expressions: [
    { en: "a reconstructive process", fr: "un processus de reconstruction" },
    { en: "notoriously unreliable", fr: "notoirement peu fiable" },
    { en: "the implications are significant", fr: "les implications sont importantes" },
    { en: "arguably the most robust findings", fr: "sans doute les résultats les plus solides" },
  ],
};

const t9 = itemFactory("l-negotiation", "B2+", "listening", undefined, "b2p-li-work");
const negotiation: ListeningTrack = {
  id: "supplier-negotiation",
  title: "Negotiating with a supplier",
  level: "B2+",
  genre: "professional",
  context: "A purchasing manager negotiates a contract renewal with a packaging supplier by video call.",
  baseRate: 1,
  speakers: [
    { name: "Sophie (buyer)", accent: "en-GB", gender: "f" },
    { name: "Raj (supplier)", accent: "intl", gender: "m" },
  ],
  lines: [
    { speaker: 1, text: "So, as I mentioned in my email, because of the rise in raw material costs, we'd need to increase our prices by eight per cent from January." },
    { speaker: 0, text: "I appreciate your transparency, Raj, but eight per cent is simply not something we can absorb. We've had competing offers that are actually below your current price." },
    { speaker: 1, text: "I understand. But you also know our delivery record — we haven't missed a single deadline in three years. Not every supplier can say that." },
    { speaker: 0, text: "That's true, and that's why we'd like to continue working with you. So let's see if we can find something that works for both of us. What if we committed to a two-year contract instead of one?" },
    { speaker: 1, text: "That would certainly help with our planning. On a two-year basis, I could probably bring it down to five per cent." },
    { speaker: 0, text: "If we also increase our order volume by around fifteen per cent, could you go to three?" },
    { speaker: 1, text: "Three is tight… I'd need to check with my director. Could we say four, with payment within thirty days rather than sixty?" },
    { speaker: 0, text: "Four with thirty-day payment terms… I think I can sell that internally. Send me a revised proposal and we'll go through the details on Friday." },
    { speaker: 1, text: "Sounds good. I'll have it to you by Thursday." },
  ],
  questions: [
    t9.gap("The supplier initially asks for a ___ per cent price increase.", [["8", "eight"]]),
    t9.mcq("What argument does Raj use to justify his price?", ["His products are eco-friendly.", "His company is very reliable on deliveries.", "His competitors are more expensive."], 1),
    t9.mcq("What does Sophie offer first?", ["A longer contract", "Faster payment", "A bigger order"], 0),
    t9.gap("They finally agree on an increase of ___ per cent.", [["4", "four"]]),
    t9.mcq("What does Sophie give in exchange for the final price?", ["Payment within 30 days", "Exclusive rights", "A three-year contract"], 0),
  ],
  expressions: [
    { en: "something we can absorb", fr: "quelque chose que nous pouvons encaisser / supporter" },
    { en: "something that works for both of us", fr: "une solution qui convienne aux deux parties" },
    { en: "bring it down to…", fr: "le ramener à…" },
    { en: "I can sell that internally", fr: "je peux le faire accepter en interne" },
  ],
};

const t10 = itemFactory("l-seminar", "C1", "listening", undefined, "c1-li-academic");
const seminar: ListeningTrack = {
  id: "seminar-cities",
  title: "Seminar: the 15-minute city",
  level: "C1",
  genre: "academic",
  context: "Three postgraduate students discuss an urban planning concept in a seminar.",
  baseRate: 1.1,
  speakers: [
    { name: "Hannah", accent: "en-US", gender: "f" },
    { name: "Kwame", accent: "intl", gender: "m" },
    { name: "Oliver", accent: "en-GB", gender: "m" },
  ],
  lines: [
    { speaker: 0, text: "So the core premise of the fifteen-minute city is that residents should be able to reach most daily necessities — work, school, healthcare, shops — within a fifteen-minute walk or cycle." },
    { speaker: 1, text: "Which sounds uncontroversial in principle. What I find striking, though, is how polarised the debate has become online. Some people genuinely believe it's a plot to restrict their freedom of movement." },
    { speaker: 2, text: "I think we should distinguish between the conspiracy theories, which are frankly baseless, and some legitimate criticisms. One is gentrification: once a neighbourhood becomes very convenient, property prices rise and the people it was meant to serve get priced out." },
    { speaker: 0, text: "That's a fair point, but it's not unique to this model. Any improvement to a neighbourhood — a new metro line, a park — has that effect unless it's accompanied by housing policy." },
    { speaker: 1, text: "Agreed. I'd add that the concept was designed with dense European cities in mind. Transplanting it to a sprawling, car-dependent city is a different challenge altogether — you can't retrofit density overnight." },
    { speaker: 2, text: "So perhaps the question isn't whether the model is good or bad, but under what conditions it's achievable and equitable." },
    { speaker: 0, text: "Which might make a good research question for our group paper, actually." },
  ],
  questions: [
    t10.mcq("What is the basic idea of the 15-minute city?", ["Reducing working hours", "Having essential services close to home", "Building faster public transport"], 1),
    t10.mcq("How does Oliver view the conspiracy theories?", ["As partly true", "As completely unfounded", "As an interesting research topic"], 1, "« frankly baseless »."),
    t10.mcq("What legitimate criticism does Oliver raise?", ["Gentrification and rising prices", "Pollution", "Lack of schools"], 0),
    t10.mcq("What is Hannah's response to this criticism?", ["She denies it exists.", "She says it applies to many urban improvements.", "She says it only happens in the US."], 1),
    t10.mcq("What does Kwame imply about car-dependent cities?", ["The model is easy to apply there.", "The model would require long-term transformation.", "They already follow the model."], 1, "« you can't retrofit density overnight »."),
  ],
  expressions: [
    { en: "the core premise", fr: "le principe fondamental" },
    { en: "uncontroversial in principle", fr: "consensuel sur le principe" },
    { en: "get priced out", fr: "être chassé par la hausse des prix" },
    { en: "a different challenge altogether", fr: "un tout autre défi" },
    { en: "achievable and equitable", fr: "réalisable et équitable" },
  ],
};

export const listeningTracks: ListeningTrack[] = [
  flatViewing,
  standup,
  airport,
  podcast,
  news,
  interview,
  negotiation,
  debate,
  lecture,
  seminar,
];
