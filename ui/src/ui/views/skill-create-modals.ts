import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { icons } from "../icons.js";
import type {
  SkillAnalyzeResult,
  SkillComposeMessage,
  SkillComposeFile,
  SkillUploadMeta,
} from "../controllers/skill-create.ts";
import { toSanitizedMarkdownHtml } from "../markdown.ts";
import { t } from "../strings.js";

export type SkillAddPanel = "closed" | "choice" | "upload" | "creative";

export type SkillCreateModalsProps = {
  panel: SkillAddPanel;
  busy: boolean;
  error: string | null;
  uploadStep: number;
  uploadFile: File | null;
  uploadAnalyze: SkillAnalyzeResult | null;
  uploadMeta: SkillUploadMeta;
  uploadTemplate: string | null;
  creativeScenario: "free" | "upgrade";
  creativeMessages: SkillComposeMessage[];
  creativeDraft: string;
  creativeFiles: SkillComposeFile[];
  creativeInput: string;
  creativeReady: boolean;
  creativeSelectedFile: string | null;
  onClose: () => void;
  onChooseUpload: () => void;
  onChooseCreative: () => void;
  onUploadBack: () => void;
  onCreativeBack: () => void;
  onUploadFileChange: (file: File | null) => void;
  onUploadNext: () => void;
  onUploadPublish: () => void;
  onUploadMetaChange: (patch: Partial<SkillUploadMeta>) => void;
  onCreativeScenarioChange: (scenario: "free" | "upgrade") => void;
  onCreativeInputChange: (value: string) => void;
  onCreativeSend: (prompt?: string) => void;
  onCreativeTestInstall: () => void;
  onCreativePublish: () => void;
  onCreativeFileSelect: (path: string) => void;
};

const UPLOAD_STEPS = ["上传文件", "AI 分析", "填写信息"];

const CREATIVE_PROMPTS = [
  "我想创建一个 AI 搜索 Skill",
  "基于 DeepL 翻译做一个翻译助手",
  "帮我把一个重复性工作流程做成 Skill",
  "我想做一个数据处理 / 报告生成类 Skill",
];

function renderStepper(activeStep: number) {
  return html`
    <nav class="skill-create__stepper" aria-label="创建步骤">
      <ol class="skill-create__steps">
        ${UPLOAD_STEPS.map(
          (label, i) => html`
            <li class="skill-create__step ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}">
              <span class="skill-create__step-badge">${i + 1}</span>
              <span class="skill-create__step-label">${label}</span>
            </li>
          `,
        )}
      </ol>
    </nav>
  `;
}

function renderUploadRequirements() {
  return html`
    <div class="skill-create__requirements">
      <div class="skill-create__requirements-title">ZIP 包要求</div>
      <ul class="skill-create__requirements-list">
        <li>必须包含 <code>SKILL.md</code>（大小写敏感）</li>
        <li><code>SKILL.md</code> 需包含 <code>name</code>、<code>description</code>、<code>allowed-tools</code> 字段</li>
        <li><code>name</code> 格式：小写字母、数字、连字符</li>
        <li>可选：<code>references/asset-metadata.json</code> 或 <code>references/asset-metadata.yaml</code></li>
      </ul>
      <pre class="skill-create__tree">my-skill.zip/
├── SKILL.md          # 必须
├── prompts/          # 可选
├── examples/         # 可选
└── references/       # 可选
    └── asset-metadata.json  # 可选</pre>
    </div>
  `;
}

