import { themeWords } from "./helpers";

/* Relations sociales, société, sciences, culture, éducation, environnement */

const social = themeWords("social");
export const socialWords = [
  social("get on with", "phrasal", "phrasal verb", "/ɡet ˈɒn wɪð/", "B1", "to have a friendly relationship with someone", "bien s'entendre avec", "I get on really well with my flatmates.", { us: "/ɡet ˈɑːn wɪð/", ukUs: "US : get along with" }),
  social("fall out", "phrasal", "phrasal verb", "/fɔːl ˈaʊt/", "B1+", "to argue and stop being friendly", "se brouiller", "They fell out over money.", { col: ["fall out with someone"] }),
  social("acquaintance", "word", "noun", "/əˈkweɪntəns/", "B2", "a person you know slightly, but not well", "connaissance", "He's not a close friend, just an acquaintance.", {}),
  social("supportive", "word", "adjective", "/səˈpɔːtɪv/", "B1+", "giving help, encouragement and sympathy", "encourageant, présent (pour quelqu'un)", "My family has been very supportive.", { us: "/səˈpɔːrtɪv/" }),
  social("trustworthy", "word", "adjective", "/ˈtrʌstwɜːði/", "B2", "able to be trusted", "digne de confiance", "She's one of the most trustworthy people I know.", { us: "/ˈtrʌstwɝːði/", syn: ["reliable"] }),
  social("bond", "word", "noun / verb", "/bɒnd/", "B2", "a close connection between people; to form one", "lien ; créer des liens", "The trip helped the team bond.", { us: "/bɑːnd/", col: ["strong bond", "bond with someone"] }),
  social("make up", "phrasal", "phrasal verb", "/meɪk ˈʌp/", "B1+", "to become friends again after an argument", "se réconcilier", "They argued but made up the next day.", {}),
  social("break the ice", "idiom", "idiom", "/breɪk ði ˈaɪs/", "B1+", "to make people feel relaxed at the start of a meeting or event", "briser la glace", "He told a joke to break the ice.", {}),
  social("peer pressure", "collocation", "noun", "/ˈpɪə ˌpreʃə/", "B2", "pressure from people of your age or group to behave like them", "pression des pairs", "Teenagers often start smoking because of peer pressure.", { us: "/ˈpɪr ˌpreʃər/" }),
  social("empathy", "word", "noun", "/ˈempəθi/", "B2", "the ability to understand other people's feelings", "empathie", "Good leaders show empathy.", {}),
  social("see eye to eye", "idiom", "idiom", "/siː ˌaɪ tə ˈaɪ/", "B2", "to agree with someone", "être d'accord, voir les choses de la même façon", "My father and I don't always see eye to eye.", {}),
  social("let someone down", "phrasal", "phrasal verb", "/let ˌsʌmwʌn ˈdaʊn/", "B1+", "to disappoint someone by not doing what they expected", "décevoir, laisser tomber", "I promised to help, and I won't let you down.", {}),
  social("awkward", "word", "adjective", "/ˈɔːkwəd/", "B1+", "embarrassing or uncomfortable", "gênant, maladroit", "There was an awkward silence.", { us: "/ˈɑːkwərd/" }),
  social("cherish", "word", "verb", "/ˈtʃerɪʃ/", "C1", "to love and protect something or someone; to keep a memory", "chérir", "I cherish the memories of those summers.", {}),
  social("estranged", "word", "adjective", "/ɪˈstreɪndʒd/", "C1", "no longer in contact with a family member or partner", "éloigné, en froid", "He's been estranged from his brother for years.", {}),
  social("small talk", "collocation", "noun", "/ˈsmɔːl tɔːk/", "B1+", "polite conversation about unimportant subjects", "bavardage, échanges de politesse", "I'm not very good at small talk.", { col: ["make small talk"] }),
];

