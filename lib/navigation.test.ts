import { describe, expect, it } from "vitest";
import { secondaryNavigation, workspaceNavigation } from "./navigation";

describe("workspace navigation", () => {
  it("keeps the required CaseKit sections in the documented order", () => {
    expect(workspaceNavigation.map((item) => item.label)).toEqual([
      "Home",
      "Cases",
      "Documents",
      "Tasks",
      "Calendar",
      "Contacts",
      "AI Assistant",
    ]);
  });

  it("keeps settings in secondary navigation", () => {
    expect(secondaryNavigation).toEqual([{ label: "Settings", href: "/settings" }]);
  });
});
