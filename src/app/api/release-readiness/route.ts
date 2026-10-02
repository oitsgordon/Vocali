import { NextResponse } from "next/server";
import {
  isRevenueCatIosPublicKey,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_PRODUCT_IDS,
} from "../../../lib/revenueCatConfig";

export const dynamic = "force-dynamic";

export function GET() {
  const revenueCatApiKey =
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY?.trim() ?? "";
  const accessGateEnabled =
    process.env.NEXT_PUBLIC_ACCESS_GATE_ENABLED === "true";
  const supportEmailConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim(),
  );
  const turnstileConfigured = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );
  const productionRevenueCatKey = isRevenueCatIosPublicKey(revenueCatApiKey);
  const products = Object.values(REVENUECAT_PRODUCT_IDS);
  const ready =
    accessGateEnabled &&
    supportEmailConfigured &&
    turnstileConfigured &&
    productionRevenueCatKey &&
    REVENUECAT_ENTITLEMENT_ID === "vocali_pro" &&
    products.includes("yearly") &&
    products.includes("monthly");

  return NextResponse.json(
    {
      ready,
      accessGateEnabled,
      supportEmailConfigured,
      turnstileConfigured,
      revenueCat: {
        configured: revenueCatApiKey.length > 0,
        entitlement: REVENUECAT_ENTITLEMENT_ID,
        productionKey: productionRevenueCatKey,
        products,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
