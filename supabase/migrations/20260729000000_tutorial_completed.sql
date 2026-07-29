-- First-time onboarding: false until the user finishes the tutorial.
alter table public.profiles
  add column if not exists tutorial_completed boolean not null default false;
