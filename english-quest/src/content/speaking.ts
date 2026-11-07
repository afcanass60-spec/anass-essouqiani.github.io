import type { SpeakingTask } from "@/lib/types";

/*
 * Les 10 types d'exercices du Speaking Studio.
 * repeat / read-aloud : comparaison mot à mot avec la transcription obtenue
 * par la reconnaissance vocale (intelligibilité), débit, pauses.
 * Autres : transcription + métriques analysées par l'IA (si configurée).
 */
export const speakingTasks: SpeakingTask[] = [
  // 1. Répéter une phrase entendue
  { id: "sp-rep-1", kind: "repeat", level: "B1", title: "Ordering food", instructionFr: "Écoutez la phrase puis répétez-la.", target: "Could I have the chicken salad, please, but without onions?", seconds: 10 },
  { id: "sp-rep-2", kind: "repeat", level: "B1", title: "Asking for directions", instructionFr: "Écoutez la phrase puis répétez-la.", target: "Excuse me, is there a pharmacy near here?", seconds: 10 },
  { id: "sp-rep-3", kind: "repeat", level: "B1+", title: "At work", instructionFr: "Écoutez puis répétez. Attention au rythme : les mots grammaticaux sont réduits.", target: "I've been meaning to ask you about the report for next week.", seconds: 10 },
  { id: "sp-rep-4", kind: "repeat", level: "B2", title: "Word stress", instructionFr: "Écoutez puis répétez. Attention à l'accent tonique : PHOtograph, phoTOgraphy, photoGRAPHic.", target: "The photographer said photography is a photographic art.", seconds: 12 },
  { id: "sp-rep-5", kind: "repeat", level: "B2+", title: "Linking sounds", instructionFr: "Écoutez puis répétez en liant les mots (an_apple, turn_it_off).", target: "Turn it off and put it away before anyone asks about it.", seconds: 12 },
  { id: "sp-rep-6", kind: "repeat", level: "C1", title: "Sentence stress for contrast", instructionFr: "Répétez en accentuant le mot contrasté.", target: "I didn't say she stole the money; I said she borrowed it.", seconds: 12 },

  // 2. Lire un texte à voix haute
  { id: "sp-read-1", kind: "read-aloud", level: "B1", title: "Voicemail message", instructionFr: "Lisez ce message vocal à voix haute, à un rythme naturel.", target: "Hi Laura, it's Tom. I'm calling about Saturday. I'm afraid I can't make it to lunch because my train has been cancelled. Could we meet on Sunday instead? Call me back when you get this. Thanks!", seconds: 30 },
  { id: "sp-read-2", kind: "read-aloud", level: "B2", title: "News headline", instructionFr: "Lisez cet extrait d'actualité comme un journaliste radio.", target: "Scientists have developed a new type of battery that can be charged in under five minutes. The technology, which uses sodium instead of lithium, could make electric cars cheaper and more sustainable, although experts warn it may take several years to reach the market.", seconds: 40 },
  { id: "sp-read-3", kind: "read-aloud", level: "C1", title: "Formal speech", instructionFr: "Lisez cet extrait de discours avec une intonation convaincante.", target: "Ladies and gentlemen, never before has our industry faced such a profound transformation. The question is no longer whether we should adapt, but how quickly, and at what cost to those who are least prepared for change.", seconds: 40 },

  // 3. Décrire une image
  { id: "sp-desc-1", kind: "describe", level: "B1", title: "A busy café", instructionFr: "Décrivez la scène : lieux, personnes, actions, ambiance. Parlez au moins 45 secondes.", scene: "cafe", prompt: "Describe what you can see in the picture.", seconds: 60, hints: ["In the foreground / background…", "On the left / right, there is…", "It looks like…", "She seems to be…"] },
  { id: "sp-desc-2", kind: "describe", level: "B2", title: "A city street in the rain", instructionFr: "Décrivez la scène et faites des hypothèses sur ce qui se passe.", scene: "street", prompt: "Describe the scene and speculate about what is happening.", seconds: 75, hints: ["They might be…", "It must be…", "Judging by…", "I'd say that…"] },
  { id: "sp-desc-3", kind: "describe", level: "B2+", title: "An office meeting", instructionFr: "Décrivez la scène, les relations entre les personnes et ce qu'elles pourraient ressentir.", scene: "office", prompt: "Describe the meeting and the people's attitudes.", seconds: 90, hints: ["The atmosphere seems…", "He appears to be…", "There seems to be some tension between…"] },

  // 4. Répondre spontanément
  { id: "sp-q-1", kind: "question", level: "B1", title: "Free time", instructionFr: "Répondez spontanément pendant 30 à 45 secondes.", prompt: "What do you usually do at the weekend, and what did you do last weekend?", seconds: 45 },
  { id: "sp-q-2", kind: "question", level: "B2", title: "Learning", instructionFr: "Répondez spontanément avec des exemples.", prompt: "What is the most useful thing you have ever learnt outside school?", seconds: 60 },
  { id: "sp-q-3", kind: "question", level: "C1", title: "Society", instructionFr: "Répondez de façon nuancée.", prompt: "To what extent should governments be responsible for people's health choices?", seconds: 90 },

  // 5. Raconter une histoire
  { id: "sp-story-1", kind: "story", level: "B1+", title: "A memorable trip", instructionFr: "Racontez une histoire au passé (past simple, past continuous, past perfect).", prompt: "Tell the story of a trip where something unexpected happened.", seconds: 90, hints: ["It all started when…", "While we were…", "Suddenly, …", "In the end, …"] },
  { id: "sp-story-2", kind: "story", level: "B2+", title: "A turning point", instructionFr: "Racontez un moment qui a changé votre vie, avec des hypothèses sur le passé.", prompt: "Describe a turning point in your life. What would have happened if things had been different?", seconds: 120 },

  // 6. Donner son opinion
  { id: "sp-op-1", kind: "opinion", level: "B1+", title: "Working from home", instructionFr: "Donnez votre opinion et justifiez-la avec au moins deux raisons.", prompt: "Is working from home better than working in an office?", seconds: 75, hints: ["In my opinion…", "The main reason is…", "Another point is…", "That's why…"] },
  { id: "sp-op-2", kind: "opinion", level: "B2", title: "Social media", instructionFr: "Donnez une opinion nuancée.", prompt: "Has social media made people more or less connected?", seconds: 90 },

  // 7. Argumenter sur un sujet complexe
  { id: "sp-arg-1", kind: "argue", level: "B2+", title: "Artificial intelligence and jobs", instructionFr: "Présentez une argumentation structurée : thèse, arguments, contre-argument, conclusion.", prompt: "Will artificial intelligence create more jobs than it destroys?", seconds: 120, hints: ["First of all, …", "It could be argued that…", "However, …", "On balance, …"] },
  { id: "sp-arg-2", kind: "argue", level: "C1", title: "Tourism", instructionFr: "Argumentez de façon nuancée avec des exemples précis.", prompt: "Should popular destinations limit the number of tourists?", seconds: 150 },

  // 8. Entretien professionnel
  { id: "sp-int-1", kind: "interview", level: "B2", title: "Tell me about yourself", instructionFr: "Répondez comme en entretien d'embauche (60–90 s).", prompt: "Tell me about yourself and why you'd be a good fit for this position.", seconds: 90 },
  { id: "sp-int-2", kind: "interview", level: "B2+", title: "A difficult situation", instructionFr: "Utilisez la méthode STAR : Situation, Task, Action, Result.", prompt: "Tell me about a time you had to deal with a difficult colleague or client.", seconds: 120 },

  // 9. Présenter un projet
  { id: "sp-pres-1", kind: "presentation", level: "B2", title: "Pitch a project", instructionFr: "Présentez un projet (personnel ou professionnel) : objectif, étapes, résultats attendus.", prompt: "Present a project you are working on or would like to launch.", seconds: 150, hints: ["Today I'd like to present…", "The aim is to…", "There are three stages…", "To sum up, …"] },
  { id: "sp-pres-2", kind: "presentation", level: "C1", title: "Present data", instructionFr: "Présentez les résultats d'une étude (réels ou imaginaires) avec un langage nuancé.", prompt: "Present the results of a survey about how people learn languages, and what they suggest.", seconds: 150 },

  // 10. Débat
  { id: "sp-deb-1", kind: "debate", level: "B2+", title: "Four-day week", instructionFr: "Défendez une position, puis répondez à l'objection donnée.", prompt: "Defend the four-day working week. Then respond to this objection: 'It's impossible in hospitals and shops.'", seconds: 150 },
  { id: "sp-deb-2", kind: "debate", level: "C1", title: "Free university", instructionFr: "Prenez position et réfutez au moins une objection.", prompt: "Should university education be free for everyone? Address the objection: 'Taxpayers shouldn't fund degrees with low employment prospects.'", seconds: 180 },
];

export const SPEAKING_KIND_LABELS: Record<SpeakingTask["kind"], string> = {
  repeat: "Répéter",
  "read-aloud": "Lire à voix haute",
  describe: "Décrire une image",
  question: "Réponse spontanée",
  story: "Raconter",
  opinion: "Donner son avis",
  argue: "Argumenter",
  interview: "Entretien",
  presentation: "Présentation",
  debate: "Débat",
};
