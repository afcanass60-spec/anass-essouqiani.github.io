import type { ReadingText } from "@/lib/types";
import { itemFactory } from "./builders";

/* Textes originaux, de difficulté croissante (B1 → C1). */

const r1 = itemFactory("r-cafe", "B1", "reading", undefined, "b1-re-story");
const repairCafe: ReadingText = {
  id: "repair-cafe",
  title: "The Repair Café",
  level: "B1",
  genre: "story",
  intro: "A short story about a neighbourhood initiative.",
  paragraphs: [
    "When Martha's toaster stopped working, her first thought was to buy a new one. It was only six years old, but that seemed normal: things break, and you replace them. Then her neighbour, Samir, told her about the Repair Café that had opened in the community centre at the end of their street.",
    "Every second Saturday, a group of volunteers sets up tables with tools, sewing machines and soldering irons. Anyone can bring something that is broken — a lamp, a jacket, a bicycle, a laptop — and fix it with the help of an expert. The service is free, although most visitors leave a small donation for coffee and spare parts.",
    "Martha was nervous when she arrived. She had never opened an electrical appliance in her life. A retired engineer called Frank showed her how to unscrew the base of the toaster safely. After ten minutes, they found the problem: a tiny wire had come loose. Frank let Martha reconnect it herself. When the toaster clicked and the coils turned orange, several people at the next table clapped.",
    "\"The point isn't just to save money,\" Frank explained over a cup of tea. \"Every object we repair is one less thing in the bin. And people discover they're capable of more than they think.\" Since it opened two years ago, the café has repaired more than 1,400 items, according to its records.",
    "Martha now volunteers there herself. She has learnt to fix zips and replace bicycle brakes, and she has made friends with people she had walked past for years without saying hello. \"I came for a toaster,\" she says, \"and I found a community.\"",
  ],
  questions: [
    r1.mcq("Why did Martha first want to buy a new toaster?", ["It was very old.", "She thought replacing broken things was normal.", "Samir told her to."], 1),
    r1.mcq("How much does the Repair Café charge?", ["Nothing, but donations are welcome.", "The price of the spare parts.", "A small membership fee."], 0),
    r1.gap("The problem with the toaster was a loose ___.", [["wire"]]),
    r1.mcq("Why did people clap?", ["Frank told a joke.", "The toaster worked again.", "Martha made a donation."], 1),
    r1.mcq("According to Frank, the Repair Café is mainly about…", ["saving money", "reducing waste and building confidence", "selling second-hand objects"], 1),
    r1.mcq("What does the last paragraph suggest about Martha's neighbourhood before the café?", ["People were very friendly.", "Neighbours didn't really know each other.", "There were many community events."], 1, "Inférence : « people she had walked past for years without saying hello »."),
  ],
  summaryTask: { instruction: "Summarise the story in 3–4 sentences in English.", minWords: 40, maxWords: 70 },
  keyVocab: [
    { term: "appliance", meaning: "appareil électroménager" },
    { term: "come loose", meaning: "se desserrer, se détacher" },
    { term: "spare parts", meaning: "pièces détachées" },
    { term: "volunteer", meaning: "bénévole ; faire du bénévolat" },
  ],
};