const society = themeWords("society");
export const societyWords = [
  society("inequality", "word", "noun", "/ˌɪnɪˈkwɒləti/", "B2", "an unfair situation in which some people have more opportunities than others", "inégalité", "Income inequality has increased.", { us: "/ˌɪnɪˈkwɑːləti/", ant: ["equality"] }),
  society("unemployment", "word", "noun", "/ˌʌnɪmˈplɔɪmənt/", "B1", "the state of not having a job; the number of people without jobs", "chômage", "Unemployment fell to 7%.", { col: ["unemployment rate", "youth unemployment"] }),
  society("housing", "word", "noun", "/ˈhaʊzɪŋ/", "B1+", "buildings people live in; the provision of homes", "logement", "There's a shortage of affordable housing.", { col: ["affordable housing", "housing crisis"] }),
  society("welfare", "word", "noun", "/ˈwelfeə/", "B2", "help given by the state to people who need it; well-being", "aide sociale ; bien-être", "The welfare system supports the unemployed.", { us: "/ˈwelfer/", col: ["welfare state"] }),
  society("protest", "word", "noun / verb", "/ˈprəʊtest/ (n), /prəˈtest/ (v)", "B1+", "a public action showing strong disagreement", "manifestation ; protester", "Thousands joined the protest against the reform.", { us: "/ˈproʊtest/" }),
  society("vote", "word", "verb / noun", "/vəʊt/", "B1", "to choose officially in an election", "voter ; vote", "Young people are less likely to vote.", { us: "/voʊt/" }),
  society("misinformation", "word", "noun", "/ˌmɪsɪnfəˈmeɪʃn/", "B2", "false information, often spread without intending to deceive", "désinformation, fausses informations", "Misinformation spreads quickly on social media.", { us: "/ˌmɪsɪnfərˈmeɪʃn/", syn: ["disinformation (intentional)"] }),
  society("policy", "word", "noun", "/ˈpɒləsi/", "B1+", "a plan of action agreed by a government or organisation", "politique (mesure)", "The government announced a new housing policy.", { us: "/ˈpɑːləsi/", col: ["implement a policy", "public policy"] }),
  society("controversial", "word", "adjective", "/ˌkɒntrəˈvɜːʃl/", "B2", "causing a lot of disagreement", "controversé", "The decision was highly controversial.", { us: "/ˌkɑːntrəˈvɝːʃl/" }),
  society("tackle", "word", "verb", "/ˈtækl/", "B2", "to make an effort to deal with a difficult problem", "s'attaquer à", "We need new measures to tackle poverty.", { col: ["tackle a problem", "tackle climate change"] }),
  society("grassroots", "word", "adjective / noun", "/ˈɡrɑːsruːts/", "C1", "involving ordinary people rather than leaders", "de terrain, citoyen ; la base", "It started as a grassroots movement.", { us: "/ˈɡræsruːts/" }),
  society("marginalised", "word", "adjective", "/ˈmɑːdʒɪnəlaɪzd/", "C1", "treated as unimportant and excluded from society", "marginalisé", "The charity supports marginalised communities.", { us: "/ˈmɑːrdʒɪnəlaɪzd/", ukUs: "UK : marginalised · US : marginalized" }),
  society("ageing population", "collocation", "noun phrase", "/ˌeɪdʒɪŋ ˌpɒpjuˈleɪʃn/", "B2+", "a population with an increasing proportion of older people", "vieillissement de la population", "An ageing population puts pressure on pension systems.", { us: "/ˌeɪdʒɪŋ ˌpɑːpjuˈleɪʃn/", ukUs: "UK : ageing · US : aging" }),
  society("a double-edged sword", "idiom", "idiom", "/ə ˌdʌbl edʒd ˈsɔːd/", "C1", "something that has both advantages and disadvantages", "une arme à double tranchant", "Social media is a double-edged sword.", { us: "/ə ˌdʌbl edʒd ˈsɔːrd/" }),
  society("crack down on", "phrasal", "phrasal verb", "/kræk ˈdaʊn ɒn/", "B2+", "to start dealing with a problem more severely", "sévir contre", "The police are cracking down on speeding.", {}),
  society("cohesion", "word", "noun", "/kəʊˈhiːʒn/", "C1", "the state of being united", "cohésion", "Social cohesion depends on trust in institutions.", { us: "/koʊˈhiːʒn/" }),
];

