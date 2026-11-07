-- =====================================================================
-- ENGLISH QUEST — Schéma initial (PostgreSQL / Supabase)
-- Contenu pédagogique (lecture publique) + données apprenant (RLS stricte)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
do $$ begin
  create type cefr_level as enum ('A2', 'B1', 'B1+', 'B2', 'B2+', 'C1');
exception when duplicate_object then null; end $$;

do $$ begin
  create type skill_kind as enum ('listening', 'speaking', 'reading', 'writing', 'grammar', 'vocabulary');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- CONTENU PÉDAGOGIQUE (lecture seule pour les utilisateurs)
-- Alimenté par supabase/seed.sql, généré depuis src/content (npm run db:seed)
-- ---------------------------------------------------------------------
create table if not exists learning_levels (
  id cefr_level primary key,
  position smallint not null unique,
  name text not null,
  name_fr text not null,
  goal_fr text not null
);

create table if not exists courses (
  id text primary key,
  level_id cefr_level not null references learning_levels(id),
  title text not null,
  description text not null default ''
);

create table if not exists chapters (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  level_id cefr_level not null references learning_levels(id),
  position smallint not null,
  title text not null,
  title_fr text not null,
  story text not null,
  boss jsonb not null,
  unique (course_id, position)
);

create table if not exists grammar_topics (
  id text primary key,
  level_id cefr_level not null references learning_levels(id),
  title text not null,
  title_fr text not null,
  summary_fr text not null,
  content jsonb not null -- explications FR/EN, formes, exemples, erreurs fréquentes
);

create table if not exists lessons (
  id text primary key,
  chapter_id text not null references chapters(id) on delete cascade,
  position smallint not null,
  title text not null,
  title_fr text not null,
  grammar_topic_id text references grammar_topics(id),
  vocab_theme text,
  resources jsonb not null default '{}'::jsonb, -- listening / reading / writing / speaking
  objectives text[] not null default '{}',
  unique (chapter_id, position)
);

create table if not exists exercises (
  id text primary key,
  kind text not null check (kind in ('grammar', 'listening', 'reading', 'writing', 'speaking', 'exam', 'placement')),
  level_id cefr_level not null references learning_levels(id),
  grammar_topic_id text references grammar_topics(id),
  difficulty text check (difficulty in ('easy', 'medium', 'hard', 'exam')),
  title text not null,
  payload jsonb not null default '{}'::jsonb -- script audio, texte, consigne…
);

create table if not exists questions (
  id text primary key,
  exercise_id text not null references exercises(id) on delete cascade,
  position smallint not null,
  type text not null check (type in ('mcq', 'gap', 'transform', 'correct', 'order', 'free')),
  skill skill_kind not null,
  level_id cefr_level not null references learning_levels(id),
  topic text,
  objective text,
  payload jsonb not null -- énoncé, options, réponses acceptées, explication
);
create index if not exists questions_exercise_idx on questions (exercise_id, position);
create index if not exists questions_topic_idx on questions (topic);

create table if not exists vocabulary (
  id text primary key,
  word text not null,
  kind text not null check (kind in ('word', 'phrasal', 'idiom', 'collocation')),
  pos text not null,
  ipa text not null,
  ipa_us text,
  level_id cefr_level not null references learning_levels(id),
  theme text not null,
  def_en text not null,
  fr text not null,
  example text not null,
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  collocations text[] not null default '{}',
  uk_us text
);
create index if not exists vocabulary_theme_level_idx on vocabulary (theme, level_id);

create table if not exists achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null
);

create table if not exists daily_quests (
  id text primary key,
  period text not null check (period in ('daily', 'weekly')),
  title text not null,
  icon text not null,
  reward_xp integer not null check (reward_xp > 0)
);

-- ---------------------------------------------------------------------
-- DONNÉES APPRENANT
-- `users` = auth.users (géré par Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Apprenant' check (char_length(display_name) between 1 and 40),
  settings jsonb not null default '{}'::jsonb,
  xp integer not null default 0 check (xp >= 0),
  player_level integer not null default 1 check (player_level >= 1),
  streak_current integer not null default 0 check (streak_current >= 0),
  streak_best integer not null default 0 check (streak_best >= 0),
  streak_last_day date,
  current_level cefr_level not null default 'B1',
  placement jsonb,
  level_validations jsonb not null default '{}'::jsonb,
  leaderboard_opt_in boolean not null default false,
  weekly_xp integer not null default 0 check (weekly_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_vocabulary (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null, -- id du mot (vocabulary.id) ou "custom:<slug>"
  vocabulary_id text references vocabulary(id) on delete set null,
  custom_word jsonb, -- mot sauvegardé depuis le Reading Center hors banque
  ease real not null default 2.5 check (ease >= 1.3),
  interval_days integer not null default 0 check (interval_days >= 0),
  reps integer not null default 0 check (reps >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  due_at timestamptz not null default now(),
  last_review_at timestamptz,
  learned_at timestamptz,
  counters jsonb not null default '{}'::jsonb, -- recognition / recall / context / use
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, word_key),
  check (vocabulary_id is not null or custom_word is not null)
);
create index if not exists user_vocabulary_due_idx on user_vocabulary (user_id, due_at);

create table if not exists user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_key text not null, -- "lesson:b1-l1", "grammar:passive:exam", "boss:b1-c1"…
  best real not null default 0 check (best between 0 and 1),
  tries integer not null default 0 check (tries >= 0),
  completed_at timestamptz,
  data jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, progress_key)
);

