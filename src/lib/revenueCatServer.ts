import "server-only";

import {
  parseRevenueCatEntitlement,
  type RevenueCatSubscriberResponse,
  type ServerEntitlementResult,
} from "@/lib/revenueCatEntitlement";

export async function getRevenueCatEntitlement(
  appUserId: string,
): Promise<ServerEntitlementResult> {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY?.trim();

  if (!apiKey) {
    return { ok: false, reason: "configuration" };
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error("RevenueCat entitlement lookup failed", {
        status: response.status,
        userId: appUserId,
      });
      return { ok: false, reason: "provider" };
    }

    return parseRevenueCatEntitlement(
      (await response.json()) as RevenueCatSubscriberResponse,
    );
  } catch (error) {
    console.error("RevenueCat entitlement lookup failed", {
      error: error instanceof Error ? error.message : String(error),
      userId: appUserId,
    });
    return { ok: false, reason: "provider" };
  }
}

export { parseRevenueCatEntitlement } from "@/lib/revenueCatEntitlement";