const science = themeWords("science");
export const scienceWords = [
  science("research", "word", "noun / verb", "/rɪˈsɜːtʃ/", "B1", "detailed study to discover new facts", "recherche ; faire des recherches", "Research shows that sleep improves memory.", { us: "/ˈriːsɝːtʃ/", ukUs: "Indénombrable : some research, not a research", col: ["carry out research", "conduct research"] }),
  science("evidence", "word", "noun (uncountable)", "/ˈevɪdəns/", "B1+", "facts that show that something is true", "preuve(s), données probantes", "There is no evidence that the drug works.", { col: ["scientific evidence", "a piece of evidence"] }),
  science("hypothesis", "word", "noun", "/haɪˈpɒθəsɪs/", "B2", "an idea that is suggested as an explanation but not yet proved", "hypothèse", "The experiment supports our hypothesis.", { us: "/haɪˈpɑːθəsɪs/", ukUs: "Pluriel : hypotheses" }),
  science("experiment", "word", "noun", "/ɪkˈsperɪmənt/", "B1", "a scientific test to discover something", "expérience (scientifique)", "We carried out an experiment in the lab.", { col: ["carry out an experiment", "conduct an experiment"] }),
  science("findings", "word", "noun (plural)", "/ˈfaɪndɪŋz/", "B2", "the results of a study", "résultats, conclusions", "The findings were published in Nature.", {}),
  science("breakthrough", "word", "noun", "/ˈbreɪkθruː/", "B2", "an important discovery or development", "percée, avancée majeure", "Scientists have made a breakthrough in cancer research.", { col: ["major breakthrough", "make a breakthrough"] }),
  science("peer review", "collocation", "noun", "/ˌpɪə rɪˈvjuː/", "C1", "evaluation of research by other experts before publication", "évaluation par les pairs", "The study has not yet been through peer review.", { us: "/ˌpɪr rɪˈvjuː/" }),
  science("sample", "word", "noun", "/ˈsɑːmpl/", "B1+", "a small amount or group used for testing", "échantillon", "The sample included 2,000 adults.", { us: "/ˈsæmpl/", col: ["sample size", "blood sample"] }),
  science("correlation", "word", "noun", "/ˌkɒrəˈleɪʃn/", "C1", "a connection between two things", "corrélation", "Correlation does not imply causation.", { us: "/ˌkɔːrəˈleɪʃn/" }),
  science("vaccine", "word", "noun", "/ˈvæksiːn/", "B1+", "a substance that protects the body against a disease", "vaccin", "The vaccine is 95% effective.", { us: "/vækˈsiːn/" }),
  science("species", "word", "noun", "/ˈspiːʃiːz/", "B1+", "a group of animals or plants of the same kind", "espèce", "Hundreds of species are at risk.", { ukUs: "Singulier et pluriel identiques" }),
  science("figure out", "phrasal", "phrasal verb", "/ˌfɪɡər ˈaʊt/", "B1+", "to understand or solve something after thinking", "comprendre, trouver", "Scientists are trying to figure out why bees are disappearing.", { us: "/ˌfɪɡjər ˈaʊt/", syn: ["work out"] }),
  science("groundbreaking", "word", "adjective", "/ˈɡraʊndbreɪkɪŋ/", "B2+", "very new and making an important change", "révolutionnaire, novateur", "Her groundbreaking work changed genetics.", { syn: ["pioneering"] }),
  science("feasible", "word", "adjective", "/ˈfiːzəbl/", "C1", "possible and likely to be achieved", "faisable, réalisable", "Is it feasible to send humans to Mars by 2040?", { syn: ["viable", "achievable"] }),
  science("draw conclusions", "collocation", "verb phrase", "/drɔː kənˈkluːʒnz/", "B2", "to decide what is true after considering the facts", "tirer des conclusions", "It's too early to draw conclusions.", {}),
  science("rigorous", "word", "adjective", "/ˈrɪɡərəs/", "C1", "careful, thorough and exact", "rigoureux", "The study used a rigorous methodology.", {}),
];