create table if not exists exercise_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  skill skill_kind not null,
  level_id cefr_level not null,
  topic text,
  objective text,
  correct boolean not null,
  source text not null,
  created_at timestamptz not null default now()
);
create index if not exists exercise_attempts_user_idx on exercise_attempts (user_id, created_at desc);
create index if not exists exercise_attempts_topic_idx on exercise_attempts (user_id, topic);

create table if not exists learning_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  xp integer not null default 0 check (xp >= 0),
  seconds jsonb not null default '{}'::jsonb, -- temps par module
  stats jsonb not null default '{}'::jsonb,   -- mots appris, exercices réussis…
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references achievements(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists user_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_key text not null, -- "d:2026-03-10:learn-words"
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_key)
);

create table if not exists conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null check (persona in ('alex', 'james', 'michael', 'sarah', 'emma', 'daniel')),
  mode text not null check (mode in ('free', 'debate', 'professional', 'daily', 'academic')),
  started_at timestamptz not null,
  ended_at timestamptz,
  report jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_idx on conversations (user_id, started_at desc);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position >= 0),
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  corrections jsonb,
  created_at timestamptz not null default now(),
  unique (conversation_id, position)
);

create table if not exists writing_submissions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  level_id cefr_level not null,
  text text not null check (char_length(text) <= 20000),
  word_count integer not null check (word_count >= 0),
  feedback jsonb,
  created_at timestamptz not null default now()
);
create index if not exists writing_submissions_user_idx on writing_submissions (user_id, created_at desc);

create table if not exists speaking_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  level_id cefr_level not null,
  transcript text not null check (char_length(transcript) <= 10000),
  duration_sec real not null check (duration_sec >= 0),
  wpm integer not null default 0,
  accuracy real check (accuracy between 0 and 1),
  feedback jsonb,
  created_at timestamptz not null default now()
);

create table if not exists exam_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  kind text not null check (kind in ('mock', 'level', 'boss')),
  level_id cefr_level not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  passed boolean
);
create index if not exists exam_attempts_user_idx on exam_attempts (user_id, finished_at desc);

create table if not exists exam_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  skill skill_kind not null,
  score real not null check (score >= 0),
  max_score real not null check (max_score >= 0),
  rating real check (rating between 0 and 5),
  evaluated boolean not null default true,
  unique (attempt_id, skill)
);

create table if not exists error_history (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  skill skill_kind not null,
  topic text,
  item_id text,
  original text check (char_length(original) <= 2000),
  corrected text check (char_length(corrected) <= 2000),
  explanation text check (char_length(explanation) <= 4000),
  source text not null,
  created_at timestamptz not null default now()
);
create index if not exists error_history_user_topic_idx on error_history (user_id, topic, created_at desc);

create table if not exists revision_schedule (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  due_at timestamptz not null,
  interval_days integer not null check (interval_days >= 0),
  streak integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists revision_schedule_due_idx on revision_schedule (user_id, due_at);

-- ---------------------------------------------------------------------
-- Profil créé automatiquement à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 40), ''), 'Apprenant'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS : chaque utilisateur n'accède qu'à ses propres données
-- ---------------------------------------------------------------------
alter table learning_levels enable row level security;
alter table courses enable row level security;
alter table chapters enable row level security;
alter table grammar_topics enable row level security;
alter table lessons enable row level security;
alter table exercises enable row level security;
alter table questions enable row level security;
alter table vocabulary enable row level security;
alter table achievements enable row level security;
alter table daily_quests enable row level security;

do $$
declare t text;
begin
  foreach t in array array['learning_levels','courses','chapters','grammar_topics','lessons','exercises','questions','vocabulary','achievements','daily_quests']
  loop
    execute format('drop policy if exists "content is readable" on %I', t);
    execute format('create policy "content is readable" on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

alter table profiles enable row level security;
drop policy if exists "own profile select" on profiles;
drop policy if exists "own profile update" on profiles;
drop policy if exists "own profile insert" on profiles;
create policy "own profile select" on profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'user_vocabulary','user_progress','exercise_attempts','learning_sessions','user_achievements',
    'user_quests','conversations','conversation_messages','writing_submissions','speaking_attempts',
    'exam_attempts','exam_results','error_history','revision_schedule'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Un message ne peut être rattaché qu'à une conversation de l'utilisateur.
drop policy if exists "own rows" on conversation_messages;
create policy "own rows" on conversation_messages for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

drop policy if exists "own rows" on exam_results;
create policy "own rows" on exam_results for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from exam_attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- Classement facultatif : vue limitée aux profils ayant donné leur accord
-- (aucune donnée personnelle autre que le pseudo et l'XP)
-- ---------------------------------------------------------------------
create or replace function public.leaderboard(limit_count integer default 50)
returns table (display_name text, xp integer, weekly_xp integer, player_level integer, current_level cefr_level, is_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.display_name, p.xp, p.weekly_xp, p.player_level, p.current_level, p.id = auth.uid()
  from profiles p
  where p.leaderboard_opt_in = true and auth.uid() is not null
  order by p.weekly_xp desc, p.xp desc
  limit least(greatest(limit_count, 1), 100);
$$;

revoke all on function public.leaderboard(integer) from public, anon;
grant execute on function public.leaderboard(integer) to authenticated;
