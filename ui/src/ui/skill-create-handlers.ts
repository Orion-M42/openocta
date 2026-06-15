import type { AppViewState } from "./app-view-state.ts";
import type { OpenClawApp } from "./app.ts";
import {
  analyzeSkillZip,
  composeSkill,
  defaultUploadMeta,
  publishSkillMarkdown,
  publishSkillZip,
  skillNameFromDraft,
  type SkillAnalyzeResult,
  type SkillComposeFile,
  type SkillComposeMessage,
  type SkillUploadMeta,
} from "./controllers/skill-create.ts";
import { loadSkills } from "./controllers/skills.ts";
import type { SkillAddPanel, SkillCreateModalsProps } from "./views/skill-create-modals.ts";

export function resetSkillCreateState(state: AppViewState) {
  state.skillsAddPanel = "closed";
  state.skillsUploadStep = 0;
  state.skillsUploadFile = null;
  state.skillsUploadAnalyze = null;
  state.skillsUploadMeta = { name: "", description: "", category: "", tags: "", status: "open" };
  state.skillsUploadError = null;
  state.skillsUploadTemplate = null;
  state.skillsUploadBusy = false;
  state.skillsCreativeScenario = "free";
  state.skillsCreativeMessages = [];
  state.skillsCreativeDraft = "";
  state.skillsCreativeFiles = [];
  state.skillsCreativeInput = "";
  state.skillsCreativeReady = false;
  state.skillsCreativeSelectedFile = null;
}

export function openSkillCreateChoice(state: AppViewState) {
  resetSkillCreateState(state);
  state.skillsAddPanel = "choice";
}

function gatewayState(state: AppViewState) {
  return {
    gatewayUrl: state.settings?.gatewayUrl?.trim(),
    token: state.settings?.token?.trim(),
    client: state.client,
    connected: state.connected,
  };
}

function bumpUi(state: AppViewState) {
  (state as unknown as OpenClawApp).requestUpdate();
}