const culture = themeWords("culture");
export const cultureWords = [
  culture("exhibition", "word", "noun", "/ˌeksɪˈbɪʃn/", "B1", "a public show of art or objects", "exposition", "We went to a photography exhibition.", { ukUs: "US : aussi exhibit" }),
  culture("plot", "word", "noun", "/plɒt/", "B1", "the series of events in a story", "intrigue", "The plot was hard to follow.", { us: "/plɑːt/" }),
  culture("review", "word", "noun / verb", "/rɪˈvjuː/", "B1", "an article giving an opinion of a book, film, etc.", "critique ; faire la critique", "The film got excellent reviews.", { col: ["rave reviews", "mixed reviews"] }),
  culture("heritage", "word", "noun", "/ˈherɪtɪdʒ/", "B2", "traditions and buildings from the past that are valued", "patrimoine", "The old town is a UNESCO World Heritage Site.", { col: ["cultural heritage"] }),
  culture("masterpiece", "word", "noun", "/ˈmɑːstəpiːs/", "B2", "a work of art of outstanding quality", "chef-d'œuvre", "Many consider it Kubrick's masterpiece.", { us: "/ˈmæstərpiːs/" }),
  culture("thought-provoking", "word", "adjective", "/ˈθɔːt prəvəʊkɪŋ/", "B2+", "making you think seriously about a subject", "qui donne à réfléchir", "It's a thought-provoking documentary.", { us: "/ˈθɑːt prəvoʊkɪŋ/" }),
  culture("mainstream", "word", "adjective / noun", "/ˈmeɪnstriːm/", "B2", "accepted by most people; conventional", "grand public, dominant", "The band moved from indie to mainstream success.", {}),
  culture("binge-watch", "word", "verb", "/ˈbɪndʒ wɒtʃ/", "B1+", "to watch many episodes of a series one after another", "regarder en rafale", "We binge-watched the whole season in a weekend.", { us: "/ˈbɪndʒ wɑːtʃ/" }),
  culture("acclaimed", "word", "adjective", "/əˈkleɪmd/", "C1", "publicly praised", "salué, acclamé", "The critically acclaimed novel won three awards.", { col: ["critically acclaimed"] }),
  culture("stereotype", "word", "noun", "/ˈsteriətaɪp/", "B2", "a fixed and often unfair idea about a type of person", "stéréotype", "The film challenges gender stereotypes.", {}),
  culture("steal the show", "idiom", "idiom", "/stiːl ðə ˈʃəʊ/", "B2+", "to get the most attention in a performance", "voler la vedette", "The young actress stole the show.", { us: "/stiːl ðə ˈʃoʊ/" }),
  culture("lyrics", "word", "noun (plural)", "/ˈlɪrɪks/", "B1", "the words of a song", "paroles (d'une chanson)", "I can never remember the lyrics.", {}),
  culture("overrated", "word", "adjective", "/ˌəʊvəˈreɪtɪd/", "B2", "considered better than it really is", "surestimé", "In my opinion, the series is overrated.", { us: "/ˌoʊvərˈreɪtɪd/", ant: ["underrated"] }),
  culture("bestseller", "word", "noun", "/ˌbestˈselə/", "B1+", "a book that sells very well", "best-seller", "Her first novel became an international bestseller.", { us: "/ˌbestˈselər/" }),
  culture("poignant", "word", "adjective", "/ˈpɔɪnjənt/", "C1", "causing strong feelings of sadness", "poignant, émouvant", "The ending is particularly poignant.", { syn: ["moving", "touching"] }),
];

