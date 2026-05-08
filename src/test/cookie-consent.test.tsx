import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach } from "vitest";
import { CookieConsent } from "@/components/CookieConsent";

const STORAGE_KEY = "herdsync.cookie-consent.v1";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const renderConsent = () =>
  render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );

describe("CookieConsent", () => {
  it("renders banner when no preference is stored", async () => {
    renderConsent();
    const button = await screen.findByRole("button", { name: /accept all/i });
    expect(button).toBeInTheDocument();
  });

  it("hides banner and persists choice on accept", async () => {
    renderConsent();
    const accept = await screen.findByRole("button", { name: /accept all/i });
    fireEvent.click(accept);
    expect(localStorage.getItem(STORAGE_KEY)).toContain("all");
  });

  it("does not render when consent is already stored", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ value: "all" }));
    renderConsent();
    expect(screen.queryByRole("dialog", { name: /cookie consent/i })).toBeNull();
  });
});
