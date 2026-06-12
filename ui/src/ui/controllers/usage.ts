import type { GatewayBrowserClient } from "../gateway.ts";
import type { SessionsUsageResult, CostUsageSummary } from "../types.ts";

export type UsageState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  usageLoading: boolean;
  usageResult: SessionsUsageResult | null;
  usageCostSummary: CostUsageSummary | null;
  usageError: string | null;
  usageStartDate: string;
  usageEndDate: string;
};

export async function loadUsage(
  state: UsageState,
  overrides?: {
    startDate?: string;
    endDate?: string;
  },
) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.usageLoading) {
    return;
  }
  state.usageLoading = true;
  state.usageError = null;
  try {
    const startDate = overrides?.startDate ?? state.usageStartDate;
    const endDate = overrides?.endDate ?? state.usageEndDate;

    const [sessionsRes, costRes] = await Promise.all([
      state.client.request("sessions.usage", {
        startDate,
        endDate,
        limit: 1000,
        includeContextWeight: false,
      }),
      state.client.request("usage.cost", { startDate, endDate }),
    ]);

    if (sessionsRes) {
      state.usageResult = sessionsRes as SessionsUsageResult;
    }
    if (costRes) {
      state.usageCostSummary = costRes as CostUsageSummary;
    }
  } catch (err) {
    state.usageError = String(err);
  } finally {
    state.usageLoading = false;
  }
}
