-- N2 (D1, nieuwsbriefsysteem-plan): profiles.email liep tot nu toe nooit mee
-- met een e-mailadreswijziging in het account (auth.users) — alleen
-- handle_new_user (0001_init.sql) zette 'm ooit, bij het aanmaken van het
-- account. Een lid dat zijn adres wijzigt, bleef daardoor nieuwsbrieven op
-- het oude adres ontvangen. Mirrors handle_new_user qua vorm: security
-- definer, search_path vast op public, trigger op auth.users.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_user_email_change();
