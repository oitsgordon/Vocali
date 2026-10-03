// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
vi.mock("next/script", () => ({ default: function MockScript({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
} }));
import { TurnstileChallenge } from "./TurnstileChallenge";

let options: Parameters<NonNullable<Window["turnstile"]>["render"]>[1];
const renderWidget = vi.fn();
const removeWidget = vi.fn();
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "public-test-key");
  vi.clearAllMocks();
  renderWidget.mockImplementation((_container, config) => { options = config; return "widget"; });
  window.turnstile = { render: renderWidget, remove: removeWidget };
});
afterEach(() => { cleanup(); delete window.turnstile; vi.unstubAllEnvs(); });

describe("Turnstile lifecycle", () => {
  it("renders with an already loaded script, preserves the widget across callback changes, and renews after consumption", () => {
    const onToken = vi.fn();
    const { rerender } = render(<TurnstileChallenge onToken={onToken} onError={vi.fn()} />);
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(options.size).toBe("compact");
    const nextTokenHandler = vi.fn();
    rerender(<TurnstileChallenge onToken={nextTokenHandler} onError={vi.fn()} />);
    expect(renderWidget).toHaveBeenCalledTimes(1);
    act(() => options.callback("fresh-token"));
    expect(nextTokenHandler).toHaveBeenCalledWith("fresh-token");
    rerender(<TurnstileChallenge resetKey={1} onToken={nextTokenHandler} onError={vi.fn()} />);
    expect(removeWidget).toHaveBeenCalledWith("widget");
    expect(renderWidget).toHaveBeenCalledTimes(2);
  });
  it("clears expired tokens and lets the user retry a failed challenge", () => {
    const onToken = vi.fn();
    render(<TurnstileChallenge onToken={onToken} onError={vi.fn()} />);
    act(() => options["expired-callback"]());
    expect(onToken).toHaveBeenCalledWith(null);
    expect(screen.getByRole("alert").textContent).toContain("expired");
    fireEvent.click(screen.getByRole("button", { name: "Retry security check" }));
    expect(renderWidget).toHaveBeenCalledTimes(2);
    act(() => options["error-callback"]());
    expect(screen.getByRole("alert").textContent).toContain("could not load");
    fireEvent.click(screen.getByRole("button", { name: "Retry security check" }));
    expect(renderWidget).toHaveBeenCalledTimes(3);
  });
});
