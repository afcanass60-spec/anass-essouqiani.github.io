import type { Cefr, Item } from "@/lib/types";
import { itemFactory } from "./builders";

/*
 * Test de positionnement adaptatif.
 * Pour chaque compétence, les items sont présentés par niveau croissant.
 * Si l'apprenant échoue à la majorité des items d'un niveau, la compétence
 * s'arrête (les niveaux supérieurs ne sont pas présentés).
 */

export interface PlacementClip {
  id: string;
  level: Cefr;
  accent: "en-GB" | "en-US";
  text: string;
}

export const placementClips: PlacementClip[] = [
  { id: "pc-1", level: "B1", accent: "en-GB", text: "Hi, it's Jenny. I'm running late — the bus broke down. Can you start the meeting without me? I should be there by half past ten." },
  { id: "pc-2", level: "B1+", accent: "en-US", text: "Attention please. Passengers for flight UA 902 to Chicago: due to a technical issue, boarding will now take place at gate 14, not gate 9. We apologise for the inconvenience." },
  { id: "pc-3", level: "B2", accent: "en-GB", text: "Although the new library has been popular with students, the council admits it underestimated running costs. Opening hours will therefore be reduced on Sundays from next month, a decision that has been criticised by local residents." },
  { id: "pc-4", level: "B2+", accent: "en-US", text: "What I'd question isn't the goal itself — everyone agrees we need cleaner transport — it's the timeline. Asking rural households to give up their cars within five years, when there's barely a bus twice a day, is frankly unrealistic." },
  { id: "pc-5", level: "C1", accent: "en-GB", text: "Had the committee consulted frontline staff from the outset, many of the problems that subsequently emerged could, arguably, have been anticipated. Instead, the reforms were imposed from above, which goes some way towards explaining the resistance they met." },
];

const gB1 = itemFactory("pl-g-b1", "B1", "grammar");
const gB1p = itemFactory("pl-g-b1p", "B1+", "grammar");
const gB2 = itemFactory("pl-g-b2", "B2", "grammar");
const gB2p = itemFactory("pl-g-b2p", "B2+", "grammar");
const gC1 = itemFactory("pl-g-c1", "C1", "grammar");

const vB1 = itemFactory("pl-v-b1", "B1", "vocabulary");
const vB1p = itemFactory("pl-v-b1p", "B1+", "vocabulary");
const vB2 = itemFactory("pl-v-b2", "B2", "vocabulary");
const vB2p = itemFactory("pl-v-b2p", "B2+", "vocabulary");
const vC1 = itemFactory("pl-v-c1", "C1", "vocabulary");

const rB1 = itemFactory("pl-r-b1", "B1", "reading");
const rB2 = itemFactory("pl-r-b2", "B2", "reading");
const rC1 = itemFactory("pl-r-c1", "C1", "reading");

const lB1 = itemFactory("pl-l-b1", "B1", "listening");
const lB1p = itemFactory("pl-l-b1p", "B1+", "listening");
const lB2 = itemFactory("pl-l-b2", "B2", "listening");
const lB2p = itemFactory("pl-l-b2p", "B2+", "listening");
const lC1 = itemFactory("pl-l-c1", "C1", "listening");

export const READING_PASSAGES: Record<string, string> = {
  B1: "Notice — Gym members: from Monday 3 June, the swimming pool will be closed for two weeks for cleaning. During this period, members can use the pool at our Northgate centre free of charge by showing their membership card. Classes in the studio will continue as normal.",
  B2: "For decades, the open-plan office was promoted as a way to encourage collaboration. Yet a widely cited study found that when two companies moved to open-plan spaces, face-to-face interaction actually fell by around 70%, while email use increased. Employees, it seems, responded to the lack of privacy by putting on headphones and withdrawing.",
  C1: "The notion that creativity flourishes only in the absence of constraints is as appealing as it is misleading. Poets have long worked within the strictures of the sonnet; architects must reconcile vision with budget and gravity. Constraints, far from stifling invention, frequently provide the friction against which original solutions are forged.",
};

export interface PlacementEntry {
  item: Item;
  /** Texte de lecture ou extrait audio associé. */
  passage?: string;
  clip?: string;
}

