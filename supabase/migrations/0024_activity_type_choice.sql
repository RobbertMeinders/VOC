-- Bestuur/beheer kon een activiteit tot nu toe alleen als officiële
-- "Activiteit" aanmaken (altijd source='voc'/status='approved', ongeacht wat
-- ze zelf kozen). Nu kunnen zij bewust ook "Ingebracht" indienen, dat dan
-- gewoon dezelfde bestaande goedkeuringslogica volgt als bij een gewoon lid.
-- Een gewoon lid kan nog steeds nooit meer dan 'lid'/'pending' krijgen,
-- ongeacht wat er vanuit de client wordt meegestuurd.
create or replace function public.normalize_activity_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_board() then
    if new.source = 'lid' then
      new.status = 'pending';
    else
      new.source = 'voc';
      new.status = 'approved';
    end if;
  else
    new.source = 'lid';
    new.status = 'pending';
  end if;
  return new;
end;
$$;
