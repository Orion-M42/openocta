import { html, nothing } from "lit";
import { icons } from "../icons.js";
import type { WeWorkStatus } from "../types.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { formatAgo } from "../format.ts";
import { t } from "../strings.js";

function qrImageUrlForAuthUrl(authUrl: string): string {
  const enc = encodeURIComponent(authUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${enc}`;
}

function weworkConfiguredFromForm(configForm: Record<string, unknown> | null): boolean {
  const ch = configForm?.channels as Record<string, unknown> | undefined;
  const wework = ch?.wework as Record<string, unknown> | undefined;
  const creds = wework?.credentials as Record<string, unknown> | undefined;
  const botId = typeof creds?.botId === "string" ? creds.botId.trim() : "";
  const botSecret = typeof creds?.botSecret === "string" ? creds.botSecret.trim() : "";
  return botId !== "" && botSecret !== "";
}

export function renderWeWorkQrModal(props: ChannelsProps) {
  if (!props.weworkQrModalOpen) {
    return nothing;
  }
  const showQr =
    props.weworkQrModalAuthUrl &&
    !props.weworkQrModalLoading &&
    !props.weworkQrModalSuccess &&
    !props.weworkQrModalError;
  const showWaitSpinner =
    (props.weworkQrModalLoading || props.weworkQrModalPolling) &&
    !props.weworkQrModalSuccess &&
    !props.weworkQrModalError;

  return html`
    <div
      class="channel-panel-overlay channel-panel-overlay--centered"
      style="z-index: 1200;"
      @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains("channel-panel-overlay")) {
          props.onWeWorkQrModalClose();
        }
      }}
    >
      <div class="card channel-panel" style="max-width: 400px; width: 92%;" @click=${(e: Event) => e.stopPropagation()}>
        <div class="row" style="justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="card-title" style="margin: 0;">${t("channelWeWorkQrModalTitle")}</div>
          <button type="button" class="btn btn--icon" aria-label="关闭" @click=${() => props.onWeWorkQrModalClose()}>
            ${icons.x}
          </button>
        </div>

        ${
          props.weworkQrModalReplaceWarn
            ? html`<div class="callout danger" style="margin-bottom: 12px;">
                ${t("channelWeWorkQrReplaceWarn")}
              </div>`
            : nothing
        }

        ${
          props.weworkQrModalError
            ? html`<div class="callout danger" style="margin-bottom: 12px;">
                ${props.weworkQrModalError}
              </div>`
            : nothing
        }

        ${
          props.weworkQrModalSuccess
            ? html`<div class="callout" style="margin-bottom: 12px;">
                ${t("channelWeWorkQrSuccessClosing")}
              </div>`
            : nothing
        }

        ${
          showQr
            ? html`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                  <img
                    src=${qrImageUrlForAuthUrl(props.weworkQrModalAuthUrl!)}
                    alt="WeCom QR"
                    referrerpolicy="no-referrer"
                  />
                  ${
                    props.weworkQrModalGenPageUrl
                      ? html`
                          <a
                            class="btn primary"
                            href=${props.weworkQrModalGenPageUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ${t("channelWeWorkOpenGenPage")}
                          </a>
                        `
                      : nothing
                  }
                </div>
              `
            : nothing
        }

        ${
          showWaitSpinner
            ? html`
                <div
                  style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: ${showQr
                    ? "16px"
                    : "8px"};"
                >
                  <div
                    class="config-loading__spinner"
                    role="status"
                    aria-label=${props.weworkQrModalLoading
                      ? t("channelWeWorkQrPreparing")
                      : t("channelWeWorkQrWaiting")}
                  ></div>
                  <div class="muted" style="font-size: 13px; text-align: center;">
                    ${props.weworkQrModalLoading
                      ? t("channelWeWorkQrPreparing")
                      : t("channelWeWorkQrWaiting")}
                  </div>
                </div>
              `
            : nothing
        }

        <div class="row" style="margin-top: 18px; justify-content: flex-end;">
          <button type="button" class="btn" @click=${() => props.onWeWorkQrModalClose()}>
            ${t("channelWeWorkQrModalCancel")}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderWeWorkCard(params: {
  props: ChannelsProps;
  wework?: WeWorkStatus;
  accountCountLabel: unknown;
}) {
  const { props, wework, accountCountLabel } = params;
  const acc = props.snapshot?.channelAccounts?.wework?.[0];
  const probe = acc?.probe as { transport?: string } | undefined;
  const configured =
    Boolean(wework?.configured) || Boolean(acc?.configured) || weworkConfiguredFromForm(props.configForm);
  const qrBusy =
    props.weworkQrModalOpen &&
    (props.weworkQrModalLoading || props.weworkQrModalPolling) &&
    !props.weworkQrModalSuccess;

  return html`
    ${renderWeWorkQrModal(props)}
    <div class="card">
      <div class="card-title">${t("channelWeWork")}</div>
      <div class="card-sub">${t("channelWeWorkSub")}</div>
      ${accountCountLabel}

      <div class="account-card-list">
        <div class="account-card">
          <div class="account-card-header">
            <div class="account-card-title">${acc?.name || t("channelWeWork")}</div>
            <div class="account-card-id">${acc?.appId ?? acc?.accountId ?? t("commonNA")}</div>
          </div>
          <div class="status-list account-card-status">
            <div>
              <span class="label">${t("channelConfigured")}</span>
              <span>${configured ? t("commonYes") : t("commonNo")}</span>
            </div>
            <div>
              <span class="label">${t("channelWeWorkTransport")}</span>
              <span>${probe?.transport ?? "wecom_aibot_ws"}</span>
            </div>
            <div>
              <span class="label">${t("channelWeWorkBotId")}</span>
              <span>${acc?.appId ? acc.appId : t("commonNA")}</span>
            </div>
            <div>
              <span class="label">${t("channelRunning")}</span>
              <span>${wework?.running ? t("commonYes") : t("commonNo")}</span>
            </div>
            <div>
              <span class="label">${t("channelConnected")}</span>
              <span>${(() => {
                const c = wework?.connected ?? acc?.connected;
                if (c === true) {
                  return t("commonYes");
                }
                if (c === false) {
                  return t("commonNo");
                }
                return t("commonNA");
              })()}</span>
            </div>
            <div>
              <span class="label">${t("channelLastInbound")}</span>
              <span>${acc?.lastInboundAt ? formatAgo(acc.lastInboundAt) : t("commonNA")}</span>
            </div>
          </div>
        </div>
      </div>

      ${
        wework?.lastError
          ? html`<div class="callout danger" style="margin-top: 12px;">
            ${wework.lastError}
          </div>`
          : nothing
      }

      <div class="row" style="margin-top: 14px; flex-wrap: wrap;">
        <button
          class="btn primary"
          ?disabled=${qrBusy}
          @click=${() => props.onWeWorkQrStart()}
        >
          ${qrBusy ? t("channelWeWorkQrWorking") : t("channelWeWorkQrStart")}
        </button>
        <button
          class="btn primary"
          @click=${() => props.onChannelSelect("wework")}
        >
          ${t("channelsConfigure")}
        </button>
        <button class="btn" @click=${() => props.onRefresh(true)}>
          ${t("commonRefresh")}
        </button>
      </div>
    </div>
  `;
}