const r2 = itemFactory("r-sleep", "B1", "reading", undefined, "b1-re-article");
const sleep: ReadingText = {
  id: "teen-sleep",
  title: "Should school start later?",
  level: "B1",
  genre: "news",
  intro: "A news article about school start times.",
  paragraphs: [
    "Teenagers are often accused of being lazy when they struggle to get out of bed in the morning. But scientists say the problem is biological, not a question of character. During adolescence, the body starts producing melatonin — the hormone that makes us feel sleepy — about two hours later than in childhood. As a result, many teenagers simply cannot fall asleep before eleven o'clock at night.",
    "If school starts at eight, a student who needs to leave home at seven gets, at best, eight hours of sleep, while experts recommend between eight and ten for this age group. Over weeks and months, this lack of sleep can affect concentration, mood and even physical health.",
    "Some schools have decided to act. In one district in the United States, secondary schools moved their start time from 7.50 to 8.45. Two years later, attendance had improved and the number of students falling asleep in class had dropped. Teachers also reported fewer arguments and better behaviour.",
    "However, changing the timetable is not always easy. Parents who work early may not be able to drop their children off later, and buses are often shared between primary and secondary schools. Some critics also argue that teenagers would simply go to bed even later.",
    "Researchers disagree. Studies show that when school starts later, students do not go to bed much later — they actually get more sleep. For many health experts, the evidence is now clear enough: our school day should be designed around how the teenage brain really works.",
  ],
  questions: [
    r2.mcq("According to scientists, why do teenagers find it hard to get up?", ["They are lazy.", "Their bodies produce melatonin later.", "They use their phones too much."], 1),
    r2.gap("Experts recommend between ___ and ten hours of sleep for teenagers.", [["8", "eight"]]),
    r2.mcq("What happened in the US district after the change?", ["Attendance improved.", "Students went to bed much later.", "Exam results fell."], 0),
    r2.mcq("Which is NOT mentioned as a difficulty?", ["Parents' work schedules", "Shared buses", "The cost of new teachers"], 2),
    r2.mcq("What is the writer's overall position?", ["Neutral — there is no evidence.", "In favour of later start times.", "Against changing the timetable."], 1),
    r2.mcq("In paragraph 1, 'a question of character' means…", ["a question about personality", "a problem of personality or attitude", "a type of letter"], 1),
  ],
  summaryTask: { instruction: "Summarise the main argument and one counter-argument in 3–4 sentences.", minWords: 40, maxWords: 70 },
  keyVocab: [
    { term: "struggle to", meaning: "avoir du mal à" },
    { term: "attendance", meaning: "assiduité, présence" },
    { term: "drop someone off", meaning: "déposer quelqu'un" },
    { term: "evidence", meaning: "preuves, données" },
  ],
};

const r3 = itemFactory("r-remote", "B1+", "reading", undefined, "b1p-re-professional");
const remote: ReadingText = {
  id: "remote-policy",
  title: "Internal memo: hybrid working policy",
  level: "B1+",
  genre: "professional",
  intro: "An internal memo sent to all employees of a mid-sized company.",
  paragraphs: [
    "To: All staff\nFrom: Human Resources\nSubject: Updated hybrid working policy — effective 1 March",
    "Following the staff survey carried out in December, in which 82% of employees said they wanted to keep some form of remote work, the management team has agreed on a new hybrid policy. We would like to thank everyone who took part in the survey; your feedback has directly shaped the decisions below.",
    "From 1 March, all office-based employees will be expected to work on site at least two days per week. One of these days will be a 'team day', chosen by each department, so that colleagues can meet in person. The other days may be worked from home, subject to your manager's approval.",
    "Please note that this policy does not apply to staff in the warehouse and customer reception, whose roles require a physical presence. We are aware that this may feel unfair, and we are currently exploring other forms of flexibility for these teams, such as compressed hours.",
    "Employees working from home must have a suitable workspace and a secure internet connection. The company will contribute €30 per month towards home-working costs, paid with your salary. Equipment such as laptops and headsets will continue to be provided by IT.",
    "The policy will be reviewed in September. If you have any questions or concerns, please contact your HR business partner or attend one of the information sessions, which will be held on 14 and 21 February.",
  ],
  questions: [
    r3.mcq("Why has the company introduced a new policy?", ["The law has changed.", "A staff survey showed demand for remote work.", "The office is too small."], 1),
    r3.gap("Office staff must work on site at least ___ days a week.", [["2", "two"]]),
    r3.mcq("Who chooses the 'team day'?", ["HR", "Each department", "Each employee"], 1),
    r3.mcq("Why are warehouse staff excluded?", ["They didn't answer the survey.", "Their jobs require them to be physically present.", "They already work from home."], 1),
    r3.mcq("What does the company offer remote workers?", ["A new laptop every year", "A monthly contribution to costs", "Free internet"], 1),
    r3.mcq("The tone of the paragraph about warehouse staff is…", ["dismissive", "apologetic and understanding", "angry"], 1, "« We are aware that this may feel unfair »."),
  ],
  summaryTask: { instruction: "Write a short message (3–4 sentences) to a colleague explaining the main changes.", minWords: 40, maxWords: 80 },
  keyVocab: [
    { term: "effective (date)", meaning: "en vigueur à partir de" },
    { term: "subject to", meaning: "sous réserve de" },
    { term: "compressed hours", meaning: "semaine de travail compressée" },
    { term: "on site", meaning: "sur place" },
  ],
};

