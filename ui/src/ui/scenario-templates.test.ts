import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAT_QUICK_PROMPTS,
  normalizeScenarioQuickPrompts,
  resolveChatQuickPrompts,
} from "./scenario-templates.ts";

describe("scenario quick prompts", () => {
  it("returns defaults when no scenario is initialized", () => {
    expect(resolveChatQuickPrompts(null)).toEqual([...DEFAULT_CHAT_QUICK_PROMPTS]);
    expect(resolveChatQuickPrompts({})).toEqual([...DEFAULT_CHAT_QUICK_PROMPTS]);
  });

  it("returns scenario prompts when wizard.setup.scenarioId is set", () => {
    const prompts = resolveChatQuickPrompts({
      wizard: {
        setup: {
          scenarioId: "host-inspection",
        },
      },
    });
    expect(prompts[0]).toBe("对目标主机执行服务器巡检并输出 Markdown 报告");
    expect(prompts.length).toBeLessThanOrEqual(5);
  });

  it("falls back to defaults when initialized scenario id is unknown", () => {
    expect(
      resolveChatQuickPrompts({
        wizard: {
          setup: {
            scenarioId: "unknown-scenario",
          },
        },
      }),
    ).toEqual([...DEFAULT_CHAT_QUICK_PROMPTS]);
  });

  it("limits quick prompts to five non-empty strings", () => {
    expect(
      normalizeScenarioQuickPrompts([
        "  one  ",
        "",
        "two",
        3,
        "three",
        "four",
        "five",
        "six",
      ]),
    ).toEqual(["one", "two", "three", "four", "five"]);
  });
});
