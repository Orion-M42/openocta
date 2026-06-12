import { describe, expect, it } from "vitest";
import {
  SETUP_WIZARD_STEPS,
  getTabGroups,
  iconForTab,
  inferBasePathFromPathname,
  markSetupWizardCompleted,
  markSetupWizardSkipPendingConfigSync,
  clearSetupWizardSkipPendingConfigSync,
  hasSetupWizardSkipPendingConfigSync,
  normalizeBasePath,
  normalizePath,
  pathForTab,
  resolveSetupWizardVersion,
  shouldShowSetupWizard,
  subtitleForTab,
  tabFromPath,
  titleForTab,
  type Tab,
} from "./navigation.ts";

const APP_VERSION = "0.2.7-45-g99c7403";

/** All valid tab identifiers derived from getTabGroups() */
const ALL_TABS: Tab[] = getTabGroups().flatMap((group) => group.tabs) as Tab[];

describe("iconForTab", () => {
  it("returns a non-empty string for every tab", () => {
    for (const tab of ALL_TABS) {
      expect(iconForTab(tab)).toBeTruthy();
    }
  });
});

describe("normalizeBasePath", () => {
  it("normalizes trailing slashes", () => {
    expect(normalizeBasePath("/ui/")).toBe("/ui");
    expect(normalizeBasePath("/ui")).toBe("/ui");
    expect(normalizeBasePath("")).toBe("");
  });
});

describe("normalizePath", () => {
  it("strips base path prefix", () => {
    expect(normalizePath("/ui/chat", "/ui")).toBe("/chat");
    expect(normalizePath("/chat", "")).toBe("/chat");
  });
});

describe("pathForTab", () => {
  it("maps tabs to paths", () => {
    expect(pathForTab("chat", "")).toBe("/chat");
    expect(pathForTab("chat", "/ui")).toBe("/ui/chat");
  });
});

describe("tabFromPath", () => {
  it("maps paths to tabs", () => {
    expect(tabFromPath("/chat", "")).toBe("chat");
    expect(tabFromPath("/ui/chat", "/ui")).toBe("chat");
  });
});

describe("titleForTab", () => {
  it("returns a title for every tab", () => {
    for (const tab of ALL_TABS) {
      expect(titleForTab(tab)).toBeTruthy();
    }
  });
});

describe("subtitleForTab", () => {
  it("returns a subtitle for every tab", () => {
    for (const tab of ALL_TABS) {
      expect(subtitleForTab(tab)).toBeTruthy();
    }
  });
});

describe("inferBasePathFromPathname", () => {
  it("handles index.html suffix", () => {
    expect(inferBasePathFromPathname("/index.html")).toBe("");
    expect(inferBasePathFromPathname("/ui/index.html")).toBe("/ui");
  });
});

describe("setup wizard", () => {
  it("defines five wizard steps", () => {
    expect(SETUP_WIZARD_STEPS).toEqual(["models", "resources", "environment", "scenarios", "summary"]);
  });

  it("resolves version from config.schema and hello-ok", () => {
    expect(resolveSetupWizardVersion("0.2.7-45-g99c7403", { server: { version: "0.0.1-dev" } })).toBe(
      "0.2.7-45-g99c7403",
    );
    expect(resolveSetupWizardVersion(null, { server: { version: "0.2.7-45-g99c7403" } })).toBe(
      "0.2.7-45-g99c7403",
    );
    expect(resolveSetupWizardVersion(null, null)).toBeNull();
  });

  it("shows wizard until completed for current version", () => {
    localStorage.clear();
    expect(shouldShowSetupWizard(APP_VERSION)).toBe(true);
    markSetupWizardCompleted(APP_VERSION);
    expect(shouldShowSetupWizard(APP_VERSION)).toBe(false);
    expect(shouldShowSetupWizard("other-version")).toBe(true);
    localStorage.clear();
  });

  it("reads completion from openocta.json wizard.setup", () => {
    localStorage.clear();
    const config = {
      wizard: {
        setup: {
          version: APP_VERSION,
          status: "completed",
          completedAt: "2026-06-09T00:00:00.000Z",
        },
      },
    };
    expect(shouldShowSetupWizard(APP_VERSION, config)).toBe(false);
    expect(shouldShowSetupWizard("v9.9.9", config)).toBe(true);
  });

  it("reads skipped status from openocta.json wizard.setup", () => {
    localStorage.clear();
    const config = {
      wizard: {
        setup: {
          version: APP_VERSION,
          status: "skipped",
          completedAt: "2026-06-09T00:00:00.000Z",
          skippedSteps: SETUP_WIZARD_STEPS,
        },
      },
    };
    expect(shouldShowSetupWizard(APP_VERSION, config)).toBe(false);
    localStorage.clear();
  });

  it("shows wizard when config has no wizard.setup even if localStorage is completed", () => {
    localStorage.clear();
    markSetupWizardCompleted(APP_VERSION);
    expect(shouldShowSetupWizard(APP_VERSION, {})).toBe(true);
    localStorage.clear();
  });

  it("hides wizard while skip-all is pending sync to openocta.json", () => {
    localStorage.clear();
    markSetupWizardCompleted(APP_VERSION);
    markSetupWizardSkipPendingConfigSync(APP_VERSION);
    expect(hasSetupWizardSkipPendingConfigSync(APP_VERSION)).toBe(true);
    expect(shouldShowSetupWizard(APP_VERSION, {})).toBe(false);
    clearSetupWizardSkipPendingConfigSync();
    expect(shouldShowSetupWizard(APP_VERSION, {})).toBe(true);
    localStorage.clear();
  });

  it("does not show wizard when version is unavailable", () => {
    expect(shouldShowSetupWizard("", {})).toBe(false);
    expect(shouldShowSetupWizard("  ", {})).toBe(false);
  });
});

describe("getTabGroups", () => {
  it("contains all expected groups", () => {
    const labels = getTabGroups().map((g) => g.label);
    expect(labels).toContain("Chat");
    expect(labels).toContain("Control");
    expect(labels).toContain("Agent");
  });

  it("all tabs are unique", () => {
    const allTabs = getTabGroups().flatMap((g) => g.tabs);
    const uniqueTabs = new Set(allTabs);
    expect(uniqueTabs.size).toBe(allTabs.length);
  });
});
