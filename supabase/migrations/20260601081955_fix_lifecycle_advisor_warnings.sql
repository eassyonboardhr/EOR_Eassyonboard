drop index if exists resignations_employer_status_created_idx;

alter function public.set_updated_at()
  set search_path = public;
