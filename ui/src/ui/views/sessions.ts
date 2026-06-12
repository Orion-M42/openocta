import { html, nothing } from "lit";
import type { GatewaySessionRow, SessionsListResult } from "../types.ts";
import { formatAgo } from "../format.ts";
import { pathForTab } from "../navigation.ts";
import { formatSessionSource, formatSessionTokens } from "../presenter.ts";
import { t } from "../strings.js";

export type SessionsProps = {
  loading: boolean;
  result: SessionsListResult | null;
  error: string | null;
  activeMinutes: string;
  limit: string;
  includeGlobal: boolean;
  includeUnknown: boolean;
  basePath: string;
  bulkMode: boolean;
  selectedKeys: string[];
  onFiltersChange: (next: {
    activeMinutes: string;
    limit: string;
    includeGlobal: boolean;
    includeUnknown: boolean;
  }) => void;
  onRefresh: () => void;
  onPatch: (
    key: string,
    patch: {
      label?: string | null;
      thinkingLevel?: string | null;
      verboseLevel?: string | null;
      reasoningLevel?: string | null;
    },
  ) => void;
  onDelete: (key: string) => void;
  onBulkModeToggle: () => void;
  onSelectionChange: (key: string, selected: boolean) => void;
  onSelectAll: (keys: string[]) => void;
  onClearSelection: () => void;
  onBulkDelete: (keys: string[]) => void;
};