export function buildSkillCreateModalProps(
  state: AppViewState,
  onPublished: () => Promise<void>,
): SkillCreateModalsProps {
  return {
    panel: state.skillsAddPanel as SkillAddPanel,
    busy: state.skillsUploadBusy,
    error: state.skillsUploadError,
    uploadStep: state.skillsUploadStep,
    uploadFile: state.skillsUploadFile,
    uploadAnalyze: state.skillsUploadAnalyze,
    uploadMeta: state.skillsUploadMeta,
    uploadTemplate: state.skillsUploadTemplate,
    creativeScenario: state.skillsCreativeScenario,
    creativeMessages: state.skillsCreativeMessages,
    creativeDraft: state.skillsCreativeDraft,
    creativeFiles: state.skillsCreativeFiles,
    creativeInput: state.skillsCreativeInput,
    creativeReady: state.skillsCreativeReady,
    creativeSelectedFile: state.skillsCreativeSelectedFile,
    onClose: () => resetSkillCreateState(state),
    onChooseUpload: () => {
      state.skillsAddPanel = "upload";
      state.skillsUploadStep = 0;
      state.skillsUploadError = null;
    },
    onChooseCreative: () => {
      state.skillsAddPanel = "creative";
      state.skillsUploadError = null;
    },
    onUploadBack: () => {
      if (state.skillsUploadStep > 0) {
        state.skillsUploadStep -= 1;
        state.skillsUploadError = null;
        return;
      }
      state.skillsAddPanel = "choice";
    },
    onCreativeBack: () => {
      state.skillsAddPanel = "choice";
      state.skillsUploadError = null;
    },
    onUploadFileChange: (file) => {
      state.skillsUploadFile = file;
      state.skillsUploadError = null;
      if (!file) {
        state.skillsUploadStep = 0;
      }
    },
    onUploadNext: async () => {
      if (state.skillsUploadStep === 0) {
        const file = state.skillsUploadFile;
        if (!file) return;
        state.skillsUploadStep = 1;
        state.skillsUploadBusy = true;
        state.skillsUploadError = null;
        const res = await analyzeSkillZip(gatewayState(state), file);
        state.skillsUploadBusy = false;
        if (!res.ok) {
          state.skillsUploadError = res.error;
          state.skillsUploadTemplate = res.template ?? null;
          state.skillsUploadStep = 0;
          return;
        }
        state.skillsUploadAnalyze = res.result;
        state.skillsUploadMeta = defaultUploadMeta(res.result);
        return;
      }
      if (state.skillsUploadStep === 1) {
        state.skillsUploadStep = 2;
        state.skillsUploadError = null;
      }
    },
    onUploadMetaChange: (patch) => {
      state.skillsUploadMeta = { ...state.skillsUploadMeta, ...patch };
    },
    onUploadPublish: async () => {
      const file = state.skillsUploadFile;
      const meta = state.skillsUploadMeta;
      if (!file || !meta.name.trim()) return;
      state.skillsUploadBusy = true;
      state.skillsUploadError = null;
      const res = await publishSkillZip(gatewayState(state), file, meta);
      state.skillsUploadBusy = false;
      if (!res.ok) {
        state.skillsUploadError = res.error ?? "发布失败";
        return;
      }
      resetSkillCreateState(state);
      await loadSkills(state);
      await onPublished();
    },
    onCreativeScenarioChange: (scenario) => {
      state.skillsCreativeScenario = scenario;
    },
    onCreativeInputChange: (value) => {
      state.skillsCreativeInput = value;
    },
    onCreativeFileSelect: (path) => {
      state.skillsCreativeSelectedFile = path;
    },
    onCreativeSend: async (promptText?: string) => {
      const text = (promptText ?? state.skillsCreativeInput).trim();
      if (!text) return;
      const messages: SkillComposeMessage[] = [
        ...state.skillsCreativeMessages,
        { role: "user", content: text },
      ];
      state.skillsCreativeMessages = messages;
      state.skillsCreativeInput = "";
      state.skillsUploadBusy = true;
      state.skillsUploadError = null;
      bumpUi(state);
      const res = await composeSkill(gatewayState(state), {
        messages,
        draft: state.skillsCreativeDraft,
        scenario: state.skillsCreativeScenario,
      });
      state.skillsUploadBusy = false;
      if (!res.ok) {
        state.skillsUploadError = res.error;
        bumpUi(state);
        return;
      }
      state.skillsCreativeMessages = [
        ...messages,
        { role: "assistant", content: res.result.reply },
      ];
      if (res.result.draft) {
        state.skillsCreativeDraft = res.result.draft;
        state.skillsCreativeFiles = res.result.files;
        state.skillsCreativeSelectedFile = res.result.files[0]?.path ?? "SKILL.md";
      }
      state.skillsCreativeReady = res.result.ready;
      if (!state.skillsUploadMeta.name && res.result.draft) {
        state.skillsUploadMeta = {
          ...state.skillsUploadMeta,
          name: skillNameFromDraft(res.result.draft) || state.skillsUploadMeta.name,
        };
      }
      bumpUi(state);
    },
    onCreativeTestInstall: async () => {
      const draft = state.skillsCreativeDraft;
      if (!draft) return;
      const meta: SkillUploadMeta = {
        ...defaultUploadMeta(),
        name: skillNameFromDraft(draft) || `preview-${Date.now()}`,
        description: state.skillsUploadMeta.description,
        category: state.skillsUploadMeta.category,
        tags: state.skillsUploadMeta.tags,
      };
      state.skillsUploadBusy = true;
      state.skillsUploadError = null;
      const res = await publishSkillMarkdown(gatewayState(state), draft, meta);
      state.skillsUploadBusy = false;
      if (!res.ok) {
        state.skillsUploadError = res.error ?? "测试安装失败";
        return;
      }
      await loadSkills(state);
      await onPublished();
    },
    onCreativePublish: async () => {
      const draft = state.skillsCreativeDraft;
      if (!draft) return;
      const name = skillNameFromDraft(draft) || state.skillsUploadMeta.name;
      if (!name) {
        state.skillsUploadError = "草稿缺少 name 字段，请继续与 AI 对话完善";
        return;
      }
      const meta: SkillUploadMeta = {
        name,
        description: state.skillsUploadMeta.description,
        category: state.skillsUploadMeta.category,
        tags: state.skillsUploadMeta.tags,
        status: state.skillsUploadMeta.status || "open",
      };
      state.skillsUploadBusy = true;
      state.skillsUploadError = null;
      const res = await publishSkillMarkdown(gatewayState(state), draft, meta);
      state.skillsUploadBusy = false;
      if (!res.ok) {
        state.skillsUploadError = res.error ?? "发布失败";
        return;
      }
      resetSkillCreateState(state);
      await loadSkills(state);
      await onPublished();
    },
  };
}
