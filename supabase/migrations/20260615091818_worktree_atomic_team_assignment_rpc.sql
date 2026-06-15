create or replace function public.bulk_update_employee_team_assignments(
  p_employer_id uuid,
  p_assignments jsonb
)
returns table(updated_count integer)
language plpgsql
set search_path = public
as $$
declare
  v_assignment_count integer;
begin
  if p_employer_id is null then
    raise exception 'Employer id is required.';
  end if;

  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'Assignments must be a JSON array.';
  end if;

  with raw_assignments as (
    select employee_id, team_id
    from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
  )
  select count(*) into v_assignment_count
  from raw_assignments;

  if v_assignment_count = 0 then
    updated_count := 0;
    return next;
    return;
  end if;

  if exists (
    with raw_assignments as (
      select employee_id, team_id
      from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
    )
    select 1
    from raw_assignments
    where employee_id is null or btrim(employee_id) = ''
  ) then
    raise exception 'Every assignment must include an employee_id.';
  end if;

  if exists (
    with raw_assignments as (
      select employee_id, team_id
      from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
    )
    select 1
    from raw_assignments
    where employee_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (
        team_id is not null
        and btrim(team_id) <> ''
        and team_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
  ) then
    raise exception 'Assignment ids must be valid UUID values.';
  end if;

  if exists (
    with parsed_assignments as (
      select employee_id::uuid as employee_id
      from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
    )
    select 1
    from parsed_assignments
    group by employee_id
    having count(*) > 1
  ) then
    raise exception 'Each employee can only appear once in a team assignment save.';
  end if;

  if exists (
    with parsed_assignments as (
      select employee_id::uuid as employee_id
      from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
    )
    select 1
    from parsed_assignments assignment
    left join public.employees employee
      on employee.id = assignment.employee_id
      and employee.employer_id = p_employer_id
    where employee.id is null
  ) then
    raise exception 'Employee is outside your employer scope.';
  end if;

  if exists (
    with parsed_assignments as (
      select nullif(team_id, '')::uuid as team_id
      from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
    )
    select 1
    from parsed_assignments assignment
    left join public.teams team
      on team.id = assignment.team_id
      and team.employer_id = p_employer_id
    where assignment.team_id is not null
      and team.id is null
  ) then
    raise exception 'Team is outside your employer scope.';
  end if;

  with parsed_assignments as (
    select
      employee_id::uuid as employee_id,
      nullif(team_id, '')::uuid as team_id
    from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
  )
  delete from public.team_members member
  using public.teams team, parsed_assignments assignment
  where member.team_id = team.id
    and team.employer_id = p_employer_id
    and member.employee_id = assignment.employee_id;

  with parsed_assignments as (
    select
      employee_id::uuid as employee_id,
      nullif(team_id, '')::uuid as team_id
    from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
  )
  insert into public.team_members (team_id, employee_id, role_in_team)
  select team_id, employee_id, null
  from parsed_assignments
  where team_id is not null
  on conflict (team_id, employee_id)
  do update set role_in_team = excluded.role_in_team;

  with parsed_assignments as (
    select
      employee_id::uuid as employee_id,
      nullif(team_id, '')::uuid as team_id
    from jsonb_to_recordset(p_assignments) as item(employee_id text, team_id text)
  )
  update public.employees employee
  set team_id = assignment.team_id
  from parsed_assignments assignment
  where employee.id = assignment.employee_id
    and employee.employer_id = p_employer_id;

  updated_count := v_assignment_count;
  return next;
end;
$$;

revoke all on function public.bulk_update_employee_team_assignments(uuid, jsonb) from public;
revoke all on function public.bulk_update_employee_team_assignments(uuid, jsonb) from anon;
revoke all on function public.bulk_update_employee_team_assignments(uuid, jsonb) from authenticated;
grant execute on function public.bulk_update_employee_team_assignments(uuid, jsonb) to service_role;
