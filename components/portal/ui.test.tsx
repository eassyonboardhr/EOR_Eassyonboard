import { describe, expect, test, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => null,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/notification-counts", () => ({
  EMPTY_PORTAL_NOTIFICATION_COUNTS: {
    messages: 0,
    notices: 0,
    leaves: 0,
    documents: 0,
    onboarding: 0,
    resignations: 0,
    offboarding: 0,
    finances: 0,
    employers: 0,
    employees: 0,
  },
}));

describe("portal notification badge helpers", () => {
  test("formats notification badge counts", async () => {
    const { formatNotificationBadge } = await import("@/components/portal/ui");

    expect(formatNotificationBadge(0)).toBeUndefined();
    expect(formatNotificationBadge(-1)).toBeUndefined();
    expect(formatNotificationBadge(undefined)).toBeUndefined();
    expect(formatNotificationBadge(1)).toBe("1");
    expect(formatNotificationBadge(99)).toBe("99");
    expect(formatNotificationBadge(100)).toBe("99+");
  });

  test("resolves nav badge keys from role-scoped counts and hides zero badges", async () => {
    const { resolveNavBadges } = await import("@/components/portal/ui");

    const items = resolveNavBadges(
      [
        { label: "Messages", icon: "M", href: "/dashboard/messages", badgeKey: "messages" },
        { label: "Documents", icon: "DOC", href: "/dashboard/documents", badgeKey: "documents" },
      ],
      {
        messages: 3,
        notices: 0,
        leaves: 0,
        documents: 0,
        onboarding: 0,
        resignations: 0,
        offboarding: 0,
        finances: 0,
        employers: 0,
        employees: 0,
      },
    );

    expect(items[0]).toMatchObject({ label: "Messages", badge: "3" });
    expect(items[1]).toMatchObject({ label: "Documents", badge: undefined });
  });
});
