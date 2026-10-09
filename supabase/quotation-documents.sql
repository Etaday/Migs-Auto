-- Quotation documents: the invoices table now also holds quotations (kind = 'quotation').
-- Run once in Supabase: SQL Editor > New query > paste > Run.

do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.invoices'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.invoices drop constraint %I', c);
  end loop;
end $$;

alter table public.invoices add constraint invoices_kind_check check (kind in ('invoice', 'receipt', 'quotation'));
