import type { ConfigState } from "./config.ts";
import { loadConfig, saveConfigPatch } from "./config.ts";

/** Security config form for UI (commandPolicy uses deny/ask/allow) */
export type SecurityConfigForm = {
  preset?: string;
  sandbox?: {
    enabled?: boolean;
    allowedPaths?: string[];
    networkAllow?: string[];
    root?: string;
    resourceLimit?: {
      maxCpuPercent?: number;
      maxMemoryBytes?: number | string;
      maxDiskBytes?: number | string;
    };
    approvalStore?: string;
  };
  commandPolicy?: {
    enabled?: boolean;
    defaultPolicy?: "deny" | "ask" | "allow";
    deny?: string[];
    ask?: string[];
    allow?: string[];
    banArguments?: string[];
    maxLength?: number;
    secretPatterns?: string[];
  };
  approvalQueue?: {
    enabled?: boolean;
    timeoutSeconds?: number;
    blockOnApproval?: boolean;
  };
  /** Legacy: validator (merged into commandPolicy when saving) */
  validator?: {
    enabled?: boolean;
    banCommands?: string[];
    banArguments?: string[];
    banFragments?: string[];
    maxLength?: number;
    secretPatterns?: string[];
  };
};

/** Preset definitions: off | loose | standard | strict */
export const SECURITY_PRESETS = {
  off: {
    preset: "off",
    sandbox: { enabled: false },
    commandPolicy: { enabled: false },
    approvalQueue: { enabled: false },
  },
  loose: {
    preset: "loose",
    sandbox: {
      enabled: true,
      allowedPaths: ["/tmp", "./workspace", "/var/lib/agent/data"],
      networkAllow: ["localhost", "127.0.0.1", "*"],
      resourceLimit: { maxCpuPercent: 60, maxMemoryBytes: 1024 ** 3, maxDiskBytes: 1024 ** 3 },
    },
    commandPolicy: {
      enabled: true,
      defaultPolicy: "allow" as const,
      deny: ["sudo", "rm -rf", "dd", "mkfs"],
      ask: [],
      allow: [],
      banArguments: ["--no-preserve-root", "/dev/"],
      maxLength: 4096,
    },
    approvalQueue: { enabled: false, timeoutSeconds: 300, blockOnApproval: false },
  },
  standard: {
    preset: "standard",
    sandbox: {
      enabled: true,
      allowedPaths: ["/tmp", "./workspace", "/var/lib/agent/data"],
      networkAllow: ["localhost", "127.0.0.1", "*.anthropic.com", "*.openai.com"],
      resourceLimit: { maxCpuPercent: 60, maxMemoryBytes: 1024 ** 3, maxDiskBytes: 1024 ** 3 },
    },
    commandPolicy: {
      enabled: true,
      defaultPolicy: "ask" as const,
      deny: ["sudo", "dd", "mkfs", "rm -rf"],
      ask: ["rm", "mv", "cp"],
      allow: ["ls", "pwd", "echo", "cat", "wc", "head", "tail", "hostname", "uname", "whoami", "date", "id", "stat", "file", "mkdir", "touch", "cp", "mv"],
      banArguments: ["--no-preserve-root", "/dev/"],
      maxLength: 4096,
    },
    approvalQueue: { enabled: true, timeoutSeconds: 300, blockOnApproval: true },
  },
  strict: {
    preset: "strict",
    sandbox: {
      enabled: true,
      allowedPaths: ["./workspace", "/tmp"],
      networkAllow: ["localhost", "127.0.0.1"],
      resourceLimit: { maxCpuPercent: 60, maxMemoryBytes: 512 * 1024 * 1024, maxDiskBytes: 1024 ** 3 },
    },
    commandPolicy: {
      enabled: true,
      defaultPolicy: "deny" as const,
      deny: ["sudo", "dd", "mkfs", "rm -rf", "rm -r"],
      ask: ["rm", "mv", "cp", "curl", "wget"],
      allow: ["ls", "pwd", "echo", "cat", "wc", "head", "tail", "hostname", "uname", "whoami", "date", "id", "stat", "file", "mkdir", "touch", "cp", "mv"],
      banArguments: ["--no-preserve-root", "/dev/", "../"],
      maxLength: 4096,
    },
    approvalQueue: { enabled: true, timeoutSeconds: 300, blockOnApproval: true },
  },
} as const;

