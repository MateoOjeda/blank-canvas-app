
-- Enum
create type public.app_role as enum ('trainer', 'student');

-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text not null,
  avatar_initials text,
  avatar_url text,
  weight numeric,
  age integer,
  mercadopago_alias text,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Trainer-student links
create table public.trainer_students (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  plan_type text,
  created_at timestamptz not null default now(),
  unique (trainer_id, student_id)
);

-- Exercises
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  sets integer not null default 3,
  reps integer not null default 10,
  weight numeric not null default 0,
  day text not null,
  body_part text not null default '',
  completed boolean not null default false,
  is_to_failure boolean not null default false,
  created_at timestamptz not null default now()
);

-- Exercise logs
create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  trainer_id uuid references auth.users(id) on delete cascade not null,
  actual_sets integer,
  actual_reps integer,
  actual_weight numeric,
  completed boolean not null default false,
  notes text not null default '',
  log_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Plans
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  icon text,
  price numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Plan levels
create table public.plan_levels (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  plan_type text not null,
  level text not null,
  content text not null default '',
  unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Weight history
create table public.weight_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade not null,
  weight numeric not null,
  recorded_at timestamptz not null default now()
);

-- Trainer changes (feed)
create table public.trainer_changes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  change_type text not null,
  description text not null default '',
  entity_id text,
  created_at timestamptz not null default now()
);

-- Change readings
create table public.change_readings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade not null unique,
  last_read_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  message text not null default '',
  type text not null default 'info',
  read boolean not null default false,
  related_id text,
  created_at timestamptz not null default now()
);

-- Body transformations
create table public.body_transformations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade not null,
  before_photo_url text,
  before_date date,
  before_weight numeric,
  after_photo_url text,
  after_date date,
  after_weight numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seguimiento personal
create table public.seguimiento_personal (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade not null,
  hora_dormir text not null default '',
  hora_despertar text not null default '',
  dificultad_levantarse text not null default '',
  hora_ideal_despertar text not null default '',
  desayuno_habito text not null default '',
  bano_levantarse text not null default '',
  entrena boolean not null default false,
  tipo_entrenamiento text not null default '',
  horario_entrenamiento text not null default '',
  obligaciones_diarias text not null default '',
  horarios_ocupados text not null default '',
  personas_cargo text not null default '',
  organizacion_comidas text not null default '',
  nuevos_habitos text not null default '',
  tiempo_para_si text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Security definer functions
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create or replace function public.get_user_role(_user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- RLS for all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.trainer_students enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.plans enable row level security;
alter table public.plan_levels enable row level security;
alter table public.weight_history enable row level security;
alter table public.trainer_changes enable row level security;
alter table public.change_readings enable row level security;
alter table public.notifications enable row level security;
alter table public.body_transformations enable row level security;
alter table public.seguimiento_personal enable row level security;

-- Simple RLS: authenticated users can do everything (can be tightened later)
create policy "auth_all" on public.profiles for all to authenticated using (true) with check (true);
create policy "auth_all" on public.user_roles for all to authenticated using (true) with check (true);
create policy "auth_all" on public.trainer_students for all to authenticated using (true) with check (true);
create policy "auth_all" on public.exercises for all to authenticated using (true) with check (true);
create policy "auth_all" on public.exercise_logs for all to authenticated using (true) with check (true);
create policy "auth_all" on public.plans for all to authenticated using (true) with check (true);
create policy "auth_all" on public.plan_levels for all to authenticated using (true) with check (true);
create policy "auth_all" on public.weight_history for all to authenticated using (true) with check (true);
create policy "auth_all" on public.trainer_changes for all to authenticated using (true) with check (true);
create policy "auth_all" on public.change_readings for all to authenticated using (true) with check (true);
create policy "auth_all" on public.notifications for all to authenticated using (true) with check (true);
create policy "auth_all" on public.body_transformations for all to authenticated using (true) with check (true);
create policy "auth_all" on public.seguimiento_personal for all to authenticated using (true) with check (true);

-- Trigger for auto-creating profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Usuario'),
    upper(left(coalesce(new.raw_user_meta_data->>'display_name', 'US'), 2))
  );
  insert into public.user_roles (user_id, role)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
