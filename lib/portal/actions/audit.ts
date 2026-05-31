import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { PortalUser } from "@/lib/portal/types";

export async function writeAudit(
  actor: PortalUser,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Json = {},
) {
  const supabase = getSupabaseAdmin();
  await supabase.from("audit_events").insert({
    actor_user_id: actor.id,
    employer_id: actor.employer_id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}