function renderUploadStep(props: SkillCreateModalsProps) {
  const file = props.uploadFile;
  return html`
    ${renderStepper(0)}
    <div
      class="skill-create__dropzone ${file ? "has-file" : ""}"
      @dragover=${(e: DragEvent) => {
        e.preventDefault();
      }}
      @drop=${(e: DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0];
        if (f && f.name.toLowerCase().endsWith(".zip")) {
          props.onUploadFileChange(f);
        }
      }}
      @click=${() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip";
        input.onchange = () => {
          const f = input.files?.[0] ?? null;
          props.onUploadFileChange(f);
        };
        input.click();
      }}
    >
      <div class="skill-create__dropzone-icon">${icons.fileText}</div>
      <div class="skill-create__dropzone-title">
        ${file ? file.name : "拖拽 ZIP 文件到此处"}
      </div>
      <div class="skill-create__dropzone-sub">
        ${file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "或点击选择文件（最大 50MB）"}
      </div>
    </div>
    ${renderUploadRequirements()}
    ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}
    <div class="skill-create__footer">
      <button class="btn" ?disabled=${props.busy} @click=${props.onUploadBack}>${t("commonCancel")}</button>
      <button class="btn primary" ?disabled=${props.busy || !file} @click=${props.onUploadNext}>
        ${props.busy ? t("commonLoading") : "下一步：AI 分析"}
      </button>
    </div>
  `;
}

function renderAnalyzeStep(props: SkillCreateModalsProps) {
  const a = props.uploadAnalyze;
  return html`
    ${renderStepper(1)}
    ${props.busy
      ? html`<div class="skill-create__analyze-loading"><div class="muted">AI 正在分析 Skill 包…</div></div>`
      : a
        ? html`
            <div class="skill-create__analyze-result">
              <div class="skill-create__analyze-summary">${a.summary || a.description || "分析完成"}</div>
              <div class="skill-create__meta-grid">
                <div><span class="muted">名称</span><div>${a.name || "—"}</div></div>
                <div><span class="muted">分类</span><div>${a.category || "—"}</div></div>
                <div><span class="muted">标签</span><div>${(a.tags ?? []).join("、") || "—"}</div></div>
                <div><span class="muted">工具</span><div>${(a.allowedTools ?? []).join("、") || "—"}</div></div>
              </div>
              ${(a.files ?? []).length > 0
                ? html`
                    <div class="skill-create__file-list">
                      <div class="muted" style="margin-bottom: 6px;">包内文件 (${a.files.length})</div>
                      ${a.files.slice(0, 12).map((f) => html`<span class="chip">${f}</span>`)}
                    </div>
                  `
                : nothing}
            </div>
          `
        : html`<div class="muted">等待分析…</div>`}
    ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}
    <div class="skill-create__footer">
      <button class="btn" ?disabled=${props.busy} @click=${props.onUploadBack}>上一步</button>
      <button class="btn primary" ?disabled=${props.busy || !a} @click=${props.onUploadNext}>下一步：填写信息</button>
    </div>
  `;
}

function renderInfoStep(props: SkillCreateModalsProps) {
  const meta = props.uploadMeta;
  return html`
    ${renderStepper(2)}
    <div class="skill-create__form-grid">
      <label class="field">
        <span>Skill 标识 (name)</span>
        <span class="input"><input
          .value=${meta.name}
          @input=${(e: Event) => props.onUploadMetaChange({ name: (e.target as HTMLInputElement).value })}
          placeholder="my-skill"
        /></span>
      </label>
      <label class="field">
        <span>描述</span>
        <span class="input"><input
          .value=${meta.description}
          @input=${(e: Event) => props.onUploadMetaChange({ description: (e.target as HTMLInputElement).value })}
        /></span>
      </label>
      <label class="field">
        <span>分类</span>
        <span class="input"><input
          .value=${meta.category}
          @input=${(e: Event) => props.onUploadMetaChange({ category: (e.target as HTMLInputElement).value })}
        /></span>
      </label>
      <label class="field">
        <span>标签（逗号分隔）</span>
        <span class="input"><input
          .value=${meta.tags}
          @input=${(e: Event) => props.onUploadMetaChange({ tags: (e.target as HTMLInputElement).value })}
        /></span>
      </label>
      <label class="field">
        <span>状态</span>
        <span class="input"><select
          .value=${meta.status || "open"}
          @change=${(e: Event) => props.onUploadMetaChange({ status: (e.target as HTMLSelectElement).value })}
        >
          <option value="open">开放</option>
          <option value="paid">付费</option>
          <option value="private">私有</option>
        </select></span>
      </label>
    </div>
    ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}
    <div class="skill-create__footer">
      <button class="btn" ?disabled=${props.busy} @click=${props.onUploadBack}>上一步</button>
      <button
        class="btn primary"
        ?disabled=${props.busy || !meta.name.trim()}
        @click=${props.onUploadPublish}
      >
        ${props.busy ? t("commonLoading") : "发布"}
      </button>
    </div>
  `;
}

