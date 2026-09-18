import { describe, expect, it } from "vitest";
import { paywallHref, publicPageHref, publicReturnDestination } from "./publicNavigation";

describe("public page navigation", () => {
  it("preserves purchase entry, login mode, internal destination and selected plan", () => {
    const href = paywallHref({ from: "login", mode: "signup", redirect: "/practice/session?plan=15" }, "monthly");
    expect(publicReturnDestination(href)).toBe(href);
    expect(new URL(publicPageHref("/privacy", href), "https://vocali.invalid").searchParams.get("returnTo")).toBe(href);
  });
  it.each(["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/privacy", "/support", "/unknown", "/%2f%2fevil.invalid", "javascript:alert(1)"])("rejects unsafe or looping destinations: %s", (href) => {
    expect(publicReturnDestination(href)).toBeNull();
  });
  it("drops unknown paywall fields and sanitizes nested redirects", () => {
    expect(publicReturnDestination("/paywall?from=login&redirect=https://evil.invalid&plan=invalid&untrusted=true")).toBe("/paywall?from=login&mode=login&redirect=%2Fhome");
  });
});