export function renderSessions(props: SessionsProps) {
  const rows = props.result?.sessions ?? [];
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t("sessionsTitle")}</div>
          <div class="card-sub">${t("sessionsSub")}</div>
        </div>
        <div class="row" style="gap: 8px;">
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? t("commonLoading") : t("commonRefresh")}
          </button>
          <button
            class="btn secondary"
            ?disabled=${props.loading || rows.length === 0}
            @click=${props.onBulkModeToggle}
          >
            ${props.bulkMode ? "完成" : "批量删除"}
          </button>
        </div>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field">
          <span>${t("sessionsActiveWithin")}</span>
          <span class="input"><input
            .value=${props.activeMinutes}
            @input=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: (e.target as HTMLInputElement).value,
                limit: props.limit,
                includeGlobal: props.includeGlobal,
                includeUnknown: props.includeUnknown,
              })}
          /></span>
        </label>
        <label class="field">
          <span>${t("sessionsLimit")}</span>
          <span class="input"><input
            .value=${props.limit}
            @input=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: (e.target as HTMLInputElement).value,
                includeGlobal: props.includeGlobal,
                includeUnknown: props.includeUnknown,
              })}
          /></span>
        </label>
        <label class="field checkbox">
          <span>${t("sessionsIncludeGlobal")}</span>
          <span class="checkbox"><input
            type="checkbox"
            .checked=${props.includeGlobal}
            @change=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: props.limit,
                includeGlobal: (e.target as HTMLInputElement).checked,
                includeUnknown: props.includeUnknown,
              })}
          /></span>
        </label>
        <label class="field checkbox">
          <span>${t("sessionsIncludeUnknown")}</span>
          <span class="checkbox"><input
            type="checkbox"
            .checked=${props.includeUnknown}
            @change=${(e: Event) =>
              props.onFiltersChange({
                activeMinutes: props.activeMinutes,
                limit: props.limit,
                includeGlobal: props.includeGlobal,
                includeUnknown: (e.target as HTMLInputElement).checked,
              })}
          /></span>
        </label>
      </div>

      ${
        props.bulkMode && rows.length > 0
          ? html`
              <div class="row" style="margin-top: 12px; justify-content: space-between;">
                <div class="muted">已选 ${props.selectedKeys.length} 个会话</div>
                <div class="row" style="gap: 8px;">
                  <button
                    class="btn"
                    ?disabled=${props.loading}
                    @click=${() =>
                      props.onSelectAll(
                        rows
                          .map((row) => row.key)
                          .filter((key) => key && key !== "agent.main.main"),
                      )}
                  >
                    全部选择
                  </button>
                  <button
                    class="btn"
                    ?disabled=${props.loading || props.selectedKeys.length === 0}
                    @click=${props.onClearSelection}
                  >
                    全部不选
                  </button>
                  <button
                    class="btn"
                    ?disabled=${props.loading || props.selectedKeys.length === 0}
                    @click=${() => props.onBulkDelete(props.selectedKeys)}
                  >
                    删除已选
                  </button>
                </div>
              </div>
            `
          : nothing
      }

      ${
        props.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
          : nothing
      }

      <div class="muted" style="margin-top: 12px;">
        ${props.result ? `${t("sessionsStore")}: ${props.result.path}` : ""}
      </div>

      <div class="table" style="margin-top: 16px;">
        <div class="table-head">
          ${props.bulkMode ? html`<div></div>` : nothing}
          <div>${t("sessionsKey")}</div>
          <div>${t("sessionsLabel")}</div>
          <div>来源</div>
          <div>${t("sessionsUpdated")}</div>
          <div>${t("sessionsTokens")}</div>
          <div>${t("sessionsActions")}</div>
        </div>
        ${
          rows.length === 0
            ? html`
                <div class="muted">${t("sessionsNoFound")}</div>
              `
            : rows.map((row) =>
                renderRow(
                  row,
                  props.basePath,
                  props.onPatch,
                  props.onDelete,
                  props.loading,
                  props.bulkMode,
                  props.selectedKeys,
                  props.onSelectionChange,
                ),
              )
        }
      </div>
    </section>
  `;
}

function renderRow(
  row: GatewaySessionRow,
  basePath: string,
  onPatch: SessionsProps["onPatch"],
  onDelete: SessionsProps["onDelete"],
  disabled: boolean,
  bulkMode: boolean,
  selectedKeys: string[],
  onSelectionChange: SessionsProps["onSelectionChange"],
) {
  const updated = row.updatedAt ? formatAgo(row.updatedAt) : "n/a";
  const displayName =
    typeof row.displayName === "string" && row.displayName.trim().length > 0
      ? row.displayName.trim()
      : null;
  const label = typeof row.label === "string" ? row.label.trim() : "";
  const showDisplayName = Boolean(displayName && displayName !== row.key && displayName !== label);
  const canLink = row.kind !== "global";
  const chatUrl = canLink
    ? `${pathForTab("message", basePath)}?session=${encodeURIComponent(row.key)}`
    : null;
  const isMainSession = row.key === "agent.main.main";
  const selected = selectedKeys.includes(row.key);

  return html`
    <div class="table-row">
      ${
        bulkMode
          ? html`
              <div>
                <span class="checkbox"><input
                  type="checkbox"
                  .checked=${selected}
                  ?disabled=${disabled || isMainSession}
                  @change=${(e: Event) =>
                    onSelectionChange(row.key, (e.target as HTMLInputElement).checked)}
                /></span>
              </div>
            `
          : nothing
      }
      <div class="mono session-key-cell">
        ${canLink ? html`<a href=${chatUrl} class="session-link">${row.key}</a>` : row.key}
        ${showDisplayName ? html`<span class="muted session-key-display-name">${displayName}</span>` : nothing}
      </div>
      <div>
        <span class="input small"><input
          .value=${row.label ?? ""}
          ?disabled=${disabled}
          placeholder=${t("commonOptional")}
          @change=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value.trim();
            onPatch(row.key, { label: value || null });
          }}
        /></span>
      </div>
      <div>${formatSessionSource(row)}</div>
      <div>${updated}</div>
      <div>${formatSessionTokens(row)}</div>
      <div>
        <button class="btn small" ?disabled=${disabled} @click=${() => onDelete(row.key)}>
          ${t("commonDelete")}
        </button>
      </div>
    </div>
  `;
}
