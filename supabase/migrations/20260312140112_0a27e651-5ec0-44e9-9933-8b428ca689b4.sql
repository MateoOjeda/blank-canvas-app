
-- Custom survey questions designed by trainers
create table public.custom_survey_questions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  question_text text not null,
  question_type text not null default 'text' check (question_type in ('text', 'multiple_choice', 'yes_no')),
  options text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Student responses to custom survey questions
create table public.custom_survey_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.custom_survey_questions(id) on delete cascade not null,
  response_value text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, question_id)
);

-- RLS
alter table public.custom_survey_questions enable row level security;
alter table public.custom_survey_responses enable row level security;

-- Trainers CRUD their own questions
create policy "Trainers manage own questions"
  on public.custom_survey_questions for all
  to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- Anyone authenticated can read questions (students need to see their trainer's questions)
create policy "Authenticated users can read questions"
  on public.custom_survey_questions for select
  to authenticated
  using (true);

-- Students manage their own responses
create policy "Students manage own responses"
  on public.custom_survey_responses for all
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Authenticated users can read responses (trainers need to see student responses)
create policy "Authenticated users can read responses"
  on public.custom_survey_responses for select
  to authenticated
  using (true);