const r4 = itemFactory("r-fast-fashion", "B2", "reading", undefined, "b2-re-article");
const fashion: ReadingText = {
  id: "fast-fashion",
  title: "The true cost of a cheap T-shirt",
  level: "B2",
  genre: "news",
  intro: "A feature article about the environmental and social impact of fast fashion.",
  paragraphs: [
    "A T-shirt for five euros seems like a bargain. But economists have a name for the costs that don't appear on the price tag: externalities. In the case of fast fashion, they are considerable, and someone, somewhere, is paying them.",
    "Consider water. Growing enough cotton for a single T-shirt can require around 2,700 litres, roughly what one person drinks in two and a half years. Much of the world's cotton is grown in regions already facing water shortages. Then there is dyeing, which in some countries releases untreated chemicals directly into rivers, turning them unnatural shades of blue and red.",
    "The human cost is equally significant. The collapse of the Rana Plaza factory building in Bangladesh in 2013, which killed more than 1,100 garment workers, drew global attention to unsafe working conditions. Since then, safety agreements have improved standards in many factories, yet wages in the sector often remain far below what campaigners consider a living wage.",
    "Perhaps the most striking change, however, is the sheer quantity of clothing we buy. Shoppers in Europe purchase significantly more garments than they did two decades ago, and keep them for a much shorter time. Some items are worn only a handful of times before being thrown away. Contrary to popular belief, most donated clothes are not resold locally: a large share is exported, and a considerable proportion ends up in landfill.",
    "Brands have responded with 'conscious' collections and recycling schemes. Critics, however, warn that such initiatives can amount to greenwashing if overall production keeps rising. Truly recycling textiles into new fibres remains technically difficult, and only a tiny fraction of clothing is currently recycled in this way.",
    "None of this means consumers must stop buying clothes. But the most sustainable garment, as many designers now admit, is the one already in your wardrobe. Buying less, choosing better quality, repairing and buying second-hand are, for now, far more effective than any label claiming to be green.",
  ],
  questions: [
    r4.mcq("What are 'externalities' in the context of the article?", ["Discounts offered by shops", "Hidden costs not included in the price", "Taxes on imports"], 1),
    r4.mcq("Why does the writer mention the 2,700 litres of water?", ["To compare cotton with other fabrics", "To show the environmental cost of cotton production", "To explain how T-shirts are washed"], 1),
    r4.mcq("What does the writer say about wages since 2013?", ["They have reached a living wage.", "They are still often too low.", "They have doubled."], 1),
    r4.mcq("What popular belief does the writer challenge?", ["That clothes are cheap", "That donated clothes are mostly resold locally", "That cotton needs water"], 1),
    r4.mcq("Why might 'conscious' collections be considered greenwashing?", ["Because they are too expensive", "Because total production continues to increase", "Because they use only cotton"], 1),
    r4.gap("According to the conclusion, the most sustainable garment is the one already in your ___.", [["wardrobe", "closet"]]),
    r4.free("In 2–3 sentences, explain in your own words what the writer recommends and why.", "Reformulation, compréhension de la conclusion.", 30),
  ],
  summaryTask: { instruction: "Summarise the article in 80–120 words, covering environmental, social and consumer aspects.", minWords: 80, maxWords: 120 },
  keyVocab: [
    { term: "bargain", meaning: "bonne affaire" },
    { term: "garment", meaning: "vêtement (formel)" },
    { term: "living wage", meaning: "salaire décent" },
    { term: "landfill", meaning: "décharge" },
    { term: "amount to", meaning: "revenir à, équivaloir à" },
  ],
};