/** Read security config from current config form or snapshot. */
export function getSecurityFromConfig(state: ConfigState): SecurityConfigForm | null {
  const cfg = state.configForm ?? (state.configSnapshot?.config as Record<string, unknown> | undefined);
  if (!cfg || typeof cfg !== "object") return null;
  const security = (cfg.security ?? {}) as Record<string, unknown>;
  if (!security || typeof security !== "object") return null;

  const sandbox = (security.sandbox ?? {}) as SecurityConfigForm["sandbox"];
  const commandPolicy = (security.commandPolicy ?? {}) as SecurityConfigForm["commandPolicy"];
  const approvalQueue = (security.approvalQueue ?? {}) as SecurityConfigForm["approvalQueue"];
  const validator = (security.validator ?? {}) as SecurityConfigForm["validator"];
  const preset = security.preset as string | undefined;

  // Use deny/ask/allow; merge from legacy validator/approvalQueue when absent grouped lists.
  // commandPolicy 显式字段（含 enabled: false）必须优先于 legacy，否则会误把关闭的命令策略显示为开启。
  let mergedCommandPolicy = commandPolicy;
  const hasGrouped = (commandPolicy?.deny?.length ?? 0) > 0 || (commandPolicy?.ask?.length ?? 0) > 0 || (commandPolicy?.allow?.length ?? 0) > 0;
  if (!hasGrouped && (validator || approvalQueue)) {
    mergedCommandPolicy = {
      ...mergeLegacyToCommandPolicy(validator, approvalQueue),
      ...commandPolicy,
    };
  }

  return {
    preset,
    sandbox: sandbox ?? {},
    commandPolicy: mergedCommandPolicy ?? {},
    approvalQueue: approvalQueue ?? {},
    validator: validator ?? {},
  };
}

function ensureArray<T>(arr: T[] | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

/** Build commandPolicy patch with grouped deny/ask/allow (no rules array). */
function buildCommandPolicyPatch(cp: SecurityConfigForm["commandPolicy"]): Record<string, unknown> {
  return {
    enabled: cp?.enabled,
    defaultPolicy: cp?.defaultPolicy ?? "ask",
    deny: ensureArray(cp?.deny).filter(Boolean),
    ask: ensureArray(cp?.ask).filter(Boolean),
    allow: ensureArray(cp?.allow).filter(Boolean),
    rules: null, // explicitly remove legacy rules (mergePatch deletes keys with null)
    banArguments: cp?.banArguments ?? [],
    maxLength: cp?.maxLength ?? 4096,
    secretPatterns: cp?.secretPatterns ?? [],
  };
}

type ApprovalQueueWithLegacyLists = SecurityConfigForm["approvalQueue"] &
  Partial<Record<"allow" | "ask" | "deny", string[]>>;

function mergeLegacyToCommandPolicy(
  validator?: SecurityConfigForm["validator"],
  approvalQueue?: ApprovalQueueWithLegacyLists,
): SecurityConfigForm["commandPolicy"] {
  const deny: string[] = [];
  const ask: string[] = [];
  const allow: string[] = [];
  if (validator?.banCommands) {
    for (const p of validator.banCommands) {
      if (p) deny.push(p);
    }
  }
  if (validator?.banFragments) {
    for (const p of validator.banFragments) {
      if (p) deny.push(p);
    }
  }
  if (approvalQueue?.deny) {
    for (const p of approvalQueue.deny) {
      if (p) deny.push(p);
    }
  }
  if (approvalQueue?.allow) {
    for (const p of approvalQueue.allow) {
      if (p) allow.push(p);
    }
  }
  if (approvalQueue?.ask) {
    for (const p of approvalQueue.ask) {
      if (p) ask.push(p);
    }
  }
  return {
    enabled: validator?.enabled === true,
    defaultPolicy: "ask",
    deny,
    ask,
    allow,
    banArguments: validator?.banArguments,
    maxLength: validator?.maxLength ?? 4096,
    secretPatterns: validator?.secretPatterns,
  };
}

/** Save security config via config.patch and reload config. */
export async function saveSecurityConfig(state: ConfigState, form: SecurityConfigForm) {
  if (!state.client || !state.connected) return;
  state.configSaving = true;
  (state as { lastError?: string | null }).lastError = null;
  try {
    const sandbox = form.sandbox ?? {};
    const commandPolicy = form.commandPolicy ?? {};
    const approvalQueue = form.approvalQueue ?? {};

    const security: Record<string, unknown> = {
      preset: form.preset,
      sandbox: {
        enabled: sandbox.enabled,
        allowedPaths: sandbox.allowedPaths,
        networkAllow: sandbox.networkAllow,
        root: sandbox.root,
        resourceLimit: sandbox.resourceLimit,
        approvalStore: sandbox.approvalStore,
      },
      commandPolicy: buildCommandPolicyPatch(commandPolicy),
      approvalQueue: {
        enabled: approvalQueue.enabled,
        timeoutSeconds: approvalQueue.timeoutSeconds ?? 300,
        blockOnApproval: approvalQueue.blockOnApproval ?? true,
      },
    };

    await saveConfigPatch(state, { security });
    await loadConfig(state);
  } finally {
    state.configSaving = false;
  }
}