function renderChoicePanel(props: SkillCreateModalsProps) {
  return html`
    <div class="skill-create__choice-grid">
      <button type="button" class="skill-create__choice-card" @click=${props.onChooseUpload}>
        <div class="skill-create__choice-icon">${icons.paperclip}</div>
        <div class="skill-create__choice-title">上传 ZIP</div>
        <div class="skill-create__choice-desc">上传已有 Skill 包，AI 分析后填写信息并发布</div>
      </button>
      <button type="button" class="skill-create__choice-card" @click=${props.onChooseCreative}>
        <div class="skill-create__choice-icon">${icons.brain}</div>
        <div class="skill-create__choice-title">创意中心</div>
        <div class="skill-create__choice-desc">与 AI 对话创作 Skill，实时预览并发布</div>
      </button>
    </div>
    <div class="skill-create__footer">
      <button class="btn" @click=${props.onClose}>${t("commonCancel")}</button>
    </div>
  `;
}

function renderCreativePanel(props: SkillCreateModalsProps) {
  const files = props.creativeFiles.length > 0
    ? props.creativeFiles
    : props.creativeDraft
      ? [{ path: "SKILL.md", content: props.creativeDraft }]
      : [];
  const selected = files.find((f) => f.path === props.creativeSelectedFile) ?? files[0];

  return html`
    <div class="skill-create__creative">
      <div class="skill-create__creative-left">
        <div class="skill-create__creative-head">
          <div class="card-title" style="margin:0;">Skill 创作助手</div>
          <div class="card-sub">直接描述你的想法，AI 会追问、补全并生成 SKILL.md 草稿。</div>
        </div>
        ${props.error ? html`<div class="callout danger" style="margin-top:10px;">${props.error}</div>` : nothing}
        <div class="skill-create__chat">
          ${props.creativeMessages.length === 0
            ? html`
                <div class="skill-create__chat-bubble assistant">
                  你好，我是 Skill 创作助手。直接告诉我你想创建什么样的 Skill，我会帮你把需求整理成可发布的 SKILL.md 草稿。
                </div>
                <div class="skill-create__prompts">
                  ${CREATIVE_PROMPTS.map(
                    (p) => html`
                      <button type="button" class="skill-create__prompt-chip" @click=${() => props.onCreativeSend(p)}>
                        ${p}
                      </button>
                    `,
                  )}
                </div>
              `
            : props.creativeMessages.map(
                (m) => html`
                  <div class="skill-create__chat-bubble ${m.role}">${m.content}</div>
                `,
              )}
          ${props.busy ? html`<div class="muted">AI 思考中…</div>` : nothing}
        </div>
        <div class="skill-create__chat-input-wrap">
          <textarea
            class="skill-create__chat-input"
            placeholder="输入你的创作想法，或告诉我如何修改当前草稿…"
            .value=${props.creativeInput}
            @input=${(e: Event) => props.onCreativeInputChange((e.target as HTMLTextAreaElement).value)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                props.onCreativeSend();
              }
            }}
          ></textarea>
          <button class="btn primary skill-create__send" ?disabled=${props.busy} @click=${() => props.onCreativeSend()}>
            发送
          </button>
        </div>
      </div>
      <div class="skill-create__creative-right">
        <div class="skill-create__preview-head">
          <div>
            <span class="card-title" style="margin:0;">Skill 预览</span>
            <span class="chip ${props.creativeReady ? "chip-ok" : ""}" style="margin-left:8px;">
              ${props.creativeReady ? "可发布" : "未生成"}
            </span>
          </div>
          <div class="row" style="gap:8px;">
            <button class="btn" ?disabled=${props.busy || !props.creativeDraft} @click=${props.onCreativeTestInstall}>
              测试安装
            </button>
            <button class="btn primary" ?disabled=${props.busy || !props.creativeDraft} @click=${props.onCreativePublish}>
              发布
            </button>
          </div>
        </div>
        ${files.length === 0
          ? html`
              <div class="skill-create__preview-empty">
                <div class="skill-create__preview-empty-icon">${icons.messageSquare}</div>
                <p>AI 生成 Skill 后将在此实时展示。直接在左侧对话框描述你的想法，AI 会生成完整的 skill 结构并在这里预览。</p>
              </div>
            `
          : html`
              <div class="skill-create__preview-files">
                ${files.map(
                  (f) => html`
                    <button
                      type="button"
                      class="chip ${selected?.path === f.path ? "chip-ok" : ""}"
                      @click=${() => props.onCreativeFileSelect(f.path)}
                    >
                      ${f.path}
                    </button>
                  `,
                )}
              </div>
              <pre class="skill-create__preview-content">${selected?.content ?? ""}</pre>
            `}
      </div>
    </div>
    <div class="skill-create__footer">
      <button class="btn" ?disabled=${props.busy} @click=${props.onCreativeBack}>返回</button>
    </div>
  `;
}