const r5 = itemFactory("r-algorithms", "B2", "reading", undefined, "b2-re-tech");
const algorithms: ReadingText = {
  id: "recommendation-algorithms",
  title: "Who decides what you watch?",
  level: "B2",
  genre: "tech",
  intro: "An explanatory article about recommendation algorithms.",
  paragraphs: [
    "Every time you open a streaming or social media app, an algorithm has already decided what you will see first. These recommendation systems are among the most influential pieces of software ever written, yet most users have only a vague idea of how they work.",
    "At their core, they are prediction machines. By analysing what you have watched, liked, skipped or paused, and comparing it with the behaviour of millions of other users, the system estimates the probability that you will engage with a particular item. Items with the highest predicted engagement are pushed to the top of your feed.",
    "The key word is engagement. Platforms typically earn money from advertising or subscriptions, so their priority is to keep you on the app for as long as possible. This is not necessarily sinister: if you enjoy cooking videos, being shown more cooking videos is convenient. The problem arises when the content that maximises engagement is not the content that is good for us.",
    "Research suggests that emotionally charged content — particularly content that provokes outrage — tends to generate more reactions and shares. An algorithm optimised purely for engagement may therefore end up amplifying divisive material, not because anyone designed it to, but because that is what the data rewarded.",
    "In response, regulators in the European Union now require very large platforms to explain the main parameters of their recommendation systems and to offer at least one option that is not based on profiling. Whether users will actually choose such options is another question: a chronological feed is more transparent, but many people find it less entertaining.",
    "Ultimately, recommendation algorithms reflect the goals of those who build them. Asking what a system is optimised for is perhaps the most useful question a user can ask.",
  ],
  questions: [
    r5.mcq("What is the main function of a recommendation algorithm?", ["To block illegal content", "To predict what users will engage with", "To translate content"], 1),
    r5.mcq("Why do platforms prioritise engagement?", ["Because it is required by law", "Because it generates revenue", "Because users ask for it"], 1),
    r5.mcq("According to the writer, why might algorithms amplify divisive content?", ["Engineers deliberately promote it.", "Such content generates more reactions, which the system rewards.", "Users search for it."], 1),
    r5.mcq("What does the EU require of very large platforms?", ["To stop using algorithms", "To offer an option not based on profiling", "To show only chronological feeds"], 1),
    r5.mcq("In paragraph 3, 'sinister' is closest in meaning to…", ["harmful or evil", "complicated", "expensive"], 0),
    r5.mcq("What is the writer's main recommendation?", ["Delete social media apps", "Ask what a system is optimised for", "Only use chronological feeds"], 1),
  ],
  summaryTask: { instruction: "Summarise how recommendation algorithms work and one risk they pose (60–100 words).", minWords: 60, maxWords: 100 },
  keyVocab: [
    { term: "engage with", meaning: "interagir avec" },
    { term: "outrage", meaning: "indignation" },
    { term: "divisive", meaning: "qui divise, clivant" },
    { term: "profiling", meaning: "profilage" },
  ],
};

const r6 = itemFactory("r-essay-boredom", "B2+", "reading", undefined, "b2p-re-essay");
const boredom: ReadingText = {
  id: "in-praise-of-boredom",
  title: "In praise of boredom",
  level: "B2+",
  genre: "essay",
  intro: "An opinion essay.",
  paragraphs: [
    "There was a time when waiting for a bus meant staring at the street, reading the same advertisement for the tenth time, or simply letting one's mind wander. Today, those empty minutes have all but disappeared. The moment we feel the faintest hint of boredom, we reach for our phones. We have, in effect, eliminated one of the most common human experiences — and I am not convinced we should celebrate.",
    "Boredom has a bad reputation. It is associated with idleness, with wasted time, with the restless child complaining that there is 'nothing to do'. Yet psychologists increasingly regard it not as a defect but as a signal: a sign that our current activity is failing to satisfy us, and a push to look for something more meaningful.",
    "Several studies have found that people who were first given a deliberately dull task — copying numbers from a phone book, for instance — subsequently performed better on tests of creative thinking than those who had not been bored. The explanation seems to be that boredom encourages daydreaming, and daydreaming allows the mind to make unexpected connections.",
    "It would be naive, of course, to romanticise boredom. Chronic boredom, particularly in work or school environments that offer no autonomy, is linked to stress and disengagement. The boredom I am defending is of a different kind: the brief, unstructured pause that we now fill instinctively with notifications.",
    "What is lost when every gap is filled? Perhaps nothing dramatic. But it is worth asking whether our constant stimulation leaves enough room for reflection, for the slow forming of ideas, for the unplanned thought that turns out to matter. The next time you are waiting in a queue, you might try something radical: doing nothing at all.",
  ],
  questions: [
    r6.mcq("What is the writer's main thesis?", ["Phones should be banned in public.", "Short periods of boredom have value that we are losing.", "Boredom is always harmful."], 1),
    r6.mcq("How do psychologists increasingly view boredom?", ["As a signal to seek something more meaningful", "As a mental illness", "As a sign of intelligence"], 0),
    r6.mcq("What did the studies mentioned in paragraph 3 show?", ["Bored participants did better on creativity tests.", "Bored participants slept more.", "Copying numbers improved memory."], 0),
    r6.mcq("Why does the writer mention chronic boredom?", ["To show that all boredom is positive", "To acknowledge a limit to the argument", "To criticise teachers"], 1, "Concession : « It would be naive… »."),
    r6.mcq("The phrase 'all but disappeared' means…", ["completely disappeared", "almost disappeared", "disappeared except at bus stops"], 1),
    r6.mcq("The tone of the final sentence is…", ["ironic and gently provocative", "angry", "purely factual"], 0),
  ],
  summaryTask: { instruction: "Summarise the writer's argument, including the concession, in 80–110 words.", minWords: 80, maxWords: 110 },
  keyVocab: [
    { term: "let one's mind wander", meaning: "laisser vagabonder son esprit" },
    { term: "idleness", meaning: "oisiveté" },
    { term: "daydreaming", meaning: "rêverie" },
    { term: "romanticise", meaning: "idéaliser" },
  ],
};

