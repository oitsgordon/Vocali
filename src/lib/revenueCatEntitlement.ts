import { REVENUECAT_ENTITLEMENT_ID } from "@/lib/revenueCatConfig";

export type RevenueCatSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<
      string,
      { expires_date?: string | null } | undefined
    >;
  };
};

export type ServerEntitlementResult =
  | { ok: true; active: boolean; expiresAt: string | null }
  | { ok: false; reason: "configuration" | "provider" };

export function parseRevenueCatEntitlement(
  payload: RevenueCatSubscriberResponse,
  now = new Date(),
): ServerEntitlementResult {
  const entitlement = payload.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT_ID];

  if (!entitlement) return { ok: true, active: false, expiresAt: null };
  if (entitlement.expires_date === null) return { ok: true, active: true, expiresAt: null };
  if (typeof entitlement.expires_date !== "string") return { ok: false, reason: "provider" };

  const expiresAt = new Date(entitlement.expires_date);
  if (Number.isNaN(expiresAt.getTime())) return { ok: false, reason: "provider" };

  return {
    ok: true,
    active: expiresAt.getTime() > now.getTime(),
    expiresAt: entitlement.expires_date,
  };
}
