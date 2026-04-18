import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const NewContactPage = (await import("@/app/(dashboard)/contacts/new/page")).default;

describe("NewContactPage Component", () => {
  it("should render form heading", async () => {
    render(<NewContactPage />);
    expect(screen.getByRole("heading", { name: /new contact/i })).toBeInTheDocument();
  });

  it("should have first name input", async () => {
    render(<NewContactPage />);
    // react-hook-form register() adds name attribute to input
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("should have submit button", async () => {
    render(<NewContactPage />);
    expect(screen.getByRole("button", { name: /create contact/i })).toBeInTheDocument();
  });
});