const r7 = itemFactory("r-microbiome", "C1", "reading", undefined, "c1-re-science");
const microbiome: ReadingText = {
  id: "gut-microbiome",
  title: "The second brain? Reassessing the gut microbiome",
  level: "C1",
  genre: "science",
  intro: "A science feature from a popular science magazine.",
  paragraphs: [
    "Few areas of biology have generated as much excitement — or as many supplements — as research into the gut microbiome, the trillions of bacteria, fungi and viruses that inhabit our digestive system. Headlines have linked it to everything from obesity and allergies to depression and autism. The reality, as is often the case, is considerably more nuanced.",
    "That the microbiome matters is beyond dispute. Gut bacteria help break down fibre that our own enzymes cannot digest, producing short-chain fatty acids that nourish the cells lining the intestine. They train the immune system in early life and occupy ecological niches that might otherwise be colonised by harmful microbes. Patients with recurrent infections of the bacterium *Clostridioides difficile*, for instance, can be cured with remarkable success by a transplant of faecal matter from a healthy donor.",
    "The more speculative claims concern the so-called gut–brain axis. Experiments in which mice raised without any bacteria displayed altered stress responses were genuinely striking, and transferring microbes from anxious mice appeared to make calm mice more anxious. Extrapolating from such findings to humans, however, is fraught with difficulty. Laboratory mice differ from us in diet, physiology and, crucially, in the extent to which their environment can be controlled.",
    "In human studies, the problem is largely one of causality. People with depression may indeed have different gut bacteria, but they also tend to eat differently, sleep differently and take medication — all of which alter the microbiome. Distinguishing cause from consequence requires long-term intervention trials, which remain comparatively scarce and frequently small.",
    "None of this is to dismiss the field, which is arguably still in its infancy. Rather, it is a reminder that a promising correlation is a starting point for research, not a basis for marketing. For the time being, the dietary advice supported by the strongest evidence is reassuringly unglamorous: eat a varied diet rich in fibre, and be sceptical of any product promising to 'reset' your gut.",
  ],
  questions: [
    r7.mcq("What is the writer's overall attitude towards microbiome research?", ["Dismissive", "Enthusiastic without reservation", "Interested but cautious"], 2),
    r7.mcq("Which claim does the writer consider 'beyond dispute'?", ["The microbiome causes depression.", "The microbiome plays important roles in digestion and immunity.", "Supplements reset the gut."], 1),
    r7.mcq("Why is it difficult to apply the mouse experiments to humans?", ["Mice do not have a microbiome.", "Mice differ from humans and live in controlled environments.", "The experiments were never published."], 1),
    r7.mcq("What is the main problem with human studies, according to paragraph 4?", ["They are too expensive.", "It is hard to establish cause and effect.", "Patients refuse to participate."], 1),
    r7.mcq("'Fraught with difficulty' means…", ["full of problems", "slightly difficult", "impossible"], 0),
    r7.mcq("The phrase 'reassuringly unglamorous' implies that the best advice is…", ["exciting and new", "simple and ordinary, which is comforting", "too complicated to follow"], 1),
    r7.free("Explain, in your own words, why 'a promising correlation is a starting point for research, not a basis for marketing'. (2–3 sentences)", "Compréhension fine et reformulation de l'argument central.", 35),
  ],
  summaryTask: { instruction: "Write a 100–130 word summary distinguishing established findings from speculative claims.", minWords: 100, maxWords: 130 },
  keyVocab: [
    { term: "beyond dispute", meaning: "incontestable" },
    { term: "fraught with", meaning: "chargé de, plein de (problèmes)" },
    { term: "in its infancy", meaning: "à ses débuts" },
    { term: "scarce", meaning: "rare, peu nombreux" },
  ],
};

