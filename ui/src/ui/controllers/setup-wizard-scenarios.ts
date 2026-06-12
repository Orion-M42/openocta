import { installFromSite } from "./remote-market.ts";
import {
  getScenarioTemplate,
  scenarioTaskLabel,
  type ScenarioInitTask,
  type ScenarioTemplate,
} from "../scenario-templates.ts";
import type {
  SetupWizardScenarioRunRecord,
  SetupWizardScenarioTaskRecord,
  SetupWizardTaskStatus,
} from "../setup-wizard.ts";

export type ScenarioEnvInputRequest = {
  taskIndex: number;
  name: string;
  description: string;
  required?: boolean;
  example?: string;
};

export type ExecuteScenarioOptions = {
  gatewayHost?: string;
  token?: string;
  envVars?: Record<string, string>;
  shouldAbort?: () => boolean;
  onEnvInputRequired?: (request: ScenarioEnvInputRequest) => Promise<string | null>;
  onEnvVarCollected?: (name: string, value: string) => void;
  onTaskUpdate?: (
    scenarioId: string,
    taskIndex: number,
    status: SetupWizardTaskStatus,
    detail?: string,
  ) => void;
};

function taskKindForRecord(task: ScenarioInitTask): SetupWizardScenarioTaskRecord["kind"] {
  return task.kind;
}

async function runInstallTask(
  task: ScenarioInitTask,
  opts: ExecuteScenarioOptions,
): Promise<{ status: SetupWizardTaskStatus; detail?: string }> {
  if (task.kind === "env") {
    const value = opts.envVars?.[task.ref.name]?.trim();
    if (value) {
      return { status: "done", detail: `已配置 ${task.ref.name}` };
    }
    return {
      status: "failed",
      detail: `未配置 ${task.ref.name}${task.ref.required ? "（必填）" : ""}`,
    };
  }
  if (task.kind === "tool") {
    const platform = task.ref.platform ?? "";
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isLinux = /linux/i.test(ua);
    if (platform === "linux-deb" && !isLinux) {
      return {
        status: "skipped",
        detail: `${task.ref.description ?? task.ref.name}（当前平台可跳过）`,
      };
    }
    return {
      status: "done",
      detail: `已记录离线包：${task.ref.relativePath}`,
    };
  }
  const kind =
    task.kind === "skill" ? "skill" : task.kind === "mcp" ? "mcp" : ("employee" as const);
  const id = task.ref.id;
  try {
    await installFromSite(
      { kind, id, type: task.ref.category, category: task.ref.category },
      { gatewayHost: opts.gatewayHost, token: opts.token },
    );
    return { status: "done", detail: "安装成功" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "failed", detail: message };
  }
}

function markRemainingSkipped(
  template: ScenarioTemplate,
  tasks: SetupWizardScenarioTaskRecord[],
  fromIndex: number,
  opts: ExecuteScenarioOptions,
  detail: string,
) {
  for (let j = fromIndex; j < template.tasks.length; j++) {
    if (tasks[j]!.status === "pending" || tasks[j]!.status === "waiting") {
      tasks[j]!.status = "skipped";
      tasks[j]!.detail = detail;
      opts.onTaskUpdate?.(template.id, j, "skipped", detail);
    }
  }
}

export async function executeScenarioTemplate(
  template: ScenarioTemplate,
  opts: ExecuteScenarioOptions,
): Promise<SetupWizardScenarioRunRecord> {
  const tasks: SetupWizardScenarioTaskRecord[] = template.tasks.map((task) => ({
    label: scenarioTaskLabel(task),
    kind: taskKindForRecord(task),
    status: "pending" as const,
  }));

  for (let i = 0; i < template.tasks.length; i++) {
    if (opts.shouldAbort?.()) {
      markRemainingSkipped(template, tasks, i, opts, "已停止");
      break;
    }

    const task = template.tasks[i]!;

    if (task.kind === "env") {
      let value = opts.envVars?.[task.ref.name]?.trim() ?? "";
      if (!value && opts.onEnvInputRequired) {
        tasks[i]!.status = "waiting";
        tasks[i]!.detail = "等待填写环境变量…";
        opts.onTaskUpdate?.(template.id, i, "waiting", "等待填写环境变量…");
        const input = await opts.onEnvInputRequired({
          taskIndex: i,
          name: task.ref.name,
          description: task.ref.description,
          required: task.ref.required,
          example: task.ref.example,
        });
        if (opts.shouldAbort?.() || input === null) {
          tasks[i]!.status = "skipped";
          tasks[i]!.detail = "已取消";
          opts.onTaskUpdate?.(template.id, i, "skipped", "已取消");
          markRemainingSkipped(template, tasks, i + 1, opts, "已停止");
          break;
        }
        value = input.trim();
        if (opts.envVars) {
          opts.envVars[task.ref.name] = value;
        }
        opts.onEnvVarCollected?.(task.ref.name, value);
      }
      if (!value) {
        tasks[i]!.status = "done";
        tasks[i]!.detail = `已跳过 ${task.ref.name}（留空，稍后在环境变量配置中填写）`;
        opts.onTaskUpdate?.(template.id, i, "done", tasks[i]!.detail);
        continue;
      }
      tasks[i]!.status = "done";
      tasks[i]!.detail = `已配置 ${task.ref.name}`;
      opts.onTaskUpdate?.(template.id, i, "done", tasks[i]!.detail);
      continue;
    }

    opts.onTaskUpdate?.(template.id, i, "running");
    tasks[i]!.status = "running";
    const result = await runInstallTask(task, opts);
    tasks[i]!.status = result.status;
    tasks[i]!.detail = result.detail;
    opts.onTaskUpdate?.(template.id, i, result.status, result.detail);
  }

  return {
    id: template.id,
    name: template.name,
    tasks,
  };
}

export async function executeScenarioById(
  scenarioId: string,
  opts: ExecuteScenarioOptions,
): Promise<SetupWizardScenarioRunRecord | null> {
  const template = getScenarioTemplate(scenarioId);
  if (!template) {
    return null;
  }
  return executeScenarioTemplate(template, opts);
}