export const placementItems: PlacementEntry[] = [
  // ----- Grammar
  { item: gB1.mcq("I ___ in this company since 2020.", ["work", "have worked", "am working"], 1) },
  { item: gB1.mcq("If it ___ tomorrow, we'll stay at home.", ["will rain", "rains", "rained"], 1) },
  { item: gB1.gap("When I arrived, the film ___ (already / start).", [["had already started"]]) },
  { item: gB1p.mcq("The bridge ___ in 1932.", ["built", "was built", "has built"], 1) },
  { item: gB1p.mcq("She asked me where ___.", ["did I live", "I lived", "do I live"], 1) },
  { item: gB1p.mcq("I'm looking forward to ___ you.", ["see", "seeing", "have seen"], 1) },
  { item: gB2.mcq("If I had known, I ___ you.", ["would tell", "would have told", "told"], 1) },
  { item: gB2.mcq("He ___ have left already — his coat is still here.", ["must", "can't", "should"], 1) },
  { item: gB2.gap("By next June, I ___ (finish) my degree.", [["will have finished", "'ll have finished"]]) },
  { item: gB2p.mcq("Not only ___ late, but he also forgot the documents.", ["he arrived", "did he arrive", "he did arrive"], 1) },
  { item: gB2p.mcq("___ the rain, the match went ahead.", ["Although", "Despite", "However"], 1) },
  { item: gB2p.mcq("What I need ___ a long holiday.", ["it is", "is", "are"], 1) },
  { item: gC1.mcq("The board insisted that the director ___ immediately.", ["resigns", "resign", "resigned"], 1) },
  { item: gC1.mcq("___ the report, she sent it to the client.", ["Having finished", "Finished", "To finish"], 0) },
  { item: gC1.mcq("It's high time we ___ this problem seriously.", ["take", "took", "will take"], 1) },

  // ----- Vocabulary
  { item: vB1.mcq("We need to finish before the ___ on Friday.", ["deadline", "headline", "timeline"], 0) },
  { item: vB1.mcq("I'm going to ___ for a job at the hospital.", ["apply", "ask", "demand"], 0) },
  { item: vB1p.mcq("Could you ___ my dog while I'm away?", ["look for", "look after", "look up"], 1) },
  { item: vB1p.mcq("The flight was ___ because of the snow.", ["delayed", "late", "slow"], 0) },
  { item: vB2.mcq("We consulted all the ___ before making a decision.", ["stakeholders", "shareholders", "bystanders"], 0) },
  { item: vB2.mcq("Long hours with no breaks can lead to ___.", ["burnout", "breakdown", "breakthrough"], 0) },
  { item: vB2p.mcq("The novel was praised as ___ — it really makes you think.", ["thought-provoking", "breathtaking", "heart-breaking"], 0) },
  { item: vB2p.mcq("Many people struggle to make ends ___.", ["meet", "join", "match"], 0) },
  { item: vC1.mcq("The results are only a ___, not proof of causation.", ["correlation", "corporation", "collaboration"], 0) },
  { item: vC1.mcq("Planting trees can help ___ the effects of climate change.", ["mitigate", "militate", "migrate"], 0) },

  // ----- Reading
  { passage: "B1", item: rB1.mcq("What can members do while the pool is closed?", ["Swim for free at another centre", "Get a refund", "Join extra studio classes"], 0) },
  { passage: "B1", item: rB1.mcq("How long will the pool be closed?", ["Two days", "Two weeks", "Two months"], 1) },
  { passage: "B2", item: rB2.mcq("What was the unexpected result of the study?", ["People talked face to face more.", "Face-to-face interaction decreased.", "Productivity doubled."], 1) },
  { passage: "B2", item: rB2.mcq("Why did employees wear headphones, according to the text?", ["To listen to music", "To compensate for the lack of privacy", "Because it was required"], 1) },
  { passage: "C1", item: rC1.mcq("What is the writer's main claim?", ["Constraints destroy creativity.", "Constraints can stimulate creativity.", "Poets should avoid sonnets."], 1) },
  { passage: "C1", item: rC1.mcq("'As appealing as it is misleading' suggests the idea is…", ["attractive but wrong", "boring but true", "popular and correct"], 0) },

  // ----- Listening
  { clip: "pc-1", item: lB1.mcq("Why is Jenny late?", ["She overslept.", "Her bus broke down.", "She missed the train."], 1) },
  { clip: "pc-2", item: lB1p.gap("Boarding will now take place at gate ___.", [["14", "fourteen"]]) },
  { clip: "pc-3", item: lB2.mcq("Why will opening hours be reduced?", ["Students complained.", "Running costs were higher than expected.", "The building needs repairs."], 1) },
  { clip: "pc-4", item: lB2p.mcq("What does the speaker criticise?", ["The goal of cleaner transport", "The timeline of the plan", "Rural bus drivers"], 1) },
  { clip: "pc-5", item: lC1.mcq("What does the speaker suggest about the reforms?", ["They were successful.", "Problems could have been foreseen with consultation.", "Staff designed them."], 1) },
];
