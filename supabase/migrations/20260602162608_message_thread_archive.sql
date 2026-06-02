alter table if exists message_participants
  add column if not exists archived_at timestamptz;

create index if not exists message_participants_user_archive_idx
  on message_participants (portal_user_id, archived_at, created_at desc);
