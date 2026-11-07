/* Faux fournisseur IA compatible /v1/chat/completions, utilisé UNIQUEMENT par les
   tests de bout en bout pour vérifier le pipeline (route serveur → validation →
   normalisation → interface). Il n'est jamais utilisé par l'application. */
const http = require("node:http");

function answerFor(system, lastUser) {
  if (system.includes("reviewing a practice conversation"))
    return { errors: [{ original: "I have went", corrected: "I went", explanationFr: "Past simple avec un moment précis.", topic: "present-perfect" }], newWords: [{ term: "commute", meaning: "trajet domicile-travail" }], expressions: [{ en: "to be up to", fr: "faire" }], score: 62, cefr: "B1", strengths: "Bonne interaction.", advice: "Travaillez le past simple.", exercise: { instruction: "Correct the verbs.", items: [{ prompt: "Yesterday I have seen him.", answer: "Yesterday I saw him." }] } };
  if (system.includes("writing examiner"))
    return { issues: [{ original: "I am agree", correction: "I agree", category: "grammar", explanationFr: "agree est un verbe : pas de be.", }], corrected: lastUser.replace("I am agree", "I agree"), improved: "Improved version.", scores: { task: 3, organisation: 3.5, vocabulary: 3, grammar: 2.5, register: 4 }, cefr: "B1", summaryFr: "Texte clair, attention aux verbes.", topics: ["tenses-review"] };
  if (system.includes("speaking examiner"))
    return { summaryFr: "Discours compréhensible.", errors: [], betterVersion: "A better version.", scores: { fluency: 3, accuracy: 3, range: 3, coherence: 3 }, cefr: "B1" };
  if (system.includes("free-production")) return { score: 4, correct: true, feedbackFr: "Bien.", corrections: [], improved: "Better." };
  if (system.includes("check whether a French-speaking learner used")) return { correct: true, feedbackFr: "Correct.", improved: lastUser };
  if (system.includes("learner's dictionary")) return { word: "word", pos: "noun", defEn: "a unit of language", fr: "mot", example: "A word." };
  return { reply: "That's interesting! Tell me more about it?", corrections: lastUser.includes("I has") ? [{ original: "I has", corrected: "I have", explanationFr: "Avec I : have.", topic: "tenses-review" }] : [], betterPhrasing: "", expressions: [{ en: "Tell me more", fr: "Dis-m'en plus" }] };
}

function start(port = 3999) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const j = JSON.parse(body || "{}");
        const system = j.messages?.[0]?.content ?? "";
        const lastUser = [...(j.messages ?? [])].reverse().find((m) => m.role === "user")?.content ?? "";
        const content = JSON.stringify(answerFor(system, lastUser));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }));
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

module.exports = { start };