export function renderSkillCreateModals(props: SkillCreateModalsProps) {
  if (props.panel === "closed") {
    return nothing;
  }

  const isUpload = props.panel === "upload";
  const isCreative = props.panel === "creative";
  const title = isUpload ? "创建 Skill" : isCreative ? "Skill 创作助手" : t("skillsAddSkill");
  const subtitle = isUpload
    ? "上传 ZIP 包，填写信息，发布到市场"
    : isCreative
      ? ""
      : "选择创建方式";

  return html`
    <div class="modal-overlay skill-create-overlay" @click=${props.onClose}>
      <div
        class="modal card skill-create-modal ${isCreative ? "skill-create-modal--wide" : ""}"
        @click=${(e: Event) => e.stopPropagation()}
      >
        <div class="skill-create__header">
          <div>
            <div class="card-title">${title}</div>
            ${subtitle ? html`<div class="card-sub">${subtitle}</div>` : nothing}
          </div>
          <button class="btn btn--icon" type="button" aria-label="关闭" @click=${props.onClose}>${icons.x}</button>
        </div>
        <div class="skill-create__body">
          ${props.panel === "choice"
            ? renderChoicePanel(props)
            : isUpload
              ? props.uploadStep === 0
                ? renderUploadStep(props)
                : props.uploadStep === 1
                  ? renderAnalyzeStep(props)
                  : renderInfoStep(props)
              : renderCreativePanel(props)}
        </div>
      </div>
    </div>
  `;
}

export function stripFrontmatter(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("---")) return text;
  const afterFirst = trimmed.slice(3);
  const newlineIdx = afterFirst.search(/\r?\n/);
  if (newlineIdx === -1) return text;
  const rest = afterFirst.slice(newlineIdx + (afterFirst[newlineIdx] === "\r" ? 2 : 1));
  const closeMatch = rest.match(/\r?\n\s*---\s*\r?\n?/);
  if (!closeMatch) return text;
  return rest.slice(closeMatch.index! + closeMatch[0].length).trimStart();
}

export function renderSkillMarkdownPreview(content: string) {
  return html`<div class="sidebar-markdown">${unsafeHTML(toSanitizedMarkdownHtml(stripFrontmatter(content)))}</div>`;
}