const education = themeWords("education");
export const educationWords = [
  education("timetable", "word", "noun", "/ˈtaɪmteɪbl/", "B1", "a list of times when classes, trains, etc. happen", "emploi du temps ; horaires", "Our timetable changes every term.", { ukUs: "US : schedule" }),
  education("lecture", "word", "noun", "/ˈlektʃə/", "B1", "a talk given to students on a subject, especially at university", "cours magistral, conférence", "The first lecture starts at nine.", { us: "/ˈlektʃər/", ukUs: "Faux ami : lecture ≠ « lecture » (= reading)" }),
  education("grade", "word", "noun", "/ɡreɪd/", "B1", "a mark given for a piece of work or an exam", "note", "She got the highest grade in the class.", { ukUs: "UK : aussi mark" }),
  education("take an exam", "collocation", "verb phrase", "/teɪk ən ɪɡˈzæm/", "B1", "to do an exam (not necessarily pass it)", "passer un examen", "I'm going to take an exam in June.", { ukUs: "UK : aussi sit an exam · « pass an exam » = réussir" }),
  education("degree", "word", "noun", "/dɪˈɡriː/", "B1", "a qualification from a university", "diplôme (universitaire)", "She has a degree in economics.", { col: ["bachelor's degree", "master's degree"] }),
  education("revise", "word", "verb", "/rɪˈvaɪz/", "B1", "(UK) to study again before an exam", "réviser", "I need to revise for my exams.", { ukUs: "UK : revise · US : review / study" }),
  education("tuition fees", "collocation", "noun (plural)", "/tjuˈɪʃn fiːz/", "B1+", "money paid for teaching at a university or school", "frais de scolarité", "Tuition fees have tripled.", { us: "/tuˈɪʃn fiːz/", ukUs: "US : tuition" }),
  education("drop out", "phrasal", "phrasal verb", "/drɒp ˈaʊt/", "B1+", "to leave school or a course before finishing", "abandonner (ses études)", "He dropped out of university to start a company.", { us: "/drɑːp ˈaʊt/" }),
  education("catch up", "phrasal", "phrasal verb", "/kætʃ ˈʌp/", "B1", "to reach the same level as others", "rattraper (son retard)", "I missed a week and had to catch up.", { col: ["catch up on", "catch up with"] }),
  education("assignment", "word", "noun", "/əˈsaɪnmənt/", "B1+", "a piece of work given to students", "devoir, travail à rendre", "The assignment is due on Monday.", { syn: ["coursework", "homework"] }),
  education("scholarship", "word", "noun", "/ˈskɒləʃɪp/", "B2", "money given to a student to pay for their studies", "bourse d'études", "She won a scholarship to study in Boston.", { us: "/ˈskɑːlərʃɪp/" }),
  education("lifelong learning", "collocation", "noun", "/ˌlaɪflɒŋ ˈlɜːnɪŋ/", "B2", "the idea of continuing to learn throughout your life", "formation tout au long de la vie", "Lifelong learning is essential in a changing job market.", { us: "/ˌlaɪflɔːŋ ˈlɝːnɪŋ/" }),
  education("curriculum", "word", "noun", "/kəˈrɪkjələm/", "B2", "the subjects included in a course of study", "programme scolaire", "Coding is now part of the school curriculum.", {}),
  education("plagiarism", "word", "noun", "/ˈpleɪdʒərɪzəm/", "C1", "copying someone else's work and presenting it as your own", "plagiat", "The university uses software to detect plagiarism.", {}),
  education("learn by heart", "idiom", "idiom", "/lɜːn baɪ ˈhɑːt/", "B1+", "to memorise something so you can repeat it exactly", "apprendre par cœur", "We had to learn the poem by heart.", { us: "/lɝːn baɪ ˈhɑːrt/" }),
  education("hit the books", "idiom", "idiom", "/hɪt ðə ˈbʊks/", "B2", "to start studying seriously", "se mettre à réviser sérieusement", "Exams are next week — time to hit the books.", {}),
  education("proficiency", "word", "noun", "/prəˈfɪʃnsi/", "B2+", "a high level of ability or skill", "maîtrise, compétence", "Applicants must show proficiency in English.", { col: ["language proficiency"] }),
  education("critical thinking", "collocation", "noun", "/ˌkrɪtɪkl ˈθɪŋkɪŋ/", "B2", "the ability to analyse information objectively", "esprit critique", "The course develops critical thinking skills.", {}),
  education("well-rounded", "word", "adjective", "/ˌwel ˈraʊndɪd/", "C1", "having a wide range of skills and experience", "complet, polyvalent", "Schools aim to produce well-rounded students.", {}),
];