const r8 = itemFactory("r-translation", "C1", "reading", undefined, "c1-re-academic");
const translation: ReadingText = {
  id: "machine-translation",
  title: "Will machine translation make language learning obsolete?",
  level: "C1",
  genre: "academic",
  intro: "Extract from an academic article in applied linguistics.",
  paragraphs: [
    "The rapid improvement of neural machine translation has prompted a recurring question in public debate: if a device can render speech instantly into another language, why should anyone invest years in learning one? This article argues that the question rests on a reductive conception of what language competence entails.",
    "It is undeniable that translation tools have become remarkably effective for transactional purposes — ordering food, reading a menu, understanding a contract's general meaning. For many users, this is precisely what is needed, and the democratising effect of such tools should not be underestimated.",
    "Communication, however, is not merely the transfer of propositional content. A considerable proportion of meaning is conveyed through pragmatics: what is implied rather than said, the degree of politeness or irony, the cultural associations of a particular word. Machine systems have made progress in these areas, yet they remain prone to errors precisely where stakes are highest — in negotiation, in humour, in emotionally sensitive exchanges.",
    "Furthermore, mediated conversation alters the interaction itself. Speakers relying on a device tend to simplify their utterances, pause more and avoid spontaneous turn-taking. The resulting exchanges, while functional, often lack the rapport that characterises direct communication. In professional contexts, this deficit may carry tangible costs: trust, after all, is seldom built through an intermediary.",
    "Finally, learning a language has cognitive and identity-related dimensions that no tool can replicate. Learners gain access to ways of perceiving and categorising experience that differ from those encoded in their first language. To treat language learning solely as a means of information exchange is therefore to overlook much of its value.",
    "It follows that the role of language education is likely to shift rather than disappear. Instruction may place greater emphasis on intercultural competence, pragmatic awareness and critical use of the very tools that were expected to make it redundant.",
  ],
  questions: [
    r8.mcq("What does the author mean by a 'reductive conception' of language competence?", ["A view that oversimplifies what knowing a language involves", "A theory about reducing vocabulary", "A method of teaching grammar"], 0),
    r8.mcq("What does the author concede in paragraph 2?", ["Translation tools are useless.", "Tools are very effective for practical, transactional needs.", "Tools should replace teachers."], 1),
    r8.mcq("According to paragraph 3, where are machine systems most likely to fail?", ["In simple transactions", "Where pragmatic meaning and high stakes are involved", "In reading menus"], 1),
    r8.mcq("What effect does device-mediated conversation have, according to paragraph 4?", ["It makes speakers more spontaneous.", "It tends to reduce rapport.", "It improves trust."], 1),
    r8.mcq("What is the author's conclusion?", ["Language teaching will disappear.", "Language teaching will change its focus.", "Machine translation will stop improving."], 1),
    r8.mcq("'Seldom' in paragraph 4 is closest in meaning to…", ["rarely", "never", "often"], 0),
  ],
  summaryTask: { instruction: "Summarise the author's argument in 100–130 words, using your own words as far as possible.", minWords: 100, maxWords: 130 },
  keyVocab: [
    { term: "entail", meaning: "impliquer, comporter" },
    { term: "pragmatics", meaning: "pragmatique (sens implicite en contexte)" },
    { term: "rapport", meaning: "relation de confiance, entente" },
    { term: "tangible", meaning: "concret, palpable" },
  ],
};

export const readingTexts: ReadingText[] = [repairCafe, sleep, remote, fashion, algorithms, boredom, microbiome, translation];
