import { saveSettingsAction } from "@/lib/portal/actions/profile";
import { getSettingsData } from "@/lib/portal/profile";
import { requirePortalRole } from "@/lib/portal/session";
import { Panel, PortalShell, SubmitButton } from "@/components/portal/ui";

export default async function SettingsPage() {
  const session = await requirePortalRole(["super_admin", "admin", "employer_admin", "employee"]);
  const data = await getSettingsData(session);
  const preferences = (data.user?.notification_preferences ?? {}) as Record<string, boolean>;

  return (
    <PortalShell session={session} title="Settings" subtitle="Theme and notification preferences for your portal account.">
      <Panel title="Display and notifications">
        <form action={saveSettingsAction} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Theme
            <select name="theme_preference" defaultValue={data.user?.theme_preference ?? "system"} className="h-10 rounded-xl border border-slate-300 bg-white px-3">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" name="email_summary" defaultChecked={Boolean(preferences.email_summary)} /> Email summary later</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="important_only" defaultChecked={Boolean(preferences.important_only)} /> Show important alerts first</label>
          </div>
          <div className="md:col-span-2"><SubmitButton>Save Settings</SubmitButton></div>
        </form>
      </Panel>
    </PortalShell>
  );
}

