import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppViewState } from "./app-view-state.ts";
import {
  flushSetupWizardSkipToConfig,
  persistSetupWizardSkipped,
} from "./app-setup-wizard.ts";
import {
  clearSetupWizardSkipPendingConfigSync,
  hasSetupWizardSkipPendingConfigSync,
  markSetupWizardCompleted,
  markSetupWizardSkipPendingConfigSync,
} from "./setup-wizard.ts";

const APP_VERSION = "0.2.7-45-g99c7403";

const loadConfigMock = vi.hoisted(() => vi.fn());
const saveConfigPatchMock = vi.hoisted(() => vi.fn());

vi.mock("./controllers/config.ts", () => ({
  loadConfig: loadConfigMock,
  saveConfig: vi.fn(),
  saveConfigPatch: saveConfigPatchMock,
  updateConfigFormValue: vi.fn((state, path, value) => {
    const base = { ...(state.configForm ?? state.configSnapshot?.config ?? {}) };
    let current: Record<string, unknown> = base;
    for (let i = 0; i < path.length - 1; i += 1) {
      const key = String(path[i]);
      const next = (current[key] ?? {}) as Record<string, unknown>;
      current[key] = next;
      current = next;
    }
    current[String(path[path.length - 1])] = value;
    state.configForm = base;
    state.configFormDirty = true;
  }),
}));

function createState(overrides: Partial<AppViewState> = {}): AppViewState {
  return {
    connected: true,
    client: {} as AppViewState["client"],
    configSnapshot: {
      hash: "hash-1",
      config: {},
      valid: true,
      issues: [],
    },
    configForm: {},
    configFormDirty: false,
    lastError: null,
    configSchemaVersion: APP_VERSION,
    hello: { type: "hello-ok", protocol: 3, server: { version: APP_VERSION } },
    setupWizardSession: {
      modelsConfigured: [],
      defaultModelRef: null,
      enabledModelProviders: [],
      skillsInstalled: [],
      employeesInstalled: [],
      mcpsInstalled: [],
      channelsEnabled: [],
      channelsConfigured: [],
      selectedScenarioId: null,
      selectedScenarioName: null,
      scenarioEnvVars: {},
      scenariosRun: [],
      skippedSteps: [],
      environmentInstalled: [],
    },
    ...overrides,
  } as AppViewState;
}

describe("setup wizard skip-all persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    loadConfigMock.mockReset();
    saveConfigPatchMock.mockReset();
    loadConfigMock.mockResolvedValue(undefined);
    saveConfigPatchMock.mockResolvedValue(undefined);
  });

  it("writes wizard.setup with skipped status to openocta.json when connected", async () => {
    const state = createState();
    await persistSetupWizardSkipped(state);

    expect(saveConfigPatchMock).toHaveBeenCalledTimes(1);
    expect(saveConfigPatchMock).toHaveBeenCalledWith(state, {
      wizard: {
        setup: expect.objectContaining({
          version: APP_VERSION,
          status: "skipped",
          skippedSteps: ["models", "resources", "environment", "scenarios", "summary"],
        }),
      },
    });
    expect(hasSetupWizardSkipPendingConfigSync(APP_VERSION)).toBe(false);
  });

  it("still patches openocta.json when configForm already has skipped but snapshot does not", async () => {
    const state = createState({
      configForm: {
        wizard: {
          setup: {
            version: APP_VERSION,
            status: "skipped",
            completedAt: "2026-06-09T00:00:00.000Z",
            skippedSteps: ["models", "resources", "environment", "scenarios", "summary"],
          },
        },
      },
      configFormDirty: true,
      configSnapshot: {
        hash: "hash-1",
        config: {},
        valid: true,
        issues: [],
      },
    });

    const ok = await flushSetupWizardSkipToConfig(state);

    expect(ok).toBe(true);
    expect(saveConfigPatchMock).toHaveBeenCalledTimes(1);
    expect(hasSetupWizardSkipPendingConfigSync(APP_VERSION)).toBe(false);
  });

  it("marks pending sync when gateway is not connected yet", async () => {
    const state = createState({ connected: false, client: null });
    await persistSetupWizardSkipped(state);

    expect(saveConfigPatchMock).not.toHaveBeenCalled();
    expect(hasSetupWizardSkipPendingConfigSync(APP_VERSION)).toBe(true);
  });

  it("flushes pending skip to openocta.json after gateway connects", async () => {
    markSetupWizardCompleted(APP_VERSION);
    markSetupWizardSkipPendingConfigSync(APP_VERSION);
    const state = createState();

    const ok = await flushSetupWizardSkipToConfig(state);

    expect(ok).toBe(true);
    expect(saveConfigPatchMock).toHaveBeenCalledTimes(1);
    expect(hasSetupWizardSkipPendingConfigSync(APP_VERSION)).toBe(false);
  });

  it("does not patch again when wizard.setup is already skipped in config", async () => {
    clearSetupWizardSkipPendingConfigSync();
    markSetupWizardSkipPendingConfigSync();
    const state = createState({
      configSnapshot: {
        hash: "hash-1",
        config: {
          wizard: {
            setup: {
              version: APP_VERSION,
              status: "skipped",
              completedAt: "2026-06-09T00:00:00.000Z",
            },
          },
        },
        valid: true,
        issues: [],
      },
    });

    const ok = await flushSetupWizardSkipToConfig(state);

    expect(ok).toBe(true);
    expect(saveConfigPatchMock).not.toHaveBeenCalled();
    expect(hasSetupWizardSkipPendingConfigSync(APP_VERSION)).toBe(false);
  });
});
