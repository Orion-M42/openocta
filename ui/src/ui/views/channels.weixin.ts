import { html, nothing } from "lit";
import { icons } from "../icons.js";
import type { WeixinStatus } from "../types.ts";
import type { ChannelsProps } from "./channels.types.ts";
import { formatAgo } from "../format.ts";
import { t } from "../strings.js";

/**
 * iLink 的 qrcode_img_content 常为 liteapp.weixin.qq.com 的 **页面 URL**（返回 HTML），
 * 不能直接作 <img src>，否则会 net::ERR_BLOCKED_BY_ORB。与企业微信一致：用外链服务把 URL 画成 PNG 二维码。
 */
export function resolveWeixinQrDisplay(imgContent: string): {
  imgSrc: string;
  /** 若为 http(s) 扫码页，用于「打开扫码页」与轮询仍用 qrcode 参数，不依赖本字段 */
  openPageUrl: string | null;
} {
  const c = imgContent.trim();
  if (!c) {
    return { imgSrc: "", openPageUrl: null };
  }
  if (/^https?:\/\//i.test(c)) {
    const enc = encodeURIComponent(c);
    return {
      imgSrc: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${enc}`,
      openPageUrl: c,
    };
  }
  if (c.startsWith("data:")) {
    return { imgSrc: c, openPageUrl: null };
  }
  return { imgSrc: `data:image/png;base64,${c}`, openPageUrl: null };
}

function weixinConfiguredFromForm(configForm: Record<string, unknown> | null): boolean {
  const ch = configForm?.channels as Record<string, unknown> | undefined;
  const weixin = ch?.weixin as Record<string, unknown> | undefined;
  const creds = weixin?.credentials as Record<string, unknown> | undefined;
  const token = typeof creds?.botToken === "string" ? creds.botToken.trim() : "";
  const botId = typeof creds?.botId === "string" ? creds.botId.trim() : "";
  return token !== "" && botId !== "";
}

export function renderWeixinQrModal(props: ChannelsProps) {
  if (!props.weixinQrModalOpen) {
    return nothing;
  }
  const showQr =
    props.weixinQrModalImageSrc &&
    !props.weixinQrModalLoading &&
    !props.weixinQrModalSuccess &&
    !props.weixinQrModalError;
  const showWaitSpinner =
    (props.weixinQrModalLoading || props.weixinQrModalPolling) &&
    !props.weixinQrModalSuccess &&
    !props.weixinQrModalError;

  return html`
    <div
      class="channel-panel-overlay channel-panel-overlay--centered"
      style="z-index: 1200;"
      @click=${(e: Event) => {
        if ((e.target as HTMLElement).classList.contains("channel-panel-overlay")) {
          props.onWeixinQrModalClose();
        }
      }}
    >
      <div class="card channel-panel" style="max-width: 400px; width: 92%;" @click=${(e: Event) => e.stopPropagation()}>
        <div class="row" style="justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="card-title" style="margin: 0;">${t("channelWeixinQrModalTitle")}</div>
          <button type="button" class="btn btn--icon" aria-label="关闭" @click=${() => props.onWeixinQrModalClose()}>
            ${icons.x}
          </button>
        </div>

        ${
          props.weixinQrModalReplaceWarn
            ? html`<div class="callout danger" style="margin-bottom: 12px;">
                ${t("channelWeixinQrReplaceWarn")}
              </div>`
            : nothing
        }

        ${
          props.weixinQrModalError
            ? html`<div class="callout danger" style="margin-bottom: 12px;">
                ${props.weixinQrModalError}
              </div>`
            : nothing
        }

        ${
          props.weixinQrModalSuccess
            ? html`<div class="callout" style="margin-bottom: 12px;">
                ${t("channelWeixinQrSuccessClosing")}
              </div>`
            : nothing
        }

        ${
          showQr
            ? html`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                  <img
                    src=${props.weixinQrModalImageSrc!}
                    alt="Weixin QR"
                    referrerpolicy="no-referrer"
                    style="max-width: 220px; height: auto;"
                  />
                  ${
                    props.weixinQrModalScanPageUrl
                      ? html`
                          <a
                            class="btn primary"
                            href=${props.weixinQrModalScanPageUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ${t("channelWeixinOpenScanPage")}
                          </a>
                        `
                      : nothing
                  }
                  <div class="muted" style="font-size: 12px; text-align: center; max-width: 320px;">
                    ${t("channelWeixinQrScanHint")}
                  </div>
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
                    aria-label=${props.weixinQrModalLoading
                      ? t("channelWeixinQrPreparing")
                      : props.weixinQrModalScanned
                        ? t("channelWeixinQrConfirmOnPhone")
                        : t("channelWeixinQrWaiting")}
                  ></div>
                  <div class="muted" style="font-size: 13px; text-align: center;">
                    ${props.weixinQrModalLoading
                      ? t("channelWeixinQrPreparing")
                      : props.weixinQrModalScanned
                        ? t("channelWeixinQrConfirmOnPhone")
                        : t("channelWeixinQrWaiting")}
                  </div>
                </div>
              `
            : nothing
        }

        <div class="row" style="margin-top: 18px; justify-content: flex-end;">
          <button type="button" class="btn" @click=${() => props.onWeixinQrModalClose()}>
            ${t("channelWeixinQrModalCancel")}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderWeixinCard(params: {
  props: ChannelsProps;
  weixin?: WeixinStatus;
  accountCountLabel: unknown;
}) {
  const { props, weixin, accountCountLabel } = params;
  const acc = props.snapshot?.channelAccounts?.weixin?.[0];
  const probe = acc?.probe as { transport?: string } | undefined;
  const configured =
    Boolean(weixin?.configured) || Boolean(acc?.configured) || weixinConfiguredFromForm(props.configForm);
  const qrBusy =
    props.weixinQrModalOpen &&
    (props.weixinQrModalLoading || props.weixinQrModalPolling) &&
    !props.weixinQrModalSuccess;

  return html`
    ${renderWeixinQrModal(props)}
    <div class="card">
      <div class="card-title">${t("channelWeixin")}</div>
      <div class="card-sub">${t("channelWeixinSub")}</div>
      ${accountCountLabel}

      <div class="account-card-list">
        <div class="account-card">
          <div class="account-card-header">
            <div class="account-card-title">${acc?.name || t("channelWeixin")}</div>
            <div class="account-card-id">${acc?.appId ?? acc?.accountId ?? t("commonNA")}</div>
          </div>
          <div class="status-list account-card-status">
            <div>
              <span class="label">${t("channelConfigured")}</span>
              <span>${configured ? t("commonYes") : t("commonNo")}</span>
            </div>
            <div>
              <span class="label">${t("channelWeixinTransport")}</span>
              <span>${probe?.transport ?? "weixin_ilink_poll"}</span>
            </div>
            <div>
              <span class="label">${t("channelWeixinBotId")}</span>
              <span>${acc?.appId ? acc.appId : t("commonNA")}</span>
            </div>
            <div>
              <span class="label">${t("channelRunning")}</span>
              <span>${weixin?.running ? t("commonYes") : t("commonNo")}</span>
            </div>
            <div>
              <span class="label">${t("channelConnected")}</span>
              <span>${(() => {
                const c = weixin?.connected ?? acc?.connected;
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
        weixin?.lastError
          ? html`<div class="callout danger" style="margin-top: 12px;">
            ${weixin.lastError}
          </div>`
          : nothing
      }

      <div class="row" style="margin-top: 14px; flex-wrap: wrap;">
        <button
          class="btn primary"
          ?disabled=${qrBusy}
          @click=${() => props.onWeixinQrStart()}
        >
          ${qrBusy ? t("channelWeixinQrWorking") : t("channelWeixinQrStart")}
        </button>
        <button
          class="btn primary"
          @click=${() => props.onChannelSelect("weixin")}
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
