# État d'avancement par phase

| Phase | État | Détail |
|---|---|---|
| 1 — Fondations | ✅ | Architecture, design system, navigation (desktop + mobile), auth Supabase, schéma SQL + RLS, dashboard |
| 2 — Moteur pédagogique | ✅ | Niveaux CECRL, chapitres, leçons, 6 types d'exercices, correction automatique, progression, référentiel |
| 3 — Apprentissage interactif | ✅ | Vocabulaire (SRS), grammaire, listening, reading, writing, speaking |
| 4 — IA | ✅ | Professeur/personnages, bilans, correction écrite, analyse orale, productions libres, personnalisation |
| 5 — Gamification | ✅ | XP, niveaux, séries, quêtes, badges, boss, carte du monde, classement |
| 6 — Évaluation | ✅ | Test de positionnement, examens blancs B1/B2/C1/IELTS, validations de niveau, statistiques |
| 7 — Finalisation | 🟡 | Tests unitaires/DB/E2E, sécurité, responsive faits ; reste : audit Lighthouse/axe, déploiement Vercel + projet Supabase |

## Prochaines étapes recommandées
1. **Volume de contenu** : la banque compte 214 mots (≈ 10 jours à 20 mots/jour) et 10 écoutes / 8 textes. Le format est extensible (`src/content`) : priorité à 1 500+ mots, 40+ écoutes, 30+ textes, puis génération assistée par IA relue par un enseignant.
2. **Audio naturel** : la synthèse vocale dépend du navigateur ; brancher un service TTS neuronal (fichiers audio en Supabase Storage) pour des voix plus réalistes.
3. **Prononciation fine** : l'analyse actuelle mesure l'intelligibilité via la reconnaissance vocale ; une évaluation phonétique (accentuation, intonation) nécessiterait un service spécialisé.
4. **Notifications** : rappels de série via Web Push (nécessite un service d'envoi côté serveur).
5. **Administration du contenu** depuis la base (le schéma est prêt).
6. **Application mobile** : PWA déjà installable ; un portage Capacitor/React Native peut réutiliser `src/lib` tel quel.