const environment = themeWords("environment");
export const environmentWords = [
  environment("climate change", "collocation", "noun", "/ˈklaɪmət tʃeɪndʒ/", "B1", "changes in the Earth's weather caused mainly by human activity", "changement climatique", "Climate change is a global threat.", {}),
  environment("pollution", "word", "noun", "/pəˈluːʃn/", "B1", "damage to air, water or land by harmful substances", "pollution", "Air pollution is a major problem in big cities.", {}),
  environment("recycle", "word", "verb", "/ˌriːˈsaɪkl/", "B1", "to process used materials so they can be used again", "recycler", "We recycle glass, paper and plastic.", {}),
  environment("renewable", "word", "adjective", "/rɪˈnjuːəbl/", "B1+", "(energy) from a source that does not run out", "renouvelable", "Renewable energy now provides 30% of our electricity.", { us: "/rɪˈnuːəbl/", col: ["renewable energy", "renewable sources"] }),
  environment("carbon footprint", "collocation", "noun", "/ˌkɑːbən ˈfʊtprɪnt/", "B2", "the amount of carbon dioxide produced by a person or activity", "empreinte carbone", "Flying increases your carbon footprint.", { us: "/ˌkɑːrbən ˈfʊtprɪnt/", col: ["reduce your carbon footprint"] }),
  environment("emissions", "word", "noun (plural)", "/iˈmɪʃnz/", "B2", "gases sent into the air", "émissions", "The country aims to cut emissions by half.", { col: ["greenhouse gas emissions", "cut emissions"] }),
  environment("drought", "word", "noun", "/draʊt/", "B2", "a long period without rain", "sécheresse", "The drought destroyed the crops.", {}),
  environment("endangered", "word", "adjective", "/ɪnˈdeɪndʒəd/", "B1+", "(of an animal or plant) at risk of disappearing", "menacé, en voie de disparition", "The tiger is an endangered species.", { us: "/ɪnˈdeɪndʒərd/" }),
  environment("sustainable", "word", "adjective", "/səˈsteɪnəbl/", "B2", "able to continue without harming the environment", "durable", "We need more sustainable forms of transport.", { col: ["sustainable development"] }),
  environment("waste", "word", "noun / verb", "/weɪst/", "B1", "unwanted material; to use badly", "déchets ; gaspiller", "Food waste is a huge problem.", { col: ["food waste", "waste of time"] }),
  environment("cut down on", "phrasal", "phrasal verb", "/kʌt ˈdaʊn ɒn/", "B1+", "to reduce the amount of something", "réduire (sa consommation de)", "I'm trying to cut down on plastic.", { syn: ["reduce"] }),
  environment("biodiversity", "word", "noun", "/ˌbaɪəʊdaɪˈvɜːsəti/", "B2+", "the variety of plants and animals in an area", "biodiversité", "Deforestation threatens biodiversity.", { us: "/ˌbaɪoʊdaɪˈvɝːsəti/" }),
  environment("greenwashing", "word", "noun", "/ˈɡriːnwɒʃɪŋ/", "C1", "making a company seem more environmentally friendly than it is", "écoblanchiment", "Critics accused the airline of greenwashing.", { us: "/ˈɡriːnwɑːʃɪŋ/" }),
  environment("tipping point", "collocation", "noun", "/ˈtɪpɪŋ pɔɪnt/", "C1", "the moment when a small change causes a large, irreversible effect", "point de bascule", "Scientists warn we may reach a climate tipping point.", {}),
  environment("phase out", "phrasal", "phrasal verb", "/feɪz ˈaʊt/", "B2+", "to stop using something gradually", "supprimer progressivement", "The EU will phase out petrol cars by 2035.", { ukUs: "UK : petrol · US : gas / gasoline" }),
  environment("mitigate", "word", "verb", "/ˈmɪtɪɡeɪt/", "C1", "to make something harmful less serious", "atténuer", "Planting trees can help mitigate climate change.", { syn: ["alleviate", "reduce"] }),
];
