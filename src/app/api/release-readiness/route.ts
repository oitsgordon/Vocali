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

  return NextResponse.json(
    {
      revenueCat: {
        configured: revenueCatApiKey.length > 0,
        entitlement: REVENUECAT_ENTITLEMENT_ID,
        productionKey: isRevenueCatIosPublicKey(revenueCatApiKey),
        products: Object.values(REVENUECAT_PRODUCT_IDS),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
