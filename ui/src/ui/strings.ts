/**
 * Minimal i18n: locale is read from document.documentElement.lang (e.g. zh, en).
 * Set <html lang="zh"> in index.html for Chinese.
 */

export type Locale = "zh" | "en";

export function getLocale(): Locale {
  if (typeof document === "undefined") {
    return "en";
  }
  const lang = document.documentElement?.lang?.toLowerCase() ?? "";
  if (lang.startsWith("zh")) {
    return "zh";
  }
  return "en";
}

type Strings = {
  // Tab groups (sidebar)
  tabGroupChat: string;
  tabGroupControl: string;
  tabGroupAgent: string;
  tabGroupSettings: string;
  // Tab subtitles
  subtitleAgents: string;
  subtitleOverview: string;
  subtitleChannels: string;
  subtitleInstances: string;
  subtitleSessions: string;
  subtitleUsage: string;
  subtitleCron: string;
  subtitleSkills: string;
  subtitleMcp: string;
  subtitleNodes: string;
  subtitleChat: string;
  subtitleDigitalEmployee: string;
  subtitleAgentSwarm: string;
  subtitleConfig: string;
  subtitleEnvVars: string;
  subtitleModels: string;
  subtitleDebug: string;
  subtitleLogs: string;
  subtitleLlmTrace: string;
  // Nav titles (tab labels; proper nouns not translated)
  navTitleAgents: string;
  navTitleOverview: string;
  navTitleChannels: string;
  navTitleInstances: string;
  navTitleSessions: string;
  navTitleUsage: string;
  navTitleCron: string;
  navTitleSkills: string;
  navTitleMcp: string;
  navTitleNodes: string;
  navTitleChat: string;
  navTitleDigitalEmployee: string;
  navTitleAgentSwarm: string;
  agentSwarmDevBadge: string;
  navTitleConfig: string;
  navTitleEnvVars: string;
  navTitleModels: string;
  navTitleDebug: string;
  navTitleLogs: string;
  navTitleLlmTrace: string;
  navTitleSandbox: string;
  navTitleApprovals: string;
  navTitleControl: string;
  subtitleSandbox: string;
  subtitleApprovals: string;
  securitySectionSandbox: string;
  securitySectionValidator: string;
  securitySectionApprovalQueue: string;
  securitySectionSandboxDesc: string;
  securitySectionValidatorDesc: string;
  securitySectionApprovalQueueDesc: string;
  securityApprovalQueueEnabled: string;
  securityApprovalTimeoutSeconds: string;
  securityApprovalTimeoutSecondsHint: string;
  securityApprovalAllow: string;
  securityApprovalAllowHint: string;
  securityApprovalAsk: string;
  securityApprovalAskHint: string;
  securityApprovalDeny: string;
  securityApprovalDenyHint: string;
  securityApprovalBlockOnApproval: string;
  securityApprovalBlockOnApprovalHint: string;
  // Overview
  overviewGatewayAccess: string;
  overviewGatewayAccessSub: string;
  overviewWebSocketUrl: string;
  overviewGatewayHost: string;
  overviewGatewayToken: string;
  overviewPassword: string;
  overviewDefaultSessionKey: string;
  overviewConnect: string;
  overviewRefresh: string;
  overviewConnectHint: string;
  overviewSnapshot: string;
  overviewSnapshotSub: string;
  overviewStatus: string;
  overviewConnected: string;
  overviewDisconnected: string;
  overviewUptime: string;
  overviewTickInterval: string;
  overviewLastChannelsRefresh: string;
  overviewChannelsHint: string;
  overviewInstances: string;
  overviewInstancesSub: string;
  overviewSessions: string;
  overviewSessionsSub: string;
  overviewCron: string;
  overviewCronNext: string;
  overviewCronEnabled: string;
  overviewCronDisabled: string;
  overviewNotes: string;
  overviewNotesSub: string;
  overviewNoteTailscale: string;
  overviewNoteTailscaleSub: string;
  overviewNoteSessionHygiene: string;
  overviewNoteSessionHygieneSub: string;
  overviewNoteCron: string;
  overviewNoteCronSub: string;
  // Common
  commonLoading: string;
  commonRefresh: string;
  commonRefreshing: string;
  commonSaving: string;
  commonDelete: string;
  commonFilter: string;
  commonOptional: string;
  commonInherit: string;
  commonOffExplicit: string;
  commonNA: string;
  commonYes: string;
  commonNo: string;
  chatQueueRemoveConfirm: string;
  cronDeleteConfirm: string;
  employeeDeleteConfirm: string;
  // Channels
  channelsConfigure: string;
  mcpAddServer: string;
  mcpServerName: string;
  mcpNoServers: string;
  mcpEnabled: string;
  /** 表单项「启用」旁复选框的简短标签（与列表状态「已启用」区分） */
  mcpEnabledField: string;
  mcpDisabled: string;
  mcpFormMode: string;
  mcpRawMode: string;
  mcpCommand: string;
  mcpArgs: string;
  mcpUrl: string;
  mcpService: string;
  mcpServiceUrl: string;
  mcpToolPrefix: string;
  mcpRawJson: string;
  mcpDeleteConfirm: string;
  mcpConnectionTypeStdio: string;
  mcpConnectionTypeUrl: string;
  mcpConnectionTypeService: string;
  mcpEnv: string;
  mcpEnvPlaceholder: string;
  mcpViewList: string;
  mcpViewCard: string;
  mcpTableName: string;
  mcpTableType: string;
  mcpTableStatus: string;
  mcpTableActions: string;
  llmTraceSearch: string;
  llmTraceSearchPlaceholder: string;
  llmTraceEnabled: string;
  llmTraceDisabled: string;
  llmTraceActionEnable: string;
  llmTraceActionDisable: string;
  llmTraceToggleTooltip: string;
  llmTraceModeActive: string;
  llmTraceModeAll: string;
  llmTraceSessionKey: string;
  llmTraceSessionId: string;
  llmTraceUpdatedAt: string;
  llmTraceFile: string;
  llmTraceFileSize: string;
  llmTraceView: string;
  llmTraceBack: string;
  llmTraceDownload: string;
  llmTraceNoEntries: string;
  sandboxEnabled: string;
  sandboxDisabled: string;
  sandboxActionEnable: string;
  sandboxActionDisable: string;
  sandboxAllowedPaths: string;
  sandboxNetworkAllow: string;
  sandboxHooks: string;
  sandboxHookBeforeAgent: string;
  sandboxHookBeforeModel: string;
  sandboxHookAfterModel: string;
  sandboxHookBeforeTool: string;
  sandboxHookAfterTool: string;
  sandboxHookAfterAgent: string;
  sandboxHookDescBeforeAgent: string;
  sandboxHookDescBeforeModel: string;
  sandboxHookDescAfterModel: string;
  sandboxHookDescBeforeTool: string;
  sandboxHookDescAfterTool: string;
  sandboxHookDescAfterAgent: string;
  sandboxValidator: string;
  sandboxResourceLimit: string;
  sandboxMaxCPUPercent: string;
  sandboxMaxMemoryBytes: string;
  sandboxMaxDiskBytes: string;
  sandboxSecretPatterns: string;
  sandboxSecretPatternsHint: string;
  sandboxBanCommands: string;
  sandboxBanArguments: string;
  sandboxBanFragments: string;
  sandboxSectionConfig: string;
  sandboxSectionApprovals: string;
  approvalsList: string;
  approvalsId: string;
  approvalsSessionKey: string;
  approvalsSessionId: string;
  approvalsCommand: string;
  approvalsTimeout: string;
  approvalsTTL: string;
  approvalsStatus: string;
  approvalsApprove: string;
  approvalsApproveOnce: string;
  approvalsWhitelist: string;
  approvalsWhitelistSession: string;
  approvalsDeny: string;
  approvalsExpired: string;
  approvalsPending: string;
  approvalsNoEntries: string;
  approvalsProcessed: string;
  approvalsViewSession: string;
  approvalsSectionApproved: string;
  approvalsSectionDenied: string;
  approvalsSectionWhitelisted: string;
  approvalsExpiresIn: string;
  approvalsExpiresAt: string;
  approvalsTtlPermanent: string;
  approvalsReason: string;
  securityOverviewTitle: string;
  securityOverviewPreset: string;
  securityOverviewSandbox: string;
  securityOverviewCommandPolicy: string;
  securityOverviewPendingApprovals: string;
  securityPresetsTitle: string;
  securityPresetsHint: string;
  securityPresetOff: string;
  securityPresetLoose: string;
  securityPresetStandard: string;
  securityPresetStrict: string;
  securityPresetOffDesc: string;
  securityPresetLooseDesc: string;
  securityPresetStandardDesc: string;
  securityPresetStrictDesc: string;
  securitySectionCommandPolicy: string;
  securitySectionCommandPolicyDesc: string;
  securityDefaultPolicy: string;
  securityDefaultDeny: string;
  securityDefaultAsk: string;
  securityDefaultAllow: string;
  securityRulesList: string;
  securityRuleAction: string;
  securityRulePattern: string;
  securityRuleType: string;
  securityActionDeny: string;
  securityActionAsk: string;
  securityActionAllow: string;
  securityAddRule: string;
  securityAdvancedOptions: string;
  securityMaxLength: string;
  securityResourceCustom: string;
  securityRulesHint: string;
  securityRulesDenyHint: string;
  securityRulesAskHint: string;
  securityRulesAllowHint: string;
  modelsViewList: string;
  modelsViewCard: string;
  modelsSearchPlaceholder: string;
  modelsSearchNoMatch: string;
  modelsTableName: string;
  modelsTableModel: string;
  modelsTableBaseUrl: string;
  modelsTableActions: string;
  modelsAddProvider: string;
  modelsAddCustomProvider: string;
  modelsProviderId: string;
  modelsProviderIdPlaceholder: string;
  modelsProviderIdHint: string;
  modelsDisplayName: string;
  modelsDisplayNamePlaceholder: string;
  modelsDefaultBaseUrl: string;
  modelsDefaultBaseUrlPlaceholder: string;
  modelsApiKeyPrefix: string;
  modelsApiKeyPrefixPlaceholder: string;
  modelsApiType: string;
  modelsApiTypeTooltip: string;
  modelsApiTypeOpenAI: string;
  modelsApiTypeAnthropic: string;
  modelsEnvVars: string;
  modelsAddModel: string;
  modelsModelId: string;
  modelsModelName: string;
  /** History/context token budget (maps to config contextWindow). */
  modelsContextWindow: string;
  modelsContextWindowPlaceholder: string;
  modelsContextWindowHint: string;
  /** Max completion tokens per request (maps to config maxTokens). */
  modelsMaxTokens: string;
  modelsMaxTokensPlaceholder: string;
  modelsMaxTokensHint: string;
  modelsModelManagement: string;
  modelsNoModels: string;
  modelsEnvVarConflict: string;
  modelsNoProviders: string;
  modelsModels: string;
  modelsBaseUrl: string;
  modelsApiKey: string;
  modelsUseAsDefault: string;
  modelsCancelUse: string;
  modelsProviderDeleteConfirm: string;
  modelsSelectModelToUse: string;
  modelsCurrentDefault: string;
  channelsHealth: string;
  channelsHealthSub: string;
  channelsNoSnapshot: string;
  channelsSchemaUnavailable: string;
  channelsConfigSchemaUnavailable: string;
  channelsConfigSaveConfirm: string;
  /** 渠道已启用但网关侧运行时启动/连接失败时，弹窗标题 */
  channelsRuntimeStartErrorTitle: string;
  channelsLoadingConfigSchema: string;
  commonSave: string;
  commonCreate: string;
  commonReload: string;
  commonCancel: string;
  /** 应用内对话框主按钮（替代 window.alert/confirm 桌面不可用场景） */
  nativeDialogOK: string;
  channelConfigured: string;
  channelRunning: string;
  channelLastStart: string;
  channelLastProbe: string;
  channelProbe: string;
  channelProbeOk: string;
  channelProbeFailed: string;
  channelLinked: string;
  channelConnected: string;
  channelLastConnect: string;
  channelLastMessage: string;
  channelAuthAge: string;
  channelBaseUrl: string;
  channelCredential: string;
  channelAudience: string;
  channelMode: string;
  channelPublicKey: string;
  channelLastInbound: string;
  channelActive: string;
  channelGenericSub: string;
  channelAccounts: string;
  channelWhatsApp: string;
  channelWhatsAppSub: string;
  channelTelegram: string;
  channelTelegramSub: string;
  channelDiscord: string;
  channelDiscordSub: string;
  channelGoogleChat: string;
  channelGoogleChatSub: string;
  channelIMessage: string;
  channelIMessageSub: string;
  channelSignal: string;
  channelSignalSub: string;
  channelSlack: string;
  channelSlackSub: string;
  channelNostr: string;
  channelNostrSub: string;
  channelWhatsAppWorking: string;
  channelShowQr: string;
  channelRelink: string;
  channelWaitForScan: string;
  channelLogout: string;
  channelWeWork: string;
  channelWeWorkSub: string;
  channelWeWorkTransport: string;
  channelWeWorkBotId: string;
  channelWeWorkQrStart: string;
  channelWeWorkQrWorking: string;
  channelWeWorkQrStartFailed: string;
  channelWeWorkOpenGenPage: string;
  channelWeWorkQrModalTitle: string;
  channelWeWorkQrReplaceWarn: string;
  channelWeWorkQrPreparing: string;
  channelWeWorkQrWaiting: string;
  channelWeWorkQrSuccessClosing: string;
  channelWeWorkQrSaveMissingForm: string;
  channelWeWorkQrModalCancel: string;
  channelWeixin: string;
  channelWeixinSub: string;
  channelWeixinTransport: string;
  channelWeixinBotId: string;
  channelWeixinQrStart: string;
  channelWeixinQrWorking: string;
  channelWeixinQrStartFailed: string;
  channelWeixinQrModalTitle: string;
  channelWeixinQrReplaceWarn: string;
  channelWeixinQrPreparing: string;
  channelWeixinQrWaiting: string;
  channelWeixinQrConfirmOnPhone: string;
  channelWeixinQrScanHint: string;
  channelWeixinOpenScanPage: string;
  channelWeixinQrSuccessClosing: string;
  channelWeixinQrSaveMissingForm: string;
  channelWeixinQrModalCancel: string;
  channelWeixinQrExpired: string;
  nostrEditProfile: string;
  nostrAccount: string;
  nostrUsername: string;
  nostrDisplayName: string;
  nostrBio: string;
  nostrAvatarUrl: string;
  nostrBannerUrl: string;
  nostrWebsite: string;
  nostrNip05: string;
  nostrLud16: string;
  nostrSavePublish: string;
  nostrImportRelays: string;
  nostrHideAdvanced: string;
  nostrShowAdvanced: string;
  nostrUnsavedChanges: string;
  nostrProfilePreview: string;
  nostrAdvanced: string;
  nostrImporting: string;
  nostrNoProfileSet: string;
  nostrProfile: string;
  nostrAbout: string;
  nostrName: string;
  // Instances
  instancesTitle: string;
  instancesSub: string;
  instancesNoReported: string;
  instancesUnknownHost: string;
  instancesLastInput: string;
  instancesReason: string;
  instancesScopes: string;
  // Sessions
  sessionsTitle: string;
  sessionsSub: string;
  sessionsActiveWithin: string;
  sessionsLimit: string;
  sessionsIncludeGlobal: string;
  sessionsIncludeUnknown: string;
  sessionsStore: string;
  sessionsKey: string;
  sessionsLabel: string;
  sessionsKind: string;
  sessionsUpdated: string;
  sessionsTokens: string;
  sessionsThinking: string;
  sessionsVerbose: string;
  sessionsReasoning: string;
  sessionsActions: string;
  sessionsNoFound: string;
  // Usage
  usageNoTimeline: string;
  usageNoData: string;
  usageHours: string;
  usageMidnight: string;
  usage4am: string;
  usage8am: string;
  usageNoon: string;
  usage4pm: string;
  usage8pm: string;
  usageDailyToken: string;
  usageDailyCost: string;
  usageOutput: string;
  usageInput: string;
  usageCacheWrite: string;
  usageCacheRead: string;
  usageClearFilters: string;
  usageRemoveFilter: string;
  usageDays: string;
  usageHoursLabel: string;
  usageSession: string;
  usageFiltered: string;
  usageVisible: string;
  usageExport: string;
  usageActivityByTime: string;
  usageMosaicSubNoData: string;
  usageTokensUnit: string;
  usageTimeZoneLocal: string;
  usageTimeZoneUtc: string;
  usageDayOfWeek: string;
  usageDailyUsage: string;
  usageTotal: string;
  usageByType: string;
  usageTokensByType: string;
  usageCostByType: string;
  usageTotalLabel: string;
  usageOverview: string;
  usageMessages: string;
  usageToolCalls: string;
  usageErrors: string;
  usageAvgTokensMsg: string;
  usageAvgCostMsg: string;
  usageSessionsCard: string;
  usageThroughput: string;
  usageErrorRate: string;
  usageCacheHitRate: string;
  usageMessagesHint: string;
  usageToolCallsHint: string;
  usageErrorsHint: string;
  usageAvgTokensMsgHint: string;
  usageSessionsHint: string;
  usageThroughputHint: string;
  usageErrorRateHint: string;
  usageCacheHitRateHint: string;
  usageTopModels: string;
  usageTopProviders: string;
  usageTopTools: string;
  usageTopAgents: string;
  usageTopChannels: string;
  usagePeakErrorDays: string;
  usagePeakErrorHours: string;
  usageNoModelData: string;
  usageNoProviderData: string;
  usageNoToolCalls: string;
  usageNoAgentData: string;
  usageNoChannelData: string;
  usageNoErrorData: string;
  usageShown: string;
  usageTotalSessions: string;
  usageAvg: string;
  usageAll: string;
  usageRecentlyViewed: string;
  usageSort: string;
  usageCost: string;
  usageErrorsCol: string;
  usageMessagesCol: string;
  usageRecent: string;
  usageTokensCol: string;
  usageDescending: string;
  usageAscending: string;
  usageClearSelection: string;
  usageNoRecentSessions: string;
  usageNoSessionsInRange: string;
  usageCopy: string;
  usageCopySessionName: string;
  usageSelectedCount: string;
  usageMoreSessions: string;
  usageUserAssistant: string;
  usageToolsUsed: string;
  usageToolResults: string;
  usageAcrossMessages: string;
  usageInRange: string;
  usageCached: string;
  usagePrompt: string;
  usageCacheHint: string;
  usageErrorHint: string;
  usageTokensHint: string;
  usageCostHint: string;
  usageCostHintMissing: string;
  usageModelMix: string;
  usageDuration: string;
  usageCloseSessionDetails: string;
  usageLoading: string;
  usageNoTimelineData: string;
  usageNoDataInRange: string;
  usageUsageOverTime: string;
  usagePerTurn: string;
  usageCumulative: string;
  usageNoContextData: string;
  usageSystemPromptBreakdown: string;
  usageExpandAll: string;
  usageCollapseAll: string;
  usageBaseContextPerMessage: string;
  usageSys: string;
  usageSkills: string;
  usageToolsLabel: string;
  usageFiles: string;
  usageConversation: string;
  usageNoMessages: string;
  usageSearchConversation: string;
  usageClear: string;
  usageHasTools: string;
  usageUser: string;
  usageAssistant: string;
  usageTool: string;
  usageToolResult: string;
  usageMessagesCount: string;
  usageNoMessagesMatchFilters: string;
  usageTokenUsage: string;
  usageToday: string;
  usage7d: string;
  usage30d: string;
  usageExportSessionsCsv: string;
  usageExportDailyCsv: string;
  usageSessionsCount: string;
  usageQueryHintMatch: string;
  usageQueryHintInRange: string;
  usagePageSubtitle: string;
  usageCalls: string;
  // Cron
  cronScheduler: string;
  cronSchedulerSub: string;
  cronEnabled: string;
  cronJobs: string;
  cronNewJob: string;
  cronNewJobSub: string;
  cronName: string;
  cronDescription: string;
  cronAgentId: string;
  cronSchedule: string;
  cronEvery: string;
  cronAt: string;
  cronCron: string;
  cronSession: string;
  cronMain: string;
  cronIsolated: string;
  cronWakeMode: string;
  cronNextHeartbeat: string;
  cronNow: string;
  cronPayload: string;
  cronSystemEvent: string;
  cronAgentTurn: string;
  cronSystemText: string;
  cronAgentMessage: string;
  cronDelivery: string;
  cronAnnounceSummary: string;
  cronNoneInternal: string;
  cronChannel: string;
  cronTo: string;
  cronToPlaceholder: string;
  cronToHint: string;
  cronToTooltip: string;
  cronAddJob: string;
  cronJobsTitle: string;
  cronJobsSub: string;
  cronNoJobsYet: string;
  cronRunHistory: string;
  cronRunHistorySub: string;
  cronSelectJob: string;
  cronNoRunsYet: string;
  cronSelectJobToInspect: string;
  cronRunAt: string;
  cronUnit: string;
  cronMinutes: string;
  cronHours: string;
  cronDays: string;
  cronExpression: string;
  cronTimeoutSeconds: string;
  cronLast: string;
  // Agents (tool sections - labels only for sidebar/cards; tool id kept as-is)
  agentsFiles: string;
  agentsRuntime: string;
  agentsWeb: string;
  agentsMemory: string;
  agentsSessions: string;
  agentsUi: string;
  agentsMessaging: string;
  agentsAutomation: string;
  agentsReadFile: string;
  agentsWriteFile: string;
  agentsEdit: string;
  agentsApplyPatch: string;
  agentsExec: string;
  agentsProcess: string;
  agentsWebSearch: string;
  agentsWebFetch: string;
  agentsMemorySearch: string;
  agentsMemoryGet: string;
  agentsSessionsList: string;
  agentsSessionsHistory: string;
  agentsSessionsSend: string;
  agentsSessionsSpawn: string;
  agentsSessionStatus: string;
  agentsBrowser: string;
  agentsCanvas: string;
  agentsMessage: string;
  agentsScheduleTasks: string;
  agentsGatewayControl: string;
  agentsNodesDevices: string;
  agentsListAgents: string;
  agentsImageUnderstanding: string;
  agentsNodes: string;
  agentsAgents: string;
  agentsMedia: string;
  agentsTitle: string;
  agentsConfigured: string;
  agentsNoFound: string;
  agentsSelectAgent: string;
  agentsSelectAgentSub: string;
  agentsWorkspaceRouting: string;
  agentsProfileMinimal: string;
  agentsProfileCoding: string;
  agentsProfileMessaging: string;
  agentsProfileFull: string;
  agentsDefault: string;
  agentsSelected: string;
  agentsAllSkills: string;
  agentsCurrentModel: string;
  agentsInheritDefault: string;
  agentsOverview: string;
  agentsOverviewSub: string;
  agentsWorkspace: string;
  agentsPrimaryModel: string;
  agentsIdentityName: string;
  agentsDefaultLabel: string;
  agentsIdentityEmoji: string;
  agentsSkillsFilter: string;
  agentsModelSelection: string;
  agentsPrimaryModelLabel: string;
  agentsPrimaryModelDefault: string;
  agentsFallbacksLabel: string;
  agentsReloadConfig: string;
  agentsAgentContext: string;
  agentsContextWorkspaceIdentity: string;
  agentsContextWorkspaceScheduling: string;
  agentsChannels: string;
  agentsChannelsSub: string;
  agentsLoadChannels: string;
  agentsNoChannels: string;
  agentsConnected: string;
  agentsConfiguredLabel: string;
  agentsEnabled: string;
  agentsDisabled: string;
  agentsNoAccounts: string;
  agentsNotConfigured: string;
  agentsScheduler: string;
  agentsSchedulerSub: string;
  agentsNextWake: string;
  agentsCronJobs: string;
  agentsCronJobsSub: string;
  agentsNoJobsAssigned: string;
  agentsCoreFiles: string;
  agentsCoreFilesSub: string;
  agentsLoadWorkspaceFiles: string;
  agentsNoFilesFound: string;
  agentsSelectFileToEdit: string;
  agentsReset: string;
  agentsFileMissingCreate: string;
  agentsUnavailable: string;
  agentsTabOverview: string;
  agentsTabFiles: string;
  agentsTabTools: string;
  agentsTabSkills: string;
  agentsTabChannels: string;
  agentsTabCron: string;
  agentsFallback: string;
  agentsNever: string;
  agentsLastRefresh: string;
  agentsSkillsPanelSub: string;
  agentsUseAll: string;
  agentsDisableAll: string;
  agentsLoadConfigForSkills: string;
  agentsCustomAllowlist: string;
  agentsAllSkillsEnabled: string;
  agentsLoadSkillsForAgent: string;
  agentsFilter: string;
  agentsNoSkillsFound: string;
  agentsToolsGlobalAllow: string;
  agentsProfile: string;
  agentsSource: string;
  agentsStatus: string;
  agentsUnsaved: string;
  agentsQuickPresets: string;
  agentsInherit: string;
  agentsToolsTitle: string;
  agentsToolsSub: string;
  agentsToolAccess: string;
  agentsToolsSubText: string;
  agentsLoadConfigForTools: string;
  agentsExplicitAllowlist: string;
  agentsEnableAll: string;
  agentsEnabledCount: string;
  // Skills
  skillsTitle: string;
  skillsSub: string;
  skillsSearchPlaceholder: string;
  skillsShown: string;
  skillsWorkspace: string;
  skillsBuiltIn: string;
  skillsInstalled: string;
  skillsExtra: string;
  skillsOther: string;
  skillsAdd: string;
  skillsAddSkill: string;
  skillsUploadName: string;
  skillsUploadNamePlaceholder: string;
  skillsUploadFile: string;
  skillsUploadFileHint: string;
  skillsUploadSingleHint: string;
  skillsUploadZipHint: string;
  skillsUploadSubmit: string;
  skillsUploadSuccess: string;
  skillsDelete: string;
  skillsDeleteConfirm: string;
  skillsSource: string;
  skillsPath: string;
  skillsNoDoc: string;
  skillsEligible: string;
  skillsDisabled: string;
  skillsRequiresBins: string;
  skillsRequiresEnv: string;
  skillsRequiresConfig: string;
  skillsMissing: string;
  // Nodes
  nodesTitle: string;
  nodesSub: string;
  nodesNoFound: string;
  nodesDevices: string;
  nodesDevicesSub: string;
  nodesPending: string;
  nodesPaired: string;
  nodesNoPairedDevices: string;
  nodesRoleLabel: string;
  nodesRoleNone: string;
  nodesRepairSuffix: string;
  nodesRequested: string;
  nodesApprove: string;
  nodesReject: string;
  nodesRolesLabel: string;
  nodesScopesLabel: string;
  nodesTokensNone: string;
  nodesTokens: string;
  nodesTokenRevoked: string;
  nodesTokenActive: string;
  nodesRotate: string;
  nodesRevoke: string;
  nodesBindingTitle: string;
  nodesBindingSub: string;
  nodesBindingFormModeHint: string;
  nodesLoadConfigHint: string;
  nodesLoadConfig: string;
  nodesDefaultBinding: string;
  nodesDefaultBindingSub: string;
  nodesNodeLabel: string;
  nodesAnyNode: string;
  nodesNoNodesSystemRun: string;
  nodesNoAgentsFound: string;
  nodesExecApprovalsTitle: string;
  nodesExecApprovalsSub: string;
  nodesLoadExecApprovalsHint: string;
  nodesLoadApprovals: string;
  nodesTarget: string;
  nodesTargetSub: string;
  nodesHost: string;
  nodesHostGateway: string;
  nodesHostNode: string;
  nodesSelectNode: string;
  nodesNoNodesExecApprovals: string;
  nodesScope: string;
  nodesDefaults: string;
  nodesSecurity: string;
  nodesSecurityDefaultSub: string;
  nodesSecurityAgentSubPrefix: string;
  nodesMode: string;
  nodesUseDefaultPrefix: string;
  nodesUseDefaultButton: string;
  nodesSecurityDeny: string;
  nodesSecurityAllowlist: string;
  nodesSecurityFull: string;
  nodesAsk: string;
  nodesAskDefaultSub: string;
  nodesAskAgentSubPrefix: string;
  nodesAskOff: string;
  nodesAskOnMiss: string;
  nodesAskAlways: string;
  nodesAskFallback: string;
  nodesAskFallbackDefaultSub: string;
  nodesAskFallbackAgentSubPrefix: string;
  nodesFallback: string;
  nodesAutoAllowSkills: string;
  nodesAutoAllowSkillsDefaultSub: string;
  nodesAutoAllowSkillsUsingDefault: string;
  nodesAutoAllowSkillsOverride: string;
  nodesEnabled: string;
  nodesAllowlist: string;
  nodesAllowlistSub: string;
  nodesAddPattern: string;
  nodesNoAllowlistEntries: string;
  nodesNewPattern: string;
  nodesLastUsedPrefix: string;
  nodesPattern: string;
  nodesRemove: string;
  nodesDefaultAgent: string;
  nodesAgent: string;
  nodesUsesDefault: string;
  nodesOverride: string;
  nodesBinding: string;
  nodesChipPaired: string;
  nodesChipUnpaired: string;
  nodesConnected: string;
  nodesOffline: string;
  nodesNever: string;
  // Config (section labels for sidebar)
  configEnv: string;
  configUpdate: string;
  configAgents: string;
  configAuth: string;
  configChannels: string;
  configMessages: string;
  configCommands: string;
  configHooks: string;
  configSkills: string;
  configTools: string;
  configGateway: string;
  configWizard: string;
  configMeta: string;
  configLogging: string;
  configBrowser: string;
  configUi: string;
  configModels: string;
  configBindings: string;
  configBroadcast: string;
  configAudio: string;
  configSession: string;
  configCron: string;
  configWeb: string;
  configDiscovery: string;
  configCanvasHost: string;
  configTalk: string;
  configPlugins: string;
  configEnvVars: string;
  configEnvVarsDesc: string;
  configUpdatesDesc: string;
  configAgentsDesc: string;
  configAuthDesc: string;
  configChannelsDesc: string;
  configMessagesDesc: string;
  configCommandsDesc: string;
  configHooksDesc: string;
  configSkillsDesc: string;
  configToolsDesc: string;
  configGatewayDesc: string;
  configWizardDesc: string;
  configMetaDesc: string;
  configLoggingDesc: string;
  configBrowserDesc: string;
  configUiDesc: string;
  configModelsDesc: string;
  configBindingsDesc: string;
  configBroadcastDesc: string;
  configAudioDesc: string;
  configSessionDesc: string;
  configCronDesc: string;
  configWebDesc: string;
  configDiscoveryDesc: string;
  configCanvasHostDesc: string;
  configTalkDesc: string;
  configPluginsDesc: string;
  // Config page (settings view)
  configSettingsTitle: string;
  configSearchPlaceholder: string;
  configAllSettings: string;
  configForm: string;
  configRaw: string;
  configUnsavedChanges: string;
  configUnsavedChangesLabel: string;
  configOneUnsavedChange: string;
  configNoChanges: string;
  configApplying: string;
  configApply: string;
  configUpdating: string;
  configUpdateButton: string;
  configViewPrefix: string;
  configPendingChange: string;
  configPendingChanges: string;
  configLoadingSchema: string;
  configFormUnsafeWarning: string;
  configRawJson5: string;
  configValidityValid: string;
  configValidityInvalid: string;
  configValidityUnknown: string;
  configSchemaUnavailable: string;
  configUnsupportedSchema: string;
  configNoSettingsMatchPrefix: string;
  configNoSettingsMatchSuffix: string;
  configNoSettingsInSection: string;
  configUnsupportedSchemaNode: string;
  configSubnavAll: string;
  // Env vars view
  envVarsSection: string;
  envModelEnvSection: string;
  envShellEnvSection: string;
  envVarsKey: string;
  envVarsValue: string;
  envVarsAdd: string;
  envVarsDelete: string;
  envVarsSave: string;
  envVarsEmpty: string;
  envVarsKeyPlaceholder: string;
  envVarsValuePlaceholder: string;
  // Debug
  debugSnapshots: string;
  debugSnapshotsSub: string;
  debugStatus: string;
  debugHealth: string;
  debugLastHeartbeat: string;
  debugSecurityAudit: string;
  debugManualRpc: string;
  debugManualRpcSub: string;
  debugMethod: string;
  debugParams: string;
  debugCall: string;
  debugCritical: string;
  debugWarnings: string;
  debugNoCritical: string;
  debugInfo: string;
  debugSecurityAuditDetails: string;
  debugModels: string;
  debugModelsSub: string;
  debugEventLog: string;
  debugEventLogSub: string;
  debugNoEvents: string;
  // Logs
  logsTitle: string;
  logsSub: string;
  logsExportFiltered: string;
  logsExportVisible: string;
};

const EN: Strings = {
  tabGroupChat: "Chat",
  tabGroupControl: "Control",
  tabGroupAgent: "Agent",
  tabGroupSettings: "Settings",
  subtitleAgents: "Manage agent workspaces, tools, and identities.",
  subtitleOverview: "Gateway status, entry points, and a fast health read.",
  subtitleChannels: "Manage channels and settings.",
  subtitleInstances: "Presence beacons from connected clients and nodes.",
  subtitleSessions: "Inspect active sessions and adjust per-session defaults.",
  subtitleUsage: "",
  subtitleCron: "Schedule wakeups and recurring agent runs.",
  subtitleSkills: "Manage skill availability and API key injection.",
  subtitleMcp: "Configure MCP servers and tools.",
  subtitleNodes: "Paired devices, capabilities, and command exposure.",
  subtitleChat: "Direct gateway chat session for quick interventions.",
  subtitleDigitalEmployee: "Start templated conversations with domain-specific digital employees.",
  subtitleAgentSwarm: "Multi-agent swarm collaboration for ops and SRE.",
  subtitleConfig: "Edit ~/.openclaw/openclaw.json safely.",
  subtitleEnvVars: "Key-value env vars saved to config.env.vars in ~/.openocta/openocta.json.",
  subtitleModels: "Configure model providers and API keys.",
  subtitleDebug: "Gateway snapshots, events, and manual RPC calls.",
  subtitleLogs: "Live tail of the gateway file logs.",
  subtitleLlmTrace: "View LLM trace details for sessions.",
  subtitleSandbox: "Sandbox, command validation, and approval queue.",
  subtitleApprovals: "Command approval queue; approve or deny by session.",
  navTitleAgents: "Agents",
  navTitleOverview: "Overview",
  navTitleChannels: "Channels",
  navTitleInstances: "Instances",
  navTitleSessions: "Sessions",
  navTitleUsage: "Usage",
  navTitleCron: "Cron Jobs",
  navTitleSkills: "Skills",
  navTitleMcp: "MCP",
  navTitleNodes: "Nodes",
  navTitleChat: "Chat",
  navTitleDigitalEmployee: "Digital Employee",
  navTitleAgentSwarm: "Agent Swarm",
  agentSwarmDevBadge: "In Development",
  navTitleConfig: "Config",
  navTitleEnvVars: "Env Vars",
  navTitleModels: "Models",
  navTitleDebug: "Debug",
  navTitleLogs: "Logs",
  navTitleLlmTrace: "LLM Trace",
  navTitleSandbox: "Security Policy",
  navTitleApprovals: "Approvals",
  navTitleControl: "Control",
  overviewGatewayAccess: "Gateway Access",
  overviewGatewayAccessSub: "Where the dashboard connects and how it authenticates.",
  overviewWebSocketUrl: "WebSocket URL",
  overviewGatewayHost: "Backend Address (IP:Port)",
  overviewGatewayToken: "Gateway Token",
  overviewPassword: "Password (not stored)",
  overviewDefaultSessionKey: "Default Session Key",
  overviewConnect: "Connect",
  overviewRefresh: "Refresh",
  overviewConnectHint: "Click Connect to apply connection changes.",
  overviewSnapshot: "Snapshot",
  overviewSnapshotSub: "Latest gateway handshake information.",
  overviewStatus: "Status",
  overviewConnected: "Connected",
  overviewDisconnected: "Disconnected",
  overviewUptime: "Uptime",
  overviewTickInterval: "Tick Interval",
  overviewLastChannelsRefresh: "Last Channels Refresh",
  overviewChannelsHint: "Use Channels to link WhatsApp, Telegram, Discord, Signal, or iMessage.",
  overviewInstances: "Instances",
  overviewInstancesSub: "Presence beacons in the last 5 minutes.",
  overviewSessions: "Sessions",
  overviewSessionsSub: "Recent session keys tracked by the gateway.",
  overviewCron: "Cron",
  overviewCronNext: "Next wake",
  overviewCronEnabled: "Enabled",
  overviewCronDisabled: "Disabled",
  overviewNotes: "Notes",
  overviewNotesSub: "Quick reminders for remote control setups.",
  overviewNoteTailscale: "Tailscale serve",
  overviewNoteTailscaleSub: "Prefer serve mode to keep the gateway on loopback with tailnet auth.",
  overviewNoteSessionHygiene: "Session hygiene",
  overviewNoteSessionHygieneSub: "Use /new or sessions.patch to reset context.",
  overviewNoteCron: "Cron reminders",
  overviewNoteCronSub: "Use isolated sessions for recurring runs.",
  commonLoading: "Loading…",
  commonRefresh: "Refresh",
  commonRefreshing: "Refreshing…",
  commonSaving: "Saving…",
  commonDelete: "Delete",
  commonFilter: "Filter",
  commonOptional: "(optional)",
  commonInherit: "inherit",
  commonOffExplicit: "off (explicit)",
  commonNA: "n/a",
  commonYes: "Yes",
  commonNo: "No",
  chatQueueRemoveConfirm: "Remove this queued message?",
  cronDeleteConfirm: "Delete this scheduled task?",
  employeeDeleteConfirm: "Delete this digital employee?",
  channelsConfigure: "Configure",
  mcpAddServer: "Add MCP Server",
  mcpServerName: "Server name",
  mcpNoServers: "No MCP servers configured.",
  mcpEnabled: "Enabled",
  mcpEnabledField: "Enable",
  mcpDisabled: "Disabled",
  mcpFormMode: "Form",
  mcpRawMode: "Raw JSON",
  mcpCommand: "Command",
  mcpArgs: "Args",
  mcpUrl: "URL",
  mcpService: "Service",
  mcpServiceUrl: "Service URL",
  mcpToolPrefix: "Tool Prefix",
  mcpRawJson: "Raw JSON",
  mcpDeleteConfirm: "Delete this MCP server?",
  mcpConnectionTypeStdio: "Command (stdio)",
  mcpConnectionTypeUrl: "URL",
  mcpConnectionTypeService: "Service",
  mcpEnv: "Environment variables",
  mcpEnvPlaceholder: "KEY=value or $ENV_VAR, one per line",
  mcpViewList: "List view",
  mcpViewCard: "Card view",
  mcpTableName: "Name",
  mcpTableType: "Type",
  mcpTableStatus: "Status",
  mcpTableActions: "Actions",
  llmTraceSearch: "Search",
  llmTraceSearchPlaceholder: "Filter by session key…",
  llmTraceEnabled: "Enabled",
  llmTraceDisabled: "Disabled",
  llmTraceActionEnable: "Enable",
  llmTraceActionDisable: "Disable",
  llmTraceToggleTooltip:
    "When enabled, new sessions will record model call Trace details (may impact performance). When disabled, new Trace details will not be recorded.",
  llmTraceModeActive: "Active",
  llmTraceModeAll: "All",
  llmTraceSessionKey: "Session Key",
  llmTraceSessionId: "Session ID",
  llmTraceUpdatedAt: "Updated",
  llmTraceFile: "File",
  llmTraceFileSize: "Size",
  llmTraceView: "View",
  llmTraceBack: "Back",
  llmTraceDownload: "Download",
  llmTraceNoEntries: "No trace entries.",
  sandboxEnabled: "Enabled",
  sandboxDisabled: "Disabled",
  sandboxActionEnable: "Enable",
  sandboxActionDisable: "Disable",
  sandboxAllowedPaths: "Allowed paths",
  sandboxNetworkAllow: "Network allowlist",
  sandboxHooks: "Security hooks",
  sandboxHookBeforeAgent: "BeforeAgent",
  sandboxHookBeforeModel: "BeforeModel",
  sandboxHookAfterModel: "AfterModel",
  sandboxHookBeforeTool: "BeforeTool",
  sandboxHookAfterTool: "AfterTool",
  sandboxHookAfterAgent: "AfterAgent",
  sandboxHookDescBeforeAgent: "Request validation: session abuse (DoS), long prompts, malicious IPs",
  sandboxHookDescBeforeModel: "Prompt safety: prompt injection, sensitive data leakage, control chars",
  sandboxHookDescAfterModel: "Output review: dangerous commands, secret leakage, malicious URLs",
  sandboxHookDescBeforeTool: "Permission check: tool permission, param validation, path validation",
  sandboxHookDescAfterTool: "Result review: secret leakage, error sanitization, output truncation",
  sandboxHookDescAfterAgent: "Audit logging, compliance checks",
  sandboxValidator: "Command validator",
  sandboxResourceLimit: "Resource limits",
  sandboxMaxCPUPercent: "Max CPU %",
  sandboxMaxMemoryBytes: "Max memory",
  sandboxMaxDiskBytes: "Max disk",
  sandboxSecretPatterns: "Secret leakage patterns (regex)",
  sandboxSecretPatternsHint: "One regex per line. Built-in patterns (API keys, tokens, etc.) are also applied.",
  sandboxBanCommands: "Ban commands",
  sandboxBanArguments: "Ban arguments",
  sandboxBanFragments: "Keyword fuse",
  sandboxSectionConfig: "Sandbox config",
  sandboxSectionApprovals: "Approval queue",
  securitySectionSandbox: "Environment boundary",
  securitySectionValidator: "命令校验",
  securitySectionApprovalQueue: "Approval Queue",
  securitySectionSandboxDesc: "Filesystem + network allowlist and optional resource limits.",
  securitySectionValidatorDesc: "Command validation rules (ban commands/args/fragments, length limits).",
  securitySectionApprovalQueueDesc: "Human-in-the-loop approvals for sensitive tool calls; supports session whitelist TTL.",
  securityApprovalQueueEnabled: "Enable approval queue",
  securityApprovalTimeoutSeconds: "Approval timeout (seconds)",
  securityApprovalTimeoutSecondsHint: "Pending approvals become expired after this time (best-effort; used by UI and gateway).",
  securityApprovalAllow: "Auto-allow commands",
  securityApprovalAllowHint: "Commands that bypass approval (one per line). Supports glob patterns like 'ls', 'pwd', 'echo *'.",
  securityApprovalAsk: "Require approval for",
  securityApprovalAskHint: "Commands that require approval (one per line). Supports glob patterns like 'rm', 'mv *', 'cp *'.",
  securityApprovalDeny: "Denied commands",
  securityApprovalDenyHint: "Commands that are always denied (one per line). Supports glob patterns like 'sudo', 'dd', 'mkfs *'.",
  securityApprovalBlockOnApproval: "Block on approval",
  securityApprovalBlockOnApprovalHint: "When enabled, the conversation will be blocked until the command is approved. When disabled, an error is returned immediately and the conversation ends.",
  approvalsList: "Approval queue",
  approvalsId: "ID",
  approvalsSessionKey: "Session Key",
  approvalsSessionId: "Session ID",
  approvalsCommand: "Command",
  approvalsTimeout: "Timeout",
  approvalsTTL: "TTL",
  approvalsStatus: "Status",
  approvalsApprove: "Approve",
  approvalsApproveOnce: "Approve once",
  approvalsWhitelist: "Whitelist",
  approvalsWhitelistSession: "Whitelist session",
  approvalsDeny: "Deny",
  approvalsExpired: "Expired",
  approvalsPending: "Pending",
  approvalsNoEntries: "No approval requests.",
  approvalsProcessed: "Processed",
  securityOverviewTitle: "Current status",
  securityOverviewPreset: "Preset",
  securityOverviewSandbox: "Environment",
  securityOverviewCommandPolicy: "Command policy",
  securityOverviewPendingApprovals: "Pending approvals",
  securityPresetsTitle: "Quick presets",
  securityPresetsHint: "One-click apply, overrides current config. See table for scenarios.",
  securityPresetOff: "All off",
  securityPresetLoose: "Loose",
  securityPresetStandard: "Standard",
  securityPresetStrict: "Strict",
  securityPresetOffDesc: "Disable all security: sandbox, command policy, and approval queue. Use for quick local testing only.",
  securityPresetLooseDesc: "Sandbox on, wide paths/network. Only blocks extreme danger (sudo, rm -rf, dd, mkfs). Default: allow. No approval. Best for: local dev, debugging.",
  securityPresetStandardDesc: "Sandbox on, moderate paths/network. Deny + some require approval (rm, mv, cp). Default: ask. Approval on. Best for: daily use, staging.",
  securityPresetStrictDesc: "Sandbox on, tight paths/network. Deny + many require approval. Default: deny. Approval on, blocking. Best for: production, compliance.",
  securitySectionCommandPolicy: "Command policy",
  securitySectionCommandPolicyDesc: "Unified rules: deny → ask → allow. Unmatched commands use default policy.",
  securityDefaultPolicy: "Default policy (when no rule matches)",
  securityDefaultDeny: "Deny",
  securityDefaultAsk: "Ask",
  securityDefaultAllow: "Allow",
  securityRulesList: "Rules",
  securityRuleAction: "Action",
  securityRulePattern: "Pattern",
  securityRuleType: "Type",
  securityActionDeny: "Deny",
  securityActionAsk: "Ask",
  securityActionAllow: "Allow",
  securityAddRule: "Add rule",
  securityAdvancedOptions: "Advanced: ban arguments, max length, secret patterns",
  securityMaxLength: "Max command length",
  securityResourceCustom: "Custom",
  securityRulesHint: "One pattern per line. For deny: single word = command (e.g. sudo), with space = fragment (e.g. rm -rf).",
  securityRulesDenyHint: "Commands/fragments to always deny. Single word = command, multi-word = fragment.",
  securityRulesAskHint: "Commands that require approval before execution.",
  securityRulesAllowHint: "Commands that bypass approval (auto-approved).",
  approvalsViewSession: "View session",
  approvalsSectionApproved: "Approved",
  approvalsSectionDenied: "Denied",
  approvalsSectionWhitelisted: "Session whitelisted",
  approvalsExpiresIn: "Expires in",
  approvalsExpiresAt: "Expires at",
  approvalsTtlPermanent: "Permanent",
  approvalsReason: "Reason",
  modelsViewList: "List view",
  modelsViewCard: "Card view",
  modelsSearchPlaceholder: "Search by name…",
  modelsSearchNoMatch: "No providers match your search.",
  modelsTableName: "Name",
  modelsTableModel: "Default Model",
  modelsTableBaseUrl: "Base URL",
  modelsTableActions: "Actions",
  modelsAddProvider: "Add Provider",
  modelsAddCustomProvider: "Add Custom Provider",
  modelsProviderId: "Provider ID",
  modelsProviderIdPlaceholder: "e.g. openai, google, anthropic",
  modelsProviderIdHint: "Lowercase letters, digits, hyphens, underscores. Cannot be changed later.",
  modelsDisplayName: "Display Name",
  modelsDisplayNamePlaceholder: "e.g. OpenAI, Google Gemini",
  modelsDefaultBaseUrl: "Default Base URL",
  modelsDefaultBaseUrlPlaceholder: "e.g. https://api.openai.com/v1",
  modelsApiKeyPrefix: "API Key Prefix (optional)",
  modelsApiKeyPrefixPlaceholder: "e.g. sk-",
  modelsApiType: "API Type",
  modelsApiTypeTooltip: "OpenAI: Compatible with OpenAI Chat Completions API. Anthropic: Compatible with Anthropic Messages API.",
  modelsApiTypeOpenAI: "OpenAI (openai-completions)",
  modelsApiTypeAnthropic: "Anthropic (anthropic-messages)",
  modelsEnvVars: "Environment Variables",
  modelsAddModel: "Add Model",
  modelsModelId: "Model ID",
  modelsModelName: "Model Name",
  modelsContextWindow: "Context window (tokens)",
  modelsContextWindowPlaceholder: "e.g. 262144",
  modelsContextWindowHint: "Caps estimated tokens kept in conversation history. Leave empty for default (no trim).",
  modelsMaxTokens: "Max output tokens",
  modelsMaxTokensPlaceholder: "e.g. 65536",
  modelsMaxTokensHint: "Max tokens per model completion. Leave empty to use the runtime default.",
  modelsModelManagement: "Model Management",
  modelsNoModels: "No models yet. Click Add Model to add one.",
  modelsEnvVarConflict: "Environment variable conflict",
  modelsNoProviders: "No model providers configured.",
  modelsModels: "models",
  modelsBaseUrl: "Base URL",
  modelsApiKey: "API Key",
  modelsUseAsDefault: "Use",
  modelsCancelUse: "Cancel use",
  modelsProviderDeleteConfirm: "Are you sure you want to delete this provider? This action cannot be undone.",
  modelsSelectModelToUse: "Select model to use",
  modelsCurrentDefault: "Current default",
  channelsHealth: "Channel health",
  channelsHealthSub: "Channel status snapshots from the gateway.",
  channelsNoSnapshot: "No snapshot yet.",
  channelsSchemaUnavailable: "Schema unavailable. Use Raw.",
  channelsConfigSchemaUnavailable: "Channel config schema unavailable.",
  channelsConfigSaveConfirm: "Saving channel config will interrupt and recreate long-lived connections. Continue?",
  channelsRuntimeStartErrorTitle: "The channel is enabled but failed to run. Details:",
  channelsLoadingConfigSchema: "Loading config schema…",
  commonSave: "Save",
  commonCreate: "Create",
  commonReload: "Reload",
  commonCancel: "Cancel",
  nativeDialogOK: "OK",
  channelConfigured: "Configured",
  channelRunning: "Running",
  channelLastStart: "Last start",
  channelLastProbe: "Last probe",
  channelProbe: "Probe",
  channelProbeOk: "ok",
  channelProbeFailed: "failed",
  channelLinked: "Linked",
  channelConnected: "Connected",
  channelLastConnect: "Last connect",
  channelLastMessage: "Last message",
  channelAuthAge: "Auth age",
  channelBaseUrl: "Base URL",
  channelCredential: "Credential",
  channelAudience: "Audience",
  channelMode: "Mode",
  channelPublicKey: "Public Key",
  channelLastInbound: "Last inbound",
  channelActive: "Active",
  channelGenericSub: "Channel status and configuration.",
  channelAccounts: "Accounts",
  channelWhatsApp: "WhatsApp",
  channelWhatsAppSub: "Link WhatsApp Web and monitor connection health.",
  channelTelegram: "Telegram",
  channelTelegramSub: "Bot status and channel configuration.",
  channelDiscord: "Discord",
  channelDiscordSub: "Bot status and channel configuration.",
  channelGoogleChat: "Google Chat",
  channelGoogleChatSub: "Chat API webhook status and channel configuration.",
  channelIMessage: "iMessage",
  channelIMessageSub: "macOS bridge status and channel configuration.",
  channelSignal: "Signal",
  channelSignalSub: "signal-cli status and channel configuration.",
  channelSlack: "Slack",
  channelSlackSub: "Socket mode status and channel configuration.",
  channelNostr: "Nostr",
  channelNostrSub: "Decentralized DMs via Nostr relays (NIP-04).",
  channelWhatsAppWorking: "Working…",
  channelShowQr: "Show QR",
  channelRelink: "Relink",
  channelWaitForScan: "Wait for scan",
  channelLogout: "Logout",
  channelWeWork: "Weixin Work Bot",
  channelWeWorkSub:
    "Enterprise WeChat intelligent bot via WebSocket (aibot). Scan to create or paste Bot ID and Secret.",
  channelWeWorkTransport: "Transport",
  channelWeWorkBotId: "Bot ID (masked)",
  channelWeWorkQrStart: "Scan to create bot",
  channelWeWorkQrWorking: "Working…",
  channelWeWorkQrStartFailed: "Could not start QR session (missing scode).",
  channelWeWorkOpenGenPage: "Open scan page",
  channelWeWorkQrModalTitle: "WeCom bot — scan to create",
  channelWeWorkQrReplaceWarn:
    "This gateway already has WeCom bot credentials. Creating again will replace Bot ID and Secret in the form (save to apply).",
  channelWeWorkQrPreparing: "Preparing QR session…",
  channelWeWorkQrWaiting: "Waiting for you to finish in WeCom…",
  channelWeWorkQrSuccessClosing:
    "Credentials saved. The gateway is reconnecting WebSocket. This dialog will close shortly.",
  channelWeWorkQrSaveMissingForm: "Could not read channels.wework from the form after scan.",
  channelWeWorkQrModalCancel: "Cancel",
  channelWeixin: "WeChat (personal)",
  channelWeixinSub:
    "Personal WeChat via Tencent iLink Bot API (long polling). Scan to log in; uses botToken + botId (not WeCom Bot Secret).",
  channelWeixinTransport: "Transport",
  channelWeixinBotId: "Bot ID (masked)",
  channelWeixinQrStart: "Scan to log in",
  channelWeixinQrWorking: "Working…",
  channelWeixinQrStartFailed: "Could not start iLink QR session (missing qrcode).",
  channelWeixinQrModalTitle: "Personal WeChat — scan to log in (iLink)",
  channelWeixinQrReplaceWarn:
    "This gateway already has personal WeChat iLink credentials. Scanning again will replace botToken and botId in the form (save applies patch).",
  channelWeixinQrPreparing: "Fetching QR from iLink…",
  channelWeixinQrWaiting: "Waiting for you to scan with WeChat…",
  channelWeixinQrConfirmOnPhone: "Scanned — confirm login on your phone…",
  channelWeixinQrScanHint: "Use WeChat to scan the QR code. After login, botToken and Bot ID are saved automatically.",
  channelWeixinOpenScanPage: "Open scan page in browser",
  channelWeixinQrSuccessClosing:
    "Credentials saved. The gateway will reconnect the iLink channel. This dialog closes shortly.",
  channelWeixinQrSaveMissingForm: "Could not read channels.weixin from the form after scan.",
  channelWeixinQrModalCancel: "Cancel",
  channelWeixinQrExpired: "The QR code expired. Close and tap “Scan to log in” again.",
  nostrEditProfile: "Edit Profile",
  nostrAccount: "Account",
  nostrUsername: "Username",
  nostrDisplayName: "Display Name",
  nostrBio: "Bio",
  nostrAvatarUrl: "Avatar URL",
  nostrBannerUrl: "Banner URL",
  nostrWebsite: "Website",
  nostrNip05: "NIP-05 Identifier",
  nostrLud16: "Lightning Address",
  nostrSavePublish: "Save & Publish",
  nostrImportRelays: "Import from Relays",
  nostrHideAdvanced: "Hide Advanced",
  nostrShowAdvanced: "Show Advanced",
  nostrUnsavedChanges: "You have unsaved changes",
  nostrProfilePreview: "Profile picture preview",
  nostrAdvanced: "Advanced",
  nostrImporting: "Importing…",
  nostrNoProfileSet: 'No profile set. Click "Edit Profile" to add your name, bio, and avatar.',
  nostrProfile: "Profile",
  nostrAbout: "About",
  nostrName: "Name",
  instancesTitle: "Connected Instances",
  instancesSub: "Presence beacons from the gateway and clients.",
  instancesNoReported: "No instances reported yet.",
  instancesUnknownHost: "unknown host",
  instancesLastInput: "Last input",
  instancesReason: "Reason",
  instancesScopes: "scopes",
  sessionsTitle: "Sessions",
  sessionsSub: "Active session keys and per-session overrides.",
  sessionsActiveWithin: "Active within (minutes)",
  sessionsLimit: "Limit",
  sessionsIncludeGlobal: "Include global",
  sessionsIncludeUnknown: "Include unknown",
  sessionsStore: "Store",
  sessionsKey: "Key",
  sessionsLabel: "Label",
  sessionsKind: "Kind",
  sessionsUpdated: "Updated",
  sessionsTokens: "Tokens",
  sessionsThinking: "Thinking",
  sessionsVerbose: "Verbose",
  sessionsReasoning: "Reasoning",
  sessionsActions: "Actions",
  sessionsNoFound: "No sessions found.",
  usageNoTimeline: "No timeline data yet.",
  usageNoData: "No data",
  usageHours: "Hours",
  usageMidnight: "Midnight",
  usage4am: "4am",
  usage8am: "8am",
  usageNoon: "Noon",
  usage4pm: "4pm",
  usage8pm: "8pm",
  usageDailyToken: "Daily Token Usage",
  usageDailyCost: "Daily Cost Usage",
  usageOutput: "Output",
  usageInput: "Input",
  usageCacheWrite: "Cache Write",
  usageCacheRead: "Cache Read",
  usageClearFilters: "Clear filters",
  usageRemoveFilter: "Remove filter",
  usageDays: "Days",
  usageHoursLabel: "Hours",
  usageSession: "Session",
  usageFiltered: "filtered",
  usageVisible: "visible",
  usageExport: "Export",
  usageActivityByTime: "Activity by Time",
  usageMosaicSubNoData: "Estimates require session timestamps.",
  usageTokensUnit: "tokens",
  usageTimeZoneLocal: "Local",
  usageTimeZoneUtc: "UTC",
  usageDayOfWeek: "Day of Week",
  usageDailyUsage: "Daily Usage",
  usageTotal: "Total",
  usageByType: "By Type",
  usageTokensByType: "Tokens by Type",
  usageCostByType: "Cost by Type",
  usageTotalLabel: "Total",
  usageOverview: "Usage Overview",
  usageMessages: "Messages",
  usageToolCalls: "Tool Calls",
  usageErrors: "Errors",
  usageAvgTokensMsg: "Avg Tokens / Msg",
  usageAvgCostMsg: "Avg Cost / Msg",
  usageSessionsCard: "Sessions",
  usageThroughput: "Throughput",
  usageErrorRate: "Error Rate",
  usageCacheHitRate: "Cache Hit Rate",
  usageMessagesHint: "Total user + assistant messages in range.",
  usageToolCallsHint: "Total tool call count across sessions.",
  usageErrorsHint: "Total message/tool errors in range.",
  usageAvgTokensMsgHint: "Average tokens per message in this range.",
  usageSessionsHint: "Distinct sessions in the range.",
  usageThroughputHint: "Throughput shows tokens per minute over active time. Higher is better.",
  usageErrorRateHint: "Error rate = errors / total messages. Lower is better.",
  usageCacheHitRateHint: "Cache hit rate = cache read / (input + cache read). Higher is better.",
  usageTopModels: "Top Models",
  usageTopProviders: "Top Providers",
  usageTopTools: "Top Tools",
  usageTopAgents: "Top Agents",
  usageTopChannels: "Top Channels",
  usagePeakErrorDays: "Peak Error Days",
  usagePeakErrorHours: "Peak Error Hours",
  usageNoModelData: "No model data",
  usageNoProviderData: "No provider data",
  usageNoToolCalls: "No tool calls",
  usageNoAgentData: "No agent data",
  usageNoChannelData: "No channel data",
  usageNoErrorData: "No error data",
  usageShown: "shown",
  usageTotalSessions: "total",
  usageAvg: "avg",
  usageAll: "All",
  usageRecentlyViewed: "Recently viewed",
  usageSort: "Sort",
  usageCost: "Cost",
  usageErrorsCol: "Errors",
  usageMessagesCol: "Messages",
  usageRecent: "Recent",
  usageTokensCol: "Tokens",
  usageDescending: "Descending",
  usageAscending: "Ascending",
  usageClearSelection: "Clear Selection",
  usageNoRecentSessions: "No recent sessions",
  usageNoSessionsInRange: "No sessions in range",
  usageCopy: "Copy",
  usageCopySessionName: "Copy session name",
  usageSelectedCount: "Selected",
  usageMoreSessions: "more",
  usageUserAssistant: "user · assistant",
  usageToolsUsed: "tools used",
  usageToolResults: "tool results",
  usageAcrossMessages: "Across messages",
  usageInRange: "in range",
  usageCached: "cached",
  usagePrompt: "prompt",
  usageCacheHint: "Cache hit rate = cache read / (input + cache read). Higher is better.",
  usageErrorHint: "Error rate = errors / total messages. Lower is better.",
  usageTokensHint: "Average tokens per message in this range.",
  usageCostHint: "Average cost per message when providers report costs.",
  usageCostHintMissing:
    "Average cost per message when providers report costs. Cost data is missing for some or all sessions in this range.",
  usageModelMix: "Model Mix",
  usageDuration: "Duration",
  usageCloseSessionDetails: "Close session details",
  usageLoading: "Loading…",
  usageNoTimelineData: "No timeline data",
  usageNoDataInRange: "No data in range",
  usageUsageOverTime: "Usage Over Time",
  usagePerTurn: "Per Turn",
  usageCumulative: "Cumulative",
  usageNoContextData: "No context data",
  usageSystemPromptBreakdown: "System Prompt Breakdown",
  usageExpandAll: "Expand all",
  usageCollapseAll: "Collapse All",
  usageBaseContextPerMessage: "Base context per message",
  usageSys: "Sys",
  usageSkills: "Skills",
  usageToolsLabel: "Tools",
  usageFiles: "Files",
  usageConversation: "Conversation",
  usageNoMessages: "No messages",
  usageSearchConversation: "Search conversation",
  usageClear: "Clear",
  usageHasTools: "Has tools",
  usageUser: "User",
  usageAssistant: "Assistant",
  usageTool: "Tool",
  usageToolResult: "Tool result",
  usageMessagesCount: "messages",
  usageNoMessagesMatchFilters: "No messages match the filters.",
  usageTokenUsage: "Token Usage",
  usageToday: "Today",
  usage7d: "7d",
  usage30d: "30d",
  usageExportSessionsCsv: "Sessions (CSV)",
  usageExportDailyCsv: "Daily (CSV)",
  usageSessionsCount: "sessions",
  usageQueryHintMatch: "{count} of {total} sessions match",
  usageQueryHintInRange: "{total} sessions in range",
  usagePageSubtitle: "See where tokens go, when sessions spike, and what drives cost.",
  usageCalls: "calls",
  cronScheduler: "Scheduler",
  cronSchedulerSub: "Gateway-owned cron scheduler status.",
  cronEnabled: "Enabled",
  cronJobs: "Jobs",
  cronNewJob: "New Job",
  cronNewJobSub: "Create a scheduled wakeup or agent run.",
  cronName: "Name",
  cronDescription: "Description",
  cronAgentId: "Agent ID",
  cronSchedule: "Schedule",
  cronEvery: "Every",
  cronAt: "At",
  cronCron: "Cron",
  cronSession: "Session",
  cronMain: "Main",
  cronIsolated: "Isolated",
  cronWakeMode: "Wake mode",
  cronNextHeartbeat: "Next heartbeat",
  cronNow: "Now",
  cronPayload: "Payload",
  cronSystemEvent: "System event",
  cronAgentTurn: "Agent turn",
  cronSystemText: "System text",
  cronAgentMessage: "Agent message",
  cronDelivery: "Delivery",
  cronAnnounceSummary: "Announce summary (default)",
  cronNoneInternal: "None (internal)",
  cronChannel: "Channel",
  cronTo: "To",
  cronToPlaceholder: "Chat/User ID (e.g. oc_xxx, ou_xxx for Feishu)",
  cronToHint: "Enter the platform's original chat/user ID, not session key.",
  cronToTooltip: "Platform chat/user ID examples:\n• Feishu: oc_xxx (group), ou_xxx (user)\n• DingTalk: group chat ID or user ID\n• WeChat: group chat ID or wxid_xxx\n• QQ Bot: QQ number\n\nDo NOT use session key (e.g. agent:main:channel:...).",
  cronAddJob: "Add job",
  cronJobsTitle: "Jobs",
  cronJobsSub: "All scheduled jobs stored in the gateway.",
  cronNoJobsYet: "No jobs yet.",
  cronRunHistory: "Run history",
  cronRunHistorySub: "Latest runs for",
  cronSelectJob: "(select a job)",
  cronNoRunsYet: "No runs yet.",
  cronSelectJobToInspect: "Select a job to inspect run history.",
  cronRunAt: "Run at",
  cronUnit: "Unit",
  cronMinutes: "Minutes",
  cronHours: "Hours",
  cronDays: "Days",
  cronExpression: "Expression",
  cronTimeoutSeconds: "Timeout (seconds)",
  cronLast: "last",
  agentsFiles: "Files",
  agentsRuntime: "Runtime",
  agentsWeb: "Web",
  agentsMemory: "Memory",
  agentsSessions: "Sessions",
  agentsUi: "UI",
  agentsMessaging: "Messaging",
  agentsAutomation: "Automation",
  agentsReadFile: "Read file contents",
  agentsWriteFile: "Create or overwrite files",
  agentsEdit: "Make precise edits",
  agentsApplyPatch: "Patch files (OpenAI)",
  agentsExec: "Run shell commands",
  agentsProcess: "Manage background processes",
  agentsWebSearch: "Search the web",
  agentsWebFetch: "Fetch web content",
  agentsMemorySearch: "Semantic search",
  agentsMemoryGet: "Read memory files",
  agentsSessionsList: "List sessions",
  agentsSessionsHistory: "Session history",
  agentsSessionsSend: "Send to session",
  agentsSessionsSpawn: "Spawn sub-agent",
  agentsSessionStatus: "Session status",
  agentsBrowser: "Control web browser",
  agentsCanvas: "Control canvases",
  agentsMessage: "Send messages",
  agentsScheduleTasks: "Schedule tasks",
  agentsGatewayControl: "Gateway control",
  agentsNodesDevices: "Nodes + devices",
  agentsListAgents: "List agents",
  agentsImageUnderstanding: "Image understanding",
  agentsNodes: "Nodes",
  agentsAgents: "Agents",
  agentsMedia: "Media",
  agentsTitle: "Agents",
  agentsConfigured: "configured.",
  agentsNoFound: "No agents found.",
  agentsSelectAgent: "Select an agent",
  agentsSelectAgentSub: "Pick an agent to inspect its workspace and tools.",
  agentsWorkspaceRouting: "Agent workspace and routing.",
  agentsProfileMinimal: "Minimal",
  agentsProfileCoding: "Coding",
  agentsProfileMessaging: "Messaging",
  agentsProfileFull: "Full",
  agentsDefault: "default",
  agentsSelected: "selected",
  agentsAllSkills: "all skills",
  agentsCurrentModel: "Current",
  agentsInheritDefault: "Inherit default",
  agentsOverview: "Overview",
  agentsOverviewSub: "Workspace paths and identity metadata.",
  agentsWorkspace: "Workspace",
  agentsPrimaryModel: "Primary Model",
  agentsIdentityName: "Identity Name",
  agentsDefaultLabel: "Default",
  agentsIdentityEmoji: "Identity Emoji",
  agentsSkillsFilter: "Skills Filter",
  agentsModelSelection: "Model Selection",
  agentsPrimaryModelLabel: "Primary model",
  agentsPrimaryModelDefault: "(default)",
  agentsFallbacksLabel: "Fallbacks (comma-separated)",
  agentsReloadConfig: "Reload Config",
  agentsAgentContext: "Agent Context",
  agentsContextWorkspaceIdentity: "Workspace, identity, and model configuration.",
  agentsContextWorkspaceScheduling: "Workspace and scheduling targets.",
  agentsChannels: "Channels",
  agentsChannelsSub: "Gateway-wide channel status snapshot.",
  agentsLoadChannels: "Load channels to see live status.",
  agentsNoChannels: "No channels found.",
  agentsConnected: "connected",
  agentsConfiguredLabel: "configured",
  agentsEnabled: "enabled",
  agentsDisabled: "disabled",
  agentsNoAccounts: "no accounts",
  agentsNotConfigured: "not configured",
  agentsScheduler: "Scheduler",
  agentsSchedulerSub: "Gateway cron status.",
  agentsNextWake: "Next wake",
  agentsCronJobs: "Agent Cron Jobs",
  agentsCronJobsSub: "Scheduled jobs targeting this agent.",
  agentsNoJobsAssigned: "No jobs assigned.",
  agentsCoreFiles: "Core Files",
  agentsCoreFilesSub: "Bootstrap persona, identity, and tool guidance.",
  agentsLoadWorkspaceFiles: "Load the agent workspace files to edit core instructions.",
  agentsNoFilesFound: "No files found.",
  agentsSelectFileToEdit: "Select a file to edit.",
  agentsReset: "Reset",
  agentsFileMissingCreate: "This file is missing. Saving will create it in the agent workspace.",
  agentsUnavailable: "Unavailable",
  agentsTabOverview: "Overview",
  agentsTabFiles: "Files",
  agentsTabTools: "Tools",
  agentsTabSkills: "Skills",
  agentsTabChannels: "Channels",
  agentsTabCron: "Cron Jobs",
  agentsFallback: "fallback",
  agentsNever: "never",
  agentsLastRefresh: "Last refresh",
  agentsSkillsPanelSub: "Per-agent skill allowlist and workspace skills.",
  agentsUseAll: "Use All",
  agentsDisableAll: "Disable All",
  agentsLoadConfigForSkills: "Load the gateway config to set per-agent skills.",
  agentsCustomAllowlist: "This agent uses a custom skill allowlist.",
  agentsAllSkillsEnabled:
    "All skills are enabled. Disabling any skill will create a per-agent allowlist.",
  agentsLoadSkillsForAgent: "Load skills for this agent to view workspace-specific entries.",
  agentsFilter: "Filter",
  agentsNoSkillsFound: "No skills found.",
  agentsToolsGlobalAllow:
    "Global tools.allow is set. Agent overrides cannot enable tools that are globally blocked.",
  agentsProfile: "Profile",
  agentsSource: "Source",
  agentsStatus: "Status",
  agentsUnsaved: "unsaved",
  agentsQuickPresets: "Quick Presets",
  agentsInherit: "Inherit",
  agentsToolsTitle: "Tools",
  agentsToolsSub: "Per-agent tool profile and overrides.",
  agentsToolAccess: "Tool Access",
  agentsToolsSubText: "Profile + per-tool overrides for this agent.",
  agentsLoadConfigForTools: "Load the gateway config to adjust tool profiles.",
  agentsExplicitAllowlist:
    "This agent is using an explicit allowlist in config. Tool overrides are managed in the Config tab.",
  agentsEnableAll: "Enable All",
  agentsEnabledCount: "enabled.",
  skillsTitle: "Skills",
  skillsSub: "Bundled, managed, and workspace skills.",
  skillsSearchPlaceholder: "Search skills",
  skillsShown: "shown",
  skillsWorkspace: "Workspace Skills",
  skillsBuiltIn: "Built-in Skills",
  skillsInstalled: "Installed Skills",
  skillsExtra: "Extra Skills",
  skillsOther: "Other Skills",
  skillsAdd: "Add",
  skillsAddSkill: "Add Skill",
  skillsUploadName: "Skill name",
  skillsUploadNamePlaceholder: "e.g. my-skill",
  skillsUploadFile: "File",
  skillsUploadFileHint: "SKILL.md or .zip containing SKILL.md",
  skillsUploadSingleHint: "Single file must be SKILL.md",
  skillsUploadZipHint: "Zip must contain SKILL.md",
  skillsUploadSubmit: "Upload",
  skillsUploadSuccess: "Skill uploaded successfully",
  skillsDelete: "Delete",
  skillsDeleteConfirm: "Delete this skill?",
  skillsSource: "Source",
  skillsPath: "Path",
  skillsNoDoc: "No documentation available.",
  skillsEligible: "Eligible",
  skillsDisabled: "Disabled",
  skillsRequiresBins: "Requires bins",
  skillsRequiresEnv: "Requires env",
  skillsRequiresConfig: "Requires config",
  skillsMissing: "Missing",
  nodesTitle: "Nodes",
  nodesSub: "Paired devices and live links.",
  nodesNoFound: "No nodes found.",
  nodesDevices: "Devices",
  nodesDevicesSub: "Pairing requests + role tokens.",
  nodesPending: "Pending",
  nodesPaired: "Paired",
  nodesNoPairedDevices: "No paired devices.",
  nodesRoleLabel: "role: ",
  nodesRoleNone: "role: -",
  nodesRepairSuffix: " · repair",
  nodesRequested: "requested ",
  nodesApprove: "Approve",
  nodesReject: "Reject",
  nodesRolesLabel: "roles: ",
  nodesScopesLabel: "scopes: ",
  nodesTokensNone: "Tokens: none",
  nodesTokens: "Tokens",
  nodesTokenRevoked: "revoked",
  nodesTokenActive: "active",
  nodesRotate: "Rotate",
  nodesRevoke: "Revoke",
  nodesBindingTitle: "Exec node binding",
  nodesBindingSub: "Pin agents to a specific node when using ",
  nodesBindingFormModeHint: "Switch the Config tab to Form mode to edit bindings here.",
  nodesLoadConfigHint: "Load config to edit bindings.",
  nodesLoadConfig: "Load config",
  nodesDefaultBinding: "Default binding",
  nodesDefaultBindingSub: "Used when agents do not override a node binding.",
  nodesNodeLabel: "Node",
  nodesAnyNode: "Any node",
  nodesNoNodesSystemRun: "No nodes with system.run available.",
  nodesNoAgentsFound: "No agents found.",
  nodesExecApprovalsTitle: "Exec approvals",
  nodesExecApprovalsSub: "Allowlist and approval policy for exec host=gateway/node.",
  nodesLoadExecApprovalsHint: "Load exec approvals to edit allowlists.",
  nodesLoadApprovals: "Load approvals",
  nodesTarget: "Target",
  nodesTargetSub: "Gateway edits local approvals; node edits the selected node.",
  nodesHost: "Host",
  nodesHostGateway: "Gateway",
  nodesHostNode: "Node",
  nodesSelectNode: "Select node",
  nodesNoNodesExecApprovals: "No nodes advertise exec approvals yet.",
  nodesScope: "Scope",
  nodesDefaults: "Defaults",
  nodesSecurity: "Security",
  nodesSecurityDefaultSub: "Default security mode.",
  nodesSecurityAgentSubPrefix: "Default: ",
  nodesMode: "Mode",
  nodesUseDefaultPrefix: "Use default (",
  nodesUseDefaultButton: "Use default",
  nodesSecurityDeny: "Deny",
  nodesSecurityAllowlist: "Allowlist",
  nodesSecurityFull: "Full",
  nodesAsk: "Ask",
  nodesAskDefaultSub: "Default prompt policy.",
  nodesAskAgentSubPrefix: "Default: ",
  nodesAskOff: "Off",
  nodesAskOnMiss: "On miss",
  nodesAskAlways: "Always",
  nodesAskFallback: "Ask fallback",
  nodesAskFallbackDefaultSub: "Applied when the UI prompt is unavailable.",
  nodesAskFallbackAgentSubPrefix: "Default: ",
  nodesFallback: "Fallback",
  nodesAutoAllowSkills: "Auto-allow skill CLIs",
  nodesAutoAllowSkillsDefaultSub: "Allow skill executables listed by the Gateway.",
  nodesAutoAllowSkillsUsingDefault: "Using default (",
  nodesAutoAllowSkillsOverride: "Override (",
  nodesEnabled: "Enabled",
  nodesAllowlist: "Allowlist",
  nodesAllowlistSub: "Case-insensitive glob patterns.",
  nodesAddPattern: "Add pattern",
  nodesNoAllowlistEntries: "No allowlist entries yet.",
  nodesNewPattern: "New pattern",
  nodesLastUsedPrefix: "Last used: ",
  nodesPattern: "Pattern",
  nodesRemove: "Remove",
  nodesDefaultAgent: "default agent",
  nodesAgent: "agent",
  nodesUsesDefault: "uses default (",
  nodesOverride: "override: ",
  nodesBinding: "Binding",
  nodesChipPaired: "paired",
  nodesChipUnpaired: "unpaired",
  nodesConnected: "connected",
  nodesOffline: "offline",
  nodesNever: "never",
  configEnv: "Environment",
  configUpdate: "Updates",
  configAgents: "Agents",
  configAuth: "Authentication",
  configChannels: "Channels",
  configMessages: "Messages",
  configCommands: "Commands",
  configHooks: "Hooks",
  configSkills: "Skills",
  configTools: "Tools",
  configGateway: "Gateway",
  configWizard: "Setup Wizard",
  configMeta: "Metadata",
  configLogging: "Logging",
  configBrowser: "Browser",
  configUi: "UI",
  configModels: "Models",
  configBindings: "Bindings",
  configBroadcast: "Broadcast",
  configAudio: "Audio",
  configSession: "Session",
  configCron: "Cron",
  configWeb: "Web",
  configDiscovery: "Discovery",
  configCanvasHost: "Canvas Host",
  configTalk: "Talk",
  configPlugins: "Plugins",
  configEnvVars: "Environment Variables",
  configEnvVarsDesc: "Environment variables passed to the gateway process",
  configUpdatesDesc: "Auto-update settings and release channel",
  configAgentsDesc: "Agent configurations, models, and identities",
  configAuthDesc: "API keys and authentication profiles",
  configChannelsDesc: "Messaging channels (Telegram, Discord, Slack, etc.)",
  configMessagesDesc: "Message handling and routing settings",
  configCommandsDesc: "Custom slash commands",
  configHooksDesc: "Webhooks and event hooks",
  configSkillsDesc: "Skill packs and capabilities",
  configToolsDesc: "Tool configurations (browser, search, etc.)",
  configGatewayDesc: "Gateway server settings (port, auth, binding)",
  configWizardDesc: "Setup wizard state and history",
  configMetaDesc: "Gateway metadata and version information",
  configLoggingDesc: "Log levels and output configuration",
  configBrowserDesc: "Browser automation settings",
  configUiDesc: "User interface preferences",
  configModelsDesc: "AI model configurations and providers",
  configBindingsDesc: "Key bindings and shortcuts",
  configBroadcastDesc: "Broadcast and notification settings",
  configAudioDesc: "Audio input/output settings",
  configSessionDesc: "Session management and persistence",
  configCronDesc: "Scheduled tasks and automation",
  configWebDesc: "Web server and API settings",
  configDiscoveryDesc: "Service discovery and networking",
  configCanvasHostDesc: "Canvas rendering and display",
  configTalkDesc: "Voice and speech settings",
  configPluginsDesc: "Plugin management and extensions",
  configSettingsTitle: "Settings",
  configSearchPlaceholder: "Search settings…",
  configAllSettings: "All Settings",
  configForm: "Form",
  configRaw: "Raw",
  configUnsavedChanges: "Unsaved changes",
  configUnsavedChangesLabel: "unsaved changes",
  configOneUnsavedChange: "1 unsaved change",
  configNoChanges: "No changes",
  configApplying: "Applying…",
  configApply: "Apply",
  configUpdating: "Updating…",
  configUpdateButton: "Update",
  configViewPrefix: "View ",
  configPendingChange: "pending change",
  configPendingChanges: "pending changes",
  configLoadingSchema: "Loading schema…",
  configFormUnsafeWarning:
    "Form view can't safely edit some fields. Use Raw to avoid losing config entries.",
  configRawJson5: "Raw JSON5",
  configValidityValid: "valid",
  configValidityInvalid: "invalid",
  configValidityUnknown: "unknown",
  configSchemaUnavailable: "Schema unavailable.",
  configUnsupportedSchema: "Unsupported schema. Use Raw.",
  configNoSettingsMatchPrefix: 'No settings match "',
  configNoSettingsMatchSuffix: '"',
  configNoSettingsInSection: "No settings in this section",
  configUnsupportedSchemaNode: "Unsupported schema node. Use Raw mode.",
  configSubnavAll: "All",
  envVarsSection: "Vars (env.vars)",
  envModelEnvSection: "Model Env (env.modelEnv)",
  envShellEnvSection: "Shell Env (env.shellEnv)",
  envVarsKey: "Key",
  envVarsValue: "Value",
  envVarsAdd: "Add",
  envVarsDelete: "Delete",
  envVarsSave: "Save",
  envVarsEmpty: "No environment variables. Click Add to create one.",
  envVarsKeyPlaceholder: "e.g. API_KEY",
  envVarsValuePlaceholder: "e.g. your-secret-value",
  debugSnapshots: "Snapshots",
  debugSnapshotsSub: "Status, health, and heartbeat data.",
  debugStatus: "Status",
  debugHealth: "Health",
  debugLastHeartbeat: "Last heartbeat",
  debugSecurityAudit: "Security audit",
  debugManualRpc: "Manual RPC",
  debugManualRpcSub: "Send a raw gateway method with JSON params.",
  debugMethod: "Method",
  debugParams: "Params",
  debugCall: "Call",
  debugCritical: "critical",
  debugWarnings: "warnings",
  debugNoCritical: "No critical issues",
  debugInfo: "info",
  debugSecurityAuditDetails: "Run openclaw security audit --deep for details.",
  debugModels: "Models",
  debugModelsSub: "Catalog from models.list.",
  debugEventLog: "Event Log",
  debugEventLogSub: "Latest gateway events.",
  debugNoEvents: "No events yet.",
  logsTitle: "Logs",
  logsSub: "Gateway file logs (JSONL).",
  logsExportFiltered: "Export filtered",
  logsExportVisible: "Export visible",
};

const ZH: Strings = {
  tabGroupChat: "聊天",
  tabGroupControl: "控制",
  tabGroupAgent: "Agent",
  tabGroupSettings: "设置",
  subtitleAgents: "管理代理工作区、工具与身份。",
  subtitleOverview: "网关状态、入口与健康概览。",
  subtitleChannels: "管理通道与设置。",
  subtitleInstances: "已连接客户端与节点的在线状态。",
  subtitleSessions: "查看活跃会话并调整每会话默认值。",
  subtitleUsage: "",
  subtitleCron: "安排唤醒与定时代理任务。",
  subtitleSkills: "管理技能可用性与 API 密钥注入。",
  subtitleMcp: "配置 MCP 服务器与工具。",
  subtitleNodes: "已配对设备、能力与命令。",
  subtitleChat: "直接与网关聊天进行快速操作。",
  subtitleDigitalEmployee: "按业务场景切换数字员工模版，一键开启新会话。",
  subtitleAgentSwarm: "多Agent集群协作，面向运维与 SRE。",
  subtitleConfig: "安全编辑 ~/.openocta/openocta.json。",
  subtitleEnvVars: "Key-Value 环境变量，保存至 ~/.openocta/openocta.json 的 env.vars。",
  subtitleModels: "配置模型厂商与 API 密钥。",
  subtitleDebug: "网关快照、事件与手动 RPC 调用。",
  subtitleLogs: "网关日志实时查看。",
  subtitleLlmTrace: "查看会话的 LLM trace 详情。",
  subtitleSandbox: "Sandbox、命令校验与审批队列。",
  subtitleApprovals: "命令审批队列；按会话批准或拒绝。",
  navTitleAgents: "代理",
  navTitleOverview: "概览",
  navTitleChannels: "通道",
  navTitleInstances: "实例",
  navTitleSessions: "会话",
  navTitleUsage: "用量",
  navTitleCron: "定时任务",
  navTitleSkills: "技能",
  navTitleMcp: "MCP",
  navTitleNodes: "节点",
  navTitleChat: "聊天",
  navTitleDigitalEmployee: "数字员工",
  navTitleAgentSwarm: "Agent Swarm",
  agentSwarmDevBadge: "开发中",
  navTitleConfig: "配置",
  navTitleEnvVars: "环境变量",
  navTitleModels: "模型",
  navTitleDebug: "测试",
  navTitleLogs: "日志",
  navTitleLlmTrace: "LLM Trace",
  navTitleSandbox: "安全策略",
  navTitleApprovals: "审批队列",
  navTitleControl: "控制",
  overviewGatewayAccess: "网关访问",
  overviewGatewayAccessSub: "控制台连接地址与认证方式。",
  overviewWebSocketUrl: "WebSocket 地址",
  overviewGatewayHost: "后端地址 (IP:端口)",
  overviewGatewayToken: "网关令牌 (访问远程需从openocta.json中获取)",
  overviewPassword: "密码（不保存）",
  overviewDefaultSessionKey: "默认会话 Key",
  overviewConnect: "连接",
  overviewRefresh: "刷新",
  overviewConnectHint: "点击连接以应用连接变更。",
  overviewSnapshot: "快照",
  overviewSnapshotSub: "最近一次网关握手信息。",
  overviewStatus: "状态",
  overviewConnected: "已连接",
  overviewDisconnected: "未连接",
  overviewUptime: "运行时长",
  overviewTickInterval: "心跳间隔",
  overviewLastChannelsRefresh: "最近通道刷新",
  overviewChannelsHint: "",
  overviewInstances: "实例",
  overviewInstancesSub: "过去 5 分钟内的在线实例数。",
  overviewSessions: "会话",
  overviewSessionsSub: "网关跟踪的最近会话 Key。",
  overviewCron: "定时任务",
  overviewCronNext: "下次执行",
  overviewCronEnabled: "已启用",
  overviewCronDisabled: "已禁用",
  overviewNotes: "说明",
  overviewNotesSub: "远程控制相关简要提示。",
  overviewNoteTailscale: "Tailscale serve",
  overviewNoteTailscaleSub: "建议使用 serve 模式，使网关仅监听本机并由 tailnet 认证。",
  overviewNoteSessionHygiene: "会话清理",
  overviewNoteSessionHygieneSub: "使用 /new 或 sessions.patch 重置上下文。",
  overviewNoteCron: "定时提醒",
  overviewNoteCronSub: "定时任务请使用独立会话。",
  commonLoading: "加载中…",
  commonRefresh: "刷新",
  commonRefreshing: "刷新中…",
  commonSaving: "保存中…",
  commonDelete: "删除",
  commonFilter: "筛选",
  commonOptional: "（可选）",
  commonInherit: "继承",
  commonOffExplicit: "关闭（显式）",
  commonNA: "无",
  commonYes: "是",
  commonNo: "否",
  chatQueueRemoveConfirm: "确定移除此排队消息？",
  cronDeleteConfirm: "确定删除此定时任务？",
  employeeDeleteConfirm: "确定删除此数字员工？",
  channelsConfigure: "配置",
  mcpAddServer: "新增",
  mcpServerName: "服务器名称",
  mcpNoServers: "暂无 MCP 服务器配置。",
  mcpEnabled: "已启用",
  mcpEnabledField: "启用",
  mcpDisabled: "已禁用",
  mcpFormMode: "表单",
  mcpRawMode: "原始 JSON",
  mcpCommand: "命令",
  mcpArgs: "参数",
  mcpUrl: "URL",
  mcpService: "服务",
  mcpServiceUrl: "服务 URL",
  mcpToolPrefix: "工具前缀",
  mcpRawJson: "原始 JSON",
  mcpDeleteConfirm: "确定删除此 MCP 服务器？",
  mcpConnectionTypeStdio: "命令行 (stdio)",
  mcpConnectionTypeUrl: "URL",
  mcpConnectionTypeService: "服务",
  mcpEnv: "环境变量",
  mcpEnvPlaceholder: "KEY=value 或 $ENV_VAR，每行一个",
  mcpViewList: "列表",
  mcpViewCard: "卡片",
  mcpTableName: "名称",
  mcpTableType: "连接类型",
  mcpTableStatus: "状态",
  mcpTableActions: "操作",
  llmTraceSearch: "搜索",
  llmTraceSearchPlaceholder: "按 session key 筛选…",
  llmTraceEnabled: "已开启",
  llmTraceDisabled: "已关闭",
  llmTraceActionEnable: "开启",
  llmTraceActionDisable: "关闭",
  llmTraceToggleTooltip:
    "开启后，再进行会话会记录模型调用Trace详情，可能会有性能影响。关闭后，不再记录新的模型会话Trace详情。",
  llmTraceModeActive: "活跃",
  llmTraceModeAll: "全部",
  llmTraceSessionKey: "Session Key",
  llmTraceSessionId: "Session ID",
  llmTraceUpdatedAt: "更新时间",
  llmTraceFile: "文件",
  llmTraceFileSize: "大小",
  llmTraceView: "查看",
  llmTraceBack: "返回",
  llmTraceDownload: "下载",
  llmTraceNoEntries: "暂无 trace 记录。",
  sandboxEnabled: "已开启",
  sandboxDisabled: "已关闭",
  sandboxActionEnable: "开启",
  sandboxActionDisable: "关闭",
  sandboxAllowedPaths: "允许路径",
  sandboxNetworkAllow: "网络白名单",
  sandboxHooks: "安全钩子",
  sandboxHookBeforeAgent: "BeforeAgent",
  sandboxHookBeforeModel: "BeforeModel",
  sandboxHookAfterModel: "AfterModel",
  sandboxHookBeforeTool: "BeforeTool",
  sandboxHookAfterTool: "AfterTool",
  sandboxHookAfterAgent: "AfterAgent",
  sandboxHookDescBeforeAgent: "请求验证：拦截会话滥用（DoS）、过长提示、恶意 IP",
  sandboxHookDescBeforeModel: "Prompt安全：提示注入、敏感数据泄露、控制字符",
  sandboxHookDescAfterModel: "输出评测：危险命令、秘密泄露、恶意网址",
  sandboxHookDescBeforeTool: "权限校验：工具权限、参数校验、路径校验",
  sandboxHookDescAfterTool: "结果审查：秘密泄露、错误脱敏、输出截断",
  sandboxHookDescAfterAgent: "审计日志、合规检查",
  sandboxValidator: "命令校验",
  sandboxResourceLimit: "资源限制",
  sandboxMaxCPUPercent: "最大 CPU 利用率 (%)",
  sandboxMaxMemoryBytes: "最大内存 (Bytes)",
  sandboxMaxDiskBytes: "最大磁盘 (Bytes)",
  sandboxSecretPatterns: "脱敏正则检测",
  sandboxSecretPatternsHint: "每行一个正则。系统内置模式（API Key、令牌等）会一并生效。",
  sandboxBanCommands: "禁止命令",
  sandboxBanArguments: "禁止参数",
  sandboxBanFragments: "关键词熔断",
  sandboxSectionConfig: "沙箱配置",
  sandboxSectionApprovals: "审批队列",
  securitySectionSandbox: "环境边界",
  securitySectionValidator: "命令校验",
  securitySectionApprovalQueue: "审批队列",
  securitySectionSandboxDesc: "自定义约束文件系统/网络访问边界，并可配置资源限制。为安全，即使关闭也会提供一个默认的 sandbox，指定默认目录和危险命令校验。",
  securitySectionValidatorDesc: "对命令进行校验：禁止命令/参数/片段与长度限制。",
  securitySectionApprovalQueueDesc: "对敏感工具调用进行人工审批，支持按会话 TTL 免审白名单。",
  securityApprovalQueueEnabled: "启用审批队列",
  securityApprovalTimeoutSeconds: "许可过期时间（秒）",
  securityApprovalTimeoutSecondsHint: "待审批请求超过该时长视为过期。",
  securityApprovalAllow: "自动允许命令",
  securityApprovalAllowHint: "无需审批直接执行的命令（每行一个）。支持 glob 模式，如 'ls'、'pwd'、'echo *'。",
  securityApprovalAsk: "需要审批的命令",
  securityApprovalAskHint: "需要人工审批的命令（每行一个）。支持 glob 模式，如 'rm'、'mv *'、'cp *'。",
  securityApprovalDeny: "禁止执行的命令",
  securityApprovalDenyHint: "始终禁止执行的命令（每行一个）。支持 glob 模式，如 'sudo'、'dd'、'mkfs *'。",
  securityApprovalBlockOnApproval: "阻塞等待审批",
  securityApprovalBlockOnApprovalHint: "开启后，页面对话会被阻塞，只有审批通过后才能继续对话。关闭后，直接报错结束对话，Agent 可提示用户有命令需要审批。",
  approvalsList: "审批队列",
  approvalsId: "ID",
  approvalsSessionKey: "Session Key",
  approvalsSessionId: "Session ID",
  approvalsCommand: "命令",
  approvalsTimeout: "超时",
  approvalsTTL: "TTL",
  approvalsStatus: "状态",
  approvalsApprove: "批准",
  approvalsApproveOnce: "本次放行",
  approvalsWhitelist: "全部放行",
  approvalsWhitelistSession: "会话免审",
  approvalsDeny: "拒绝",
  approvalsExpired: "已过期",
  approvalsPending: "待审批",
  approvalsNoEntries: "暂无审批请求。",
  approvalsProcessed: "已处理",
  securityOverviewTitle: "当前状态",
  securityOverviewPreset: "预设",
  securityOverviewSandbox: "环境边界",
  securityOverviewCommandPolicy: "命令策略",
  securityOverviewPendingApprovals: "待审批",
  securityPresetsTitle: "快速预设",
  securityPresetsHint: "一键应用，覆盖当前配置。适用场景见下表。",
  securityPresetOff: "全部关闭",
  securityPresetLoose: "宽松",
  securityPresetStandard: "标准",
  securityPresetStrict: "严格",
  securityPresetOffDesc: "关闭所有安全策略：沙箱、命令策略、审批队列。仅适用于快速本地测试。",
  securityPresetLooseDesc: "沙箱开，路径/网络较宽。仅禁止极端危险命令（sudo、rm -rf、dd、mkfs）。默认放行，无审批。适用：本地开发、调试。",
  securityPresetStandardDesc: "沙箱开，路径/网络适中。禁止 + 部分需审批（rm、mv、cp）。默认需审批，审批开。适用：日常使用、预发。",
  securityPresetStrictDesc: "沙箱开，路径/网络收紧。禁止 + 大量需审批。默认拒绝，审批开且阻塞。适用：生产、合规。",
  securitySectionCommandPolicy: "命令策略",
  securitySectionCommandPolicyDesc: "统一规则：禁止 → 需审批 → 放行。未命中规则时按默认策略处理。",
  securityDefaultPolicy: "默认策略（未命中任何规则时）",
  securityDefaultDeny: "拒绝",
  securityDefaultAsk: "需审批",
  securityDefaultAllow: "放行",
  securityRulesList: "规则列表",
  securityRuleAction: "动作",
  securityRulePattern: "模式",
  securityRuleType: "类型",
  securityActionDeny: "禁止",
  securityActionAsk: "需审批",
  securityActionAllow: "放行",
  securityAddRule: "添加规则",
  securityAdvancedOptions: "高级：禁止参数、最大长度、敏感词",
  securityMaxLength: "最大命令长度",
  securityResourceCustom: "自定义",
  securityRulesHint: "每行一个模式。禁止规则：单词为命令（如 sudo），含空格为片段（如 rm -rf）。",
  securityRulesDenyHint: "始终禁止的命令/片段。单词=命令，多词=片段。",
  securityRulesAskHint: "需审批后才能执行的命令。",
  securityRulesAllowHint: "免审批直接放行的命令。",
  approvalsViewSession: "查看会话",
  approvalsSectionApproved: "已审批",
  approvalsSectionDenied: "已拒绝",
  approvalsSectionWhitelisted: "会话免审",
  approvalsExpiresIn: "剩余",
  approvalsExpiresAt: "过期时间",
  approvalsTtlPermanent: "永久",
  approvalsReason: "拒绝原因",
  modelsViewList: "列表",
  modelsViewCard: "卡片",
  modelsSearchPlaceholder: "按名称搜索…",
  modelsSearchNoMatch: "没有匹配的厂商。",
  modelsTableName: "名称",
  modelsTableModel: "默认模型",
  modelsTableBaseUrl: "Base URL",
  modelsTableActions: "操作",
  modelsAddProvider: "添加厂商",
  modelsAddCustomProvider: "添加自定义厂商",
  modelsProviderId: "厂商 ID",
  modelsProviderIdPlaceholder: "如 openai, google, anthropic",
  modelsProviderIdHint: "小写字母、数字、连字符、下划线。创建后不可修改。",
  modelsDisplayName: "展示名称",
  modelsDisplayNamePlaceholder: "如 OpenAI, Google Gemini",
  modelsDefaultBaseUrl: "默认 Base URL",
  modelsDefaultBaseUrlPlaceholder: "如 https://api.openai.com/v1",
  modelsApiKeyPrefix: "API Key 前缀（可选）",
  modelsApiKeyPrefixPlaceholder: "如 sk-",
  modelsApiType: "API 类型",
  modelsApiTypeTooltip: "OpenAI：兼容 OpenAI Chat Completions 的端点。默认会请求/v1/chat/completions。\nAnthropic：兼容 Anthropic Messages API 的端点，会进行直接请求。",
  modelsApiTypeOpenAI: "OpenAI (openai-completions)",
  modelsApiTypeAnthropic: "Anthropic (anthropic-messages)",
  modelsEnvVars: "环境变量",
  modelsAddModel: "添加模型",
  modelsModelId: "模型 ID",
  modelsModelName: "模型名称",
  modelsContextWindow: "上下文窗口（约 token 数）",
  modelsContextWindowPlaceholder: "如 262144",
  modelsContextWindowHint: "对话历史估算 token 上限，超出会丢弃较早消息。留空则使用默认（不按此项裁剪）。",
  modelsMaxTokens: "单次回复最大 token",
  modelsMaxTokensPlaceholder: "如 65536",
  modelsMaxTokensHint: "单次模型输出的最大 token。留空则使用运行时默认值。",
  modelsModelManagement: "模型管理",
  modelsNoModels: "暂无模型，点击添加模型。",
  modelsEnvVarConflict: "环境变量冲突",
  modelsNoProviders: "暂无模型厂商配置。",
  modelsModels: "模型",
  modelsBaseUrl: "Base URL",
  modelsApiKey: "API Key",
  modelsUseAsDefault: "使用",
  modelsCancelUse: "取消使用",
  modelsProviderDeleteConfirm: "确定要删除此厂商吗？此操作无法撤销。",
  modelsSelectModelToUse: "选择要使用的模型",
  modelsCurrentDefault: "当前默认",
  channelsHealth: "通道健康",
  channelsHealthSub: "网关返回的通道状态快照。",
  channelsNoSnapshot: "暂无快照。",
  channelsSchemaUnavailable: "Schema 不可用，请使用 Raw。",
  channelsConfigSchemaUnavailable: "通道配置 Schema 不可用。",
  channelsConfigSaveConfirm: "修改/新增渠道配置会导致长连接中断并重新创建，是否继续？",
  channelsRuntimeStartErrorTitle: "渠道已启用，但后台运行时启动或连接失败：",
  channelsLoadingConfigSchema: "正在加载配置 Schema…",
  commonSave: "保存",
  commonCreate: "创建",
  commonReload: "重新加载",
  commonCancel: "取消",
  nativeDialogOK: "确定",
  channelConfigured: "已配置",
  channelRunning: "运行中",
  channelLastStart: "最近启动",
  channelLastProbe: "最近探测",
  channelProbe: "探测",
  channelProbeOk: "正常",
  channelProbeFailed: "失败",
  channelLinked: "已链接",
  channelConnected: "已连接",
  channelLastConnect: "最近连接",
  channelLastMessage: "最近消息",
  channelAuthAge: "认证时长",
  channelBaseUrl: "Base URL",
  channelCredential: "凭证",
  channelAudience: "受众",
  channelMode: "模式",
  channelPublicKey: "公钥",
  channelLastInbound: "最近入站",
  channelActive: "活跃",
  channelGenericSub: "通道状态与配置。",
  channelAccounts: "账号",
  channelWhatsApp: "WhatsApp",
  channelWhatsAppSub: "链接 WhatsApp Web 并监控连接状态。",
  channelTelegram: "Telegram",
  channelTelegramSub: "机器人状态与通道配置。",
  channelDiscord: "Discord",
  channelDiscordSub: "机器人状态与通道配置。",
  channelGoogleChat: "Google Chat",
  channelGoogleChatSub: "Chat API Webhook 状态与通道配置。",
  channelIMessage: "iMessage",
  channelIMessageSub: "macOS 桥接状态与通道配置。",
  channelSignal: "Signal",
  channelSignalSub: "signal-cli 状态与通道配置。",
  channelSlack: "Slack",
  channelSlackSub: "Socket 模式状态与通道配置。",
  channelNostr: "Nostr",
  channelNostrSub: "通过 Nostr 中继的分布式私信（NIP-04）。",
  channelWhatsAppWorking: "处理中…",
  channelShowQr: "显示二维码",
  channelRelink: "重新链接",
  channelWaitForScan: "等待扫码",
  channelLogout: "登出",
  channelWeWork: "微信（企业智能机器人）",
  channelWeWorkSub:
    "通过企业微信智能机器人 WebSocket 长连接（aibot）收发消息。支持扫码创建或手动填写 Bot ID / Secret。",
  channelWeWorkTransport: "链路",
  channelWeWorkBotId: "Bot ID（脱敏）",
  channelWeWorkQrStart: "扫码快速创建",
  channelWeWorkQrWorking: "处理中…",
  channelWeWorkQrStartFailed: "无法开始扫码会话（缺少 scode）。",
  channelWeWorkOpenGenPage: "打开扫码页",
  channelWeWorkQrModalTitle: "企业微信智能机器人 — 扫码创建",
  channelWeWorkQrReplaceWarn:
    "当前已配置过企业微信智能机器人凭据。再次扫码创建将覆盖表单中的 Bot ID 与 Secret（保存后生效）。",
  channelWeWorkQrPreparing: "正在获取扫码会话…",
  channelWeWorkQrWaiting: "等待你在企业微信中完成创建…",
  channelWeWorkQrSuccessClosing:
    "凭据已保存，网关正在按新配置重建企业微信 WebSocket 连接。弹框即将自动关闭。",
  channelWeWorkQrSaveMissingForm: "扫码成功后无法从表单读取 channels.wework，请重试或手动保存配置。",
  channelWeWorkQrModalCancel: "取消",
  channelWeixin: "微信（个人）",
  channelWeixinSub:
    "个人微信 iLink 智能机器人通道（HTTPS 长轮询）。使用微信扫码登录；凭据为 botToken 与 botId，与企业微信的 Bot Secret 不同。",
  channelWeixinTransport: "链路",
  channelWeixinBotId: "Bot ID（脱敏）",
  channelWeixinQrStart: "扫码登录",
  channelWeixinQrWorking: "处理中…",
  channelWeixinQrStartFailed: "无法开始 iLink 扫码（缺少 qrcode）。",
  channelWeixinQrModalTitle: "个人微信 — iLink 扫码登录",
  channelWeixinQrReplaceWarn:
    "已配置过个人微信 iLink 凭据。再次扫码将覆盖表单中的 botToken 与 botId（保存后通过补丁生效）。",
  channelWeixinQrPreparing: "正在从 iLink 获取二维码…",
  channelWeixinQrWaiting: "请使用微信扫描二维码…",
  channelWeixinQrConfirmOnPhone: "已扫码 — 请在手机上确认登录…",
  channelWeixinQrScanHint: "使用微信扫一扫。登录成功后 botToken、Bot ID 将自动写入配置。",
  channelWeixinOpenScanPage: "浏览器打开扫码页",
  channelWeixinQrSuccessClosing: "凭据已保存，网关将按新配置重建 iLink 通道。弹框即将关闭。",
  channelWeixinQrSaveMissingForm: "扫码成功后无法从表单读取 channels.weixin，请重试或手动保存。",
  channelWeixinQrModalCancel: "取消",
  channelWeixinQrExpired: "二维码已失效，请关闭窗口后重新点击「扫码登录」。",
  nostrEditProfile: "编辑资料",
  nostrAccount: "账号",
  nostrUsername: "用户名",
  nostrDisplayName: "显示名称",
  nostrBio: "简介",
  nostrAvatarUrl: "头像 URL",
  nostrBannerUrl: "横幅 URL",
  nostrWebsite: "网站",
  nostrNip05: "NIP-05 标识",
  nostrLud16: "Lightning 地址",
  nostrSavePublish: "保存并发布",
  nostrImportRelays: "从中继导入",
  nostrHideAdvanced: "隐藏高级",
  nostrShowAdvanced: "显示高级",
  nostrUnsavedChanges: "您有未保存的更改",
  nostrProfilePreview: "头像预览",
  nostrAdvanced: "高级",
  nostrImporting: "导入中…",
  nostrNoProfileSet: "未设置资料。点击「编辑资料」添加姓名、简介与头像。",
  nostrProfile: "资料",
  nostrAbout: "关于",
  nostrName: "名称",
  instancesTitle: "已连接实例",
  instancesSub: "网关与客户端的在线状态。",
  instancesNoReported: "暂无实例上报。",
  instancesUnknownHost: "未知主机",
  instancesLastInput: "最近输入",
  instancesReason: "原因",
  instancesScopes: "范围",
  sessionsTitle: "会话",
  sessionsSub: "活跃会话 Key 及每会话覆盖项。",
  sessionsActiveWithin: "活跃时间（分钟）",
  sessionsLimit: "数量上限",
  sessionsIncludeGlobal: "包含全局",
  sessionsIncludeUnknown: "包含未知",
  sessionsStore: "存储",
  sessionsKey: "Key",
  sessionsLabel: "标签",
  sessionsKind: "类型",
  sessionsUpdated: "更新时间",
  sessionsTokens: "Token",
  sessionsThinking: "思考",
  sessionsVerbose: "详细",
  sessionsReasoning: "推理",
  sessionsActions: "操作",
  sessionsNoFound: "未找到会话。",
  usageNoTimeline: "暂无时间线数据。",
  usageNoData: "暂无数据",
  usageHours: "小时",
  usageMidnight: "0 点",
  usage4am: "4 点",
  usage8am: "8 点",
  usageNoon: "12 点",
  usage4pm: "16 点",
  usage8pm: "20 点",
  usageDailyToken: "每日 Token 用量",
  usageDailyCost: "每日费用",
  usageOutput: "输出",
  usageInput: "输入",
  usageCacheWrite: "缓存写入",
  usageCacheRead: "缓存读取",
  usageClearFilters: "清除筛选",
  usageRemoveFilter: "移除筛选",
  usageDays: "天",
  usageHoursLabel: "小时",
  usageSession: "会话",
  usageFiltered: "已筛选",
  usageVisible: "当前可见",
  usageExport: "导出",
  usageActivityByTime: "按时间活动",
  usageMosaicSubNoData: "估算需要会话时间戳。",
  usageTokensUnit: "tokens",
  usageTimeZoneLocal: "本地",
  usageTimeZoneUtc: "UTC",
  usageDayOfWeek: "星期",
  usageDailyUsage: "每日用量",
  usageTotal: "合计",
  usageByType: "按类型",
  usageTokensByType: "按类型 Token",
  usageCostByType: "按类型费用",
  usageTotalLabel: "合计",
  usageOverview: "用量概览",
  usageMessages: "消息数",
  usageToolCalls: "工具调用",
  usageErrors: "错误数",
  usageAvgTokensMsg: "平均 Token/条",
  usageAvgCostMsg: "平均费用/条",
  usageSessionsCard: "会话",
  usageThroughput: "吞吐",
  usageErrorRate: "错误率",
  usageCacheHitRate: "缓存命中率",
  usageMessagesHint: "范围内用户+助手消息总数。",
  usageToolCallsHint: "会话中工具调用总次数。",
  usageErrorsHint: "范围内消息/工具错误总数。",
  usageAvgTokensMsgHint: "该范围内每条消息平均 token 数。",
  usageSessionsHint: "范围内的不同会话数。",
  usageThroughputHint: "吞吐为活跃时间内每分钟 token 数，越高越好。",
  usageErrorRateHint: "错误率 = 错误数/总消息数，越低越好。",
  usageCacheHitRateHint: "缓存命中率 = 缓存读取/(输入+缓存读取)，越高越好。",
  usageTopModels: "Top 模型",
  usageTopProviders: "Top 提供商",
  usageTopTools: "Top 工具",
  usageTopAgents: "Top 代理",
  usageTopChannels: "Top 渠道",
  usagePeakErrorDays: "错误高峰日",
  usagePeakErrorHours: "错误高峰时",
  usageNoModelData: "无模型数据",
  usageNoProviderData: "无提供商数据",
  usageNoToolCalls: "无工具调用",
  usageNoAgentData: "无代理数据",
  usageNoChannelData: "无渠道数据",
  usageNoErrorData: "无错误数据",
  usageShown: "显示",
  usageTotalSessions: "总计",
  usageAvg: "平均",
  usageAll: "全部",
  usageRecentlyViewed: "最近查看",
  usageSort: "排序",
  usageCost: "费用",
  usageErrorsCol: "错误",
  usageMessagesCol: "消息",
  usageRecent: "最近",
  usageTokensCol: "Token",
  usageDescending: "降序",
  usageAscending: "升序",
  usageClearSelection: "清除选择",
  usageNoRecentSessions: "无最近会话",
  usageNoSessionsInRange: "范围内无会话",
  usageCopy: "复制",
  usageCopySessionName: "复制会话名",
  usageSelectedCount: "已选",
  usageMoreSessions: "更多",
  usageUserAssistant: "用户 · 助手",
  usageToolsUsed: "使用工具数",
  usageToolResults: "工具结果",
  usageAcrossMessages: "跨消息",
  usageInRange: "范围内",
  usageCached: "缓存",
  usagePrompt: "提示",
  usageCacheHint: "缓存命中率 = 缓存读取/(输入+缓存读取)，越高越好。",
  usageErrorHint: "错误率 = 错误数/总消息数，越低越好。",
  usageTokensHint: "该范围内每条消息平均 token 数。",
  usageCostHint: "提供商上报费用时每条消息平均费用。",
  usageCostHintMissing: "提供商上报费用时每条消息平均费用。部分或全部会话缺少费用数据。",
  usageModelMix: "模型组合",
  usageDuration: "时长",
  usageCloseSessionDetails: "关闭会话详情",
  usageLoading: "加载中…",
  usageNoTimelineData: "无时间线数据",
  usageNoDataInRange: "范围内无数据",
  usageUsageOverTime: "用量随时间",
  usagePerTurn: "每轮",
  usageCumulative: "累计",
  usageNoContextData: "无上下文数据",
  usageSystemPromptBreakdown: "系统提示分解",
  usageExpandAll: "全部展开",
  usageCollapseAll: "全部折叠",
  usageBaseContextPerMessage: "每条消息的基础上下文",
  usageSys: "系统",
  usageSkills: "技能",
  usageToolsLabel: "工具",
  usageFiles: "文件",
  usageConversation: "对话",
  usageNoMessages: "无消息",
  usageSearchConversation: "搜索对话",
  usageClear: "清除",
  usageHasTools: "含工具",
  usageUser: "用户",
  usageAssistant: "助手",
  usageTool: "工具",
  usageToolResult: "工具结果",
  usageMessagesCount: "条消息",
  usageNoMessagesMatchFilters: "没有消息符合筛选条件。",
  usageTokenUsage: "Token 用量",
  usageToday: "今天",
  usage7d: "7 天",
  usage30d: "30 天",
  usageExportSessionsCsv: "会话 (CSV)",
  usageExportDailyCsv: "每日 (CSV)",
  usageSessionsCount: "会话",
  usageQueryHintMatch: "{count} / {total} 个会话匹配",
  usageQueryHintInRange: "{total} 个会话在范围内",
  usagePageSubtitle: "查看 token 消耗、会话高峰与费用驱动因素。",
  usageCalls: "次",
  cronScheduler: "调度器",
  cronSchedulerSub: "网关内置定时调度状态",
  cronEnabled: "已启用",
  cronJobs: "任务数",
  cronNewJob: "新建任务",
  cronNewJobSub: "创建定时唤醒或代理运行任务",
  cronName: "名称",
  cronDescription: "描述",
  cronAgentId: "Agent ID",
  cronSchedule: "调度",
  cronEvery: "每",
  cronAt: "在",
  cronCron: "Cron",
  cronSession: "会话",
  cronMain: "主会话",
  cronIsolated: "独立会话",
  cronWakeMode: "唤醒方式",
  cronNextHeartbeat: "下次心跳",
  cronNow: "立即",
  cronPayload: "负载",
  cronSystemEvent: "系统事件",
  cronAgentTurn: "代理轮次",
  cronSystemText: "系统文本",
  cronAgentMessage: "Agent 消息",
  cronDelivery: "投递",
  cronAnnounceSummary: "公布摘要（默认）",
  cronNoneInternal: "无（内部）",
  cronChannel: "通道",
  cronTo: "发送至",
  cronToPlaceholder: "群聊/用户 ID（如飞书 oc_xxx、ou_xxx）",
  cronToHint: "请输入平台原始 ID，不要输入会话 key。",
  cronToTooltip: "各平台群聊/用户 ID 示例：\n• 飞书：oc_xxx（群聊）、ou_xxx（用户）\n• 钉钉：群聊 ID 或用户 ID\n• 微信：群聊 ID 或 wxid_xxx\n• QQ Bot：QQ 号码\n\n请勿使用会话 key（如 agent:main:channel:...）。",
  cronAddJob: "添加任务",
  cronJobsTitle: "任务列表",
  cronJobsSub: "网关中所有已调度任务",
  cronNoJobsYet: "暂无任务。",
  cronRunHistory: "运行历史",
  cronRunHistorySub: "最近运行：",
  cronSelectJob: "（选择任务）",
  cronNoRunsYet: "暂无运行记录。",
  cronSelectJobToInspect: "选择任务以查看运行历史",
  cronRunAt: "运行时间",
  cronUnit: "单位",
  cronMinutes: "分钟",
  cronHours: "小时",
  cronDays: "天",
  cronExpression: "表达式",
  cronTimeoutSeconds: "超时（秒）",
  cronLast: "上次",
  agentsFiles: "文件",
  agentsRuntime: "运行时",
  agentsWeb: "网页",
  agentsMemory: "记忆",
  agentsSessions: "会话",
  agentsUi: "界面",
  agentsMessaging: "消息",
  agentsAutomation: "自动化",
  agentsReadFile: "读取文件内容",
  agentsWriteFile: "创建或覆盖文件",
  agentsEdit: "精确编辑",
  agentsApplyPatch: "应用补丁（OpenAI）",
  agentsExec: "执行 shell 命令",
  agentsProcess: "管理后台进程",
  agentsWebSearch: "网页搜索",
  agentsWebFetch: "抓取网页内容",
  agentsMemorySearch: "语义搜索",
  agentsMemoryGet: "读取记忆文件",
  agentsSessionsList: "列出会话",
  agentsSessionsHistory: "会话历史",
  agentsSessionsSend: "发送到会话",
  agentsSessionsSpawn: "派生子代理",
  agentsSessionStatus: "会话状态",
  agentsBrowser: "控制浏览器",
  agentsCanvas: "控制画布",
  agentsMessage: "发送消息",
  agentsScheduleTasks: "安排任务",
  agentsGatewayControl: "网关控制",
  agentsNodesDevices: "节点与设备",
  agentsListAgents: "列出代理",
  agentsImageUnderstanding: "图像理解",
  agentsNodes: "节点",
  agentsAgents: "代理",
  agentsMedia: "媒体",
  agentsTitle: "代理",
  agentsConfigured: "已配置。",
  agentsNoFound: "未找到代理。",
  agentsSelectAgent: "选择代理",
  agentsSelectAgentSub: "选择一个代理以查看其工作区与工具。",
  agentsWorkspaceRouting: "代理工作区与路由。",
  agentsProfileMinimal: "最小",
  agentsProfileCoding: "编程",
  agentsProfileMessaging: "消息",
  agentsProfileFull: "完整",
  agentsDefault: "默认",
  agentsSelected: "已选",
  agentsAllSkills: "全部技能",
  agentsCurrentModel: "当前",
  agentsInheritDefault: "继承默认",
  agentsOverview: "概览",
  agentsOverviewSub: "工作区路径与身份元数据。",
  agentsWorkspace: "工作区",
  agentsPrimaryModel: "主模型",
  agentsIdentityName: "身份名称",
  agentsDefaultLabel: "默认",
  agentsIdentityEmoji: "身份表情",
  agentsSkillsFilter: "技能筛选",
  agentsModelSelection: "模型选择",
  agentsPrimaryModelLabel: "主模型",
  agentsPrimaryModelDefault: "（默认）",
  agentsFallbacksLabel: "备选（逗号分隔）",
  agentsReloadConfig: "重新加载配置",
  agentsAgentContext: "代理上下文",
  agentsContextWorkspaceIdentity: "工作区、身份与模型配置。",
  agentsContextWorkspaceScheduling: "工作区与调度目标。",
  agentsChannels: "渠道",
  agentsChannelsSub: "网关渠道状态快照。",
  agentsLoadChannels: "加载渠道以查看实时状态。",
  agentsNoChannels: "未找到渠道。",
  agentsConnected: "已连接",
  agentsConfiguredLabel: "已配置",
  agentsEnabled: "已启用",
  agentsDisabled: "已禁用",
  agentsNoAccounts: "无账号",
  agentsNotConfigured: "未配置",
  agentsScheduler: "调度器",
  agentsSchedulerSub: "网关定时状态。",
  agentsNextWake: "下次唤醒",
  agentsCronJobs: "代理定时任务",
  agentsCronJobsSub: "针对此代理的定时任务。",
  agentsNoJobsAssigned: "未分配任务。",
  agentsCoreFiles: "核心文件",
  agentsCoreFilesSub: "引导人设、身份与工具指引。",
  agentsLoadWorkspaceFiles: "加载代理工作区文件以编辑核心说明。",
  agentsNoFilesFound: "未找到文件。",
  agentsSelectFileToEdit: "选择要编辑的文件。",
  agentsReset: "重置",
  agentsFileMissingCreate: "该文件不存在。保存将在代理工作区中创建。",
  agentsUnavailable: "不可用",
  agentsTabOverview: "概览",
  agentsTabFiles: "文件",
  agentsTabTools: "工具",
  agentsTabSkills: "技能",
  agentsTabChannels: "渠道",
  agentsTabCron: "定时任务",
  agentsFallback: "备选",
  agentsNever: "从未",
  agentsLastRefresh: "上次刷新",
  agentsSkillsPanelSub: "每代理技能允许列表与工作区技能。",
  agentsUseAll: "全部启用",
  agentsDisableAll: "全部禁用",
  agentsLoadConfigForSkills: "加载网关配置以设置每代理技能。",
  agentsCustomAllowlist: "此代理使用自定义技能允许列表。",
  agentsAllSkillsEnabled: "所有技能已启用。禁用任意技能将创建每代理允许列表。",
  agentsLoadSkillsForAgent: "加载此代理的技能以查看工作区相关条目。",
  agentsFilter: "筛选",
  agentsNoSkillsFound: "未找到技能。",
  agentsToolsGlobalAllow: "已设置全局 tools.allow。代理覆盖无法启用被全局禁止的工具。",
  agentsProfile: "配置集",
  agentsSource: "来源",
  agentsStatus: "状态",
  agentsUnsaved: "未保存",
  agentsQuickPresets: "快捷预设",
  agentsInherit: "继承",
  agentsToolsTitle: "工具",
  agentsToolsSub: "每代理工具配置集与覆盖。",
  agentsToolAccess: "工具访问",
  agentsToolsSubText: "此代理的配置集与每工具覆盖。",
  agentsLoadConfigForTools: "加载网关配置以调整工具配置集。",
  agentsExplicitAllowlist: "此代理在配置中使用显式允许列表。工具覆盖在配置页管理。",
  agentsEnableAll: "全部启用",
  agentsEnabledCount: "已启用。",
  skillsTitle: "技能",
  skillsSub: "内置、托管与工作区技能。",
  skillsSearchPlaceholder: "搜索技能",
  skillsShown: "条显示",
  skillsWorkspace: "工作区技能",
  skillsBuiltIn: "内置技能",
  skillsInstalled: "已安装技能",
  skillsExtra: "额外技能",
  skillsOther: "其他技能",
  skillsAdd: "新增",
  skillsAddSkill: "添加技能",
  skillsUploadName: "技能名称",
  skillsUploadNamePlaceholder: "如 my-skill",
  skillsUploadFile: "文件",
  skillsUploadFileHint: "SKILL.md 或包含 SKILL.md 的 .zip",
  skillsUploadSingleHint: "单文件必须为 SKILL.md",
  skillsUploadZipHint: "压缩包必须包含 SKILL.md",
  skillsUploadSubmit: "上传",
  skillsUploadSuccess: "技能上传成功",
  skillsDelete: "删除",
  skillsDeleteConfirm: "确定删除此技能？",
  skillsSource: "来源",
  skillsPath: "路径",
  skillsNoDoc: "暂无文档。",
  skillsEligible: "可用",
  skillsDisabled: "已禁用",
  skillsRequiresBins: "需要命令",
  skillsRequiresEnv: "需要环境变量",
  skillsRequiresConfig: "需要配置",
  skillsMissing: "缺失",
  nodesTitle: "节点",
  nodesSub: "已配对设备与在线连接。",
  nodesNoFound: "未找到节点。",
  nodesDevices: "设备",
  nodesDevicesSub: "配对请求与角色令牌。",
  nodesPending: "待处理",
  nodesPaired: "已配对",
  nodesNoPairedDevices: "暂无已配对设备。",
  nodesRoleLabel: "角色：",
  nodesRoleNone: "角色：-",
  nodesRepairSuffix: " · 修复",
  nodesRequested: "请求于 ",
  nodesApprove: "批准",
  nodesReject: "拒绝",
  nodesRolesLabel: "角色：",
  nodesScopesLabel: "范围：",
  nodesTokensNone: "令牌：无",
  nodesTokens: "令牌",
  nodesTokenRevoked: "已撤销",
  nodesTokenActive: "有效",
  nodesRotate: "轮换",
  nodesRevoke: "撤销",
  nodesBindingTitle: "Exec 节点绑定",
  nodesBindingSub: "在使用 ",
  nodesBindingFormModeHint: "请在 Config 选项卡中切换到表单模式以在此编辑绑定。",
  nodesLoadConfigHint: "加载配置以编辑绑定。",
  nodesLoadConfig: "加载配置",
  nodesDefaultBinding: "默认绑定",
  nodesDefaultBindingSub: "当代理未覆盖节点绑定时使用。",
  nodesNodeLabel: "节点",
  nodesAnyNode: "任意节点",
  nodesNoNodesSystemRun: "没有支持 system.run 的节点。",
  nodesNoAgentsFound: "未找到代理。",
  nodesExecApprovalsTitle: "Exec 审批",
  nodesExecApprovalsSub: "exec host=gateway/node 的允许列表与审批策略。",
  nodesLoadExecApprovalsHint: "加载 exec 审批以编辑允许列表。",
  nodesLoadApprovals: "加载审批",
  nodesTarget: "目标",
  nodesTargetSub: "网关编辑本地审批；节点编辑所选节点。",
  nodesHost: "主机",
  nodesHostGateway: "网关",
  nodesHostNode: "节点",
  nodesSelectNode: "选择节点",
  nodesNoNodesExecApprovals: "尚无节点提供 exec 审批。",
  nodesScope: "范围",
  nodesDefaults: "默认",
  nodesSecurity: "安全",
  nodesSecurityDefaultSub: "默认安全模式。",
  nodesSecurityAgentSubPrefix: "默认：",
  nodesMode: "模式",
  nodesUseDefaultPrefix: "使用默认（",
  nodesUseDefaultButton: "使用默认",
  nodesSecurityDeny: "拒绝",
  nodesSecurityAllowlist: "允许列表",
  nodesSecurityFull: "完全",
  nodesAsk: "询问",
  nodesAskDefaultSub: "默认提示策略。",
  nodesAskAgentSubPrefix: "默认：",
  nodesAskOff: "关",
  nodesAskOnMiss: "缺失时",
  nodesAskAlways: "始终",
  nodesAskFallback: "询问回退",
  nodesAskFallbackDefaultSub: "当 UI 提示不可用时应用。",
  nodesAskFallbackAgentSubPrefix: "默认：",
  nodesFallback: "回退",
  nodesAutoAllowSkills: "自动允许技能 CLI",
  nodesAutoAllowSkillsDefaultSub: "允许网关列出的技能可执行文件。",
  nodesAutoAllowSkillsUsingDefault: "使用默认（",
  nodesAutoAllowSkillsOverride: "覆盖（",
  nodesEnabled: "启用",
  nodesAllowlist: "允许列表",
  nodesAllowlistSub: "不区分大小写的 glob 模式。",
  nodesAddPattern: "添加模式",
  nodesNoAllowlistEntries: "尚无允许列表条目。",
  nodesNewPattern: "新模式",
  nodesLastUsedPrefix: "上次使用：",
  nodesPattern: "模式",
  nodesRemove: "移除",
  nodesDefaultAgent: "默认代理",
  nodesAgent: "代理",
  nodesUsesDefault: "使用默认（",
  nodesOverride: "覆盖：",
  nodesBinding: "绑定",
  nodesChipPaired: "已配对",
  nodesChipUnpaired: "未配对",
  nodesConnected: "已连接",
  nodesOffline: "离线",
  nodesNever: "从未",
  configEnv: "环境",
  configUpdate: "更新",
  configAgents: "代理",
  configAuth: "认证",
  configChannels: "通道",
  configMessages: "消息",
  configCommands: "命令",
  configHooks: "钩子",
  configSkills: "技能",
  configTools: "工具",
  configGateway: "网关",
  configWizard: "设置向导",
  configMeta: "元数据",
  configLogging: "日志",
  configBrowser: "浏览器",
  configUi: "界面",
  configModels: "模型",
  configBindings: "绑定",
  configBroadcast: "广播",
  configAudio: "音频",
  configSession: "会话",
  configCron: "定时",
  configWeb: "Web",
  configDiscovery: "发现",
  configCanvasHost: "画布主机",
  configTalk: "语音",
  configPlugins: "插件",
  configEnvVars: "环境变量",
  configEnvVarsDesc: "传入网关进程的环境变量",
  configUpdatesDesc: "自动更新与发布渠道",
  configAgentsDesc: "代理配置、模型与身份",
  configAuthDesc: "API 密钥与认证配置",
  configChannelsDesc: "消息通道（Telegram、Discord、Slack 等）",
  configMessagesDesc: "消息处理与路由",
  configCommandsDesc: "自定义斜杠命令",
  configHooksDesc: "Webhook 与事件钩子",
  configSkillsDesc: "技能包与能力",
  configToolsDesc: "工具配置（浏览器、搜索等）",
  configGatewayDesc: "网关服务（端口、认证、绑定）",
  configWizardDesc: "设置向导状态与历史",
  configMetaDesc: "网关元数据与版本",
  configLoggingDesc: "日志级别与输出",
  configBrowserDesc: "浏览器自动化",
  configUiDesc: "界面偏好",
  configModelsDesc: "AI 模型与提供商",
  configBindingsDesc: "快捷键绑定",
  configBroadcastDesc: "广播与通知",
  configAudioDesc: "音频输入/输出",
  configSessionDesc: "会话管理与持久化",
  configCronDesc: "定时任务与自动化",
  configWebDesc: "Web 服务与 API",
  configDiscoveryDesc: "服务发现与网络",
  configCanvasHostDesc: "画布渲染与显示",
  configTalkDesc: "语音与朗读",
  configPluginsDesc: "插件管理",
  configSettingsTitle: "设置",
  configSearchPlaceholder: "搜索设置…",
  configAllSettings: "全部设置",
  configForm: "表单",
  configRaw: "原始",
  configUnsavedChanges: "未保存的更改",
  configUnsavedChangesLabel: "未保存的更改",
  configOneUnsavedChange: "1 项未保存的更改",
  configNoChanges: "无更改",
  configApplying: "应用中…",
  configApply: "应用",
  configUpdating: "更新中…",
  configUpdateButton: "更新",
  configViewPrefix: "查看 ",
  configPendingChange: "项待处理更改",
  configPendingChanges: "项待处理更改",
  configLoadingSchema: "正在加载架构…",
  configFormUnsafeWarning: "表单视图无法安全编辑部分字段，请使用原始模式以免丢失配置项。",
  configRawJson5: "原始 JSON5",
  configValidityValid: "有效",
  configValidityInvalid: "无效",
  configValidityUnknown: "未知",
  configSchemaUnavailable: "架构不可用。",
  configUnsupportedSchema: "不支持的架构，请使用原始模式。",
  configNoSettingsMatchPrefix: "没有匹配「",
  configNoSettingsMatchSuffix: "」的设置",
  configNoSettingsInSection: "本部分暂无设置",
  configUnsupportedSchemaNode: "不支持的架构节点，请使用原始模式。",
  configSubnavAll: "全部",
  envVarsSection: "Vars (env.vars)",
  envModelEnvSection: "模型环境变量 (env.modelEnv)",
  envShellEnvSection: "Shell 环境 (env.shellEnv)",
  envVarsKey: "Key",
  envVarsValue: "Value",
  envVarsAdd: "新增",
  envVarsDelete: "删除",
  envVarsSave: "保存",
  envVarsEmpty: "暂无环境变量，点击添加创建。",
  envVarsKeyPlaceholder: "如 API_KEY",
  envVarsValuePlaceholder: "如 your-secret-value",
  debugSnapshots: "快照",
  debugSnapshotsSub: "状态、健康与心跳数据。",
  debugStatus: "状态",
  debugHealth: "健康",
  debugLastHeartbeat: "最近心跳",
  debugSecurityAudit: "安全审计",
  debugManualRpc: "手动 RPC",
  debugManualRpcSub: "使用 JSON 参数发送原始网关方法。",
  debugMethod: "方法",
  debugParams: "参数",
  debugCall: "调用",
  debugCritical: "严重",
  debugWarnings: "警告",
  debugNoCritical: "无严重问题",
  debugInfo: "信息",
  debugSecurityAuditDetails: "运行 openclaw security audit --deep 查看详细信息。",
  debugModels: "模型",
  debugModelsSub: "来自 models.list 的目录。",
  debugEventLog: "事件日志",
  debugEventLogSub: "最新的网关事件。",
  debugNoEvents: "暂无事件。",
  logsTitle: "日志",
  logsSub: "网关文件日志（JSONL）。",
  logsExportFiltered: "导出已筛选",
  logsExportVisible: "导出可见",
};

const STRINGS: Record<Locale, Strings> = { en: EN, zh: ZH };

export function t<K extends keyof Strings>(key: K): Strings[K] {
  return STRINGS[getLocale()][key];
}

const SECTION_META_KEYS: Record<string, { label: keyof Strings; desc: keyof Strings }> = {
  env: { label: "configEnvVars", desc: "configEnvVarsDesc" },
  update: { label: "configUpdate", desc: "configUpdatesDesc" },
  agents: { label: "configAgents", desc: "configAgentsDesc" },
  auth: { label: "configAuth", desc: "configAuthDesc" },
  channels: { label: "configChannels", desc: "configChannelsDesc" },
  messages: { label: "configMessages", desc: "configMessagesDesc" },
  commands: { label: "configCommands", desc: "configCommandsDesc" },
  hooks: { label: "configHooks", desc: "configHooksDesc" },
  skills: { label: "configSkills", desc: "configSkillsDesc" },
  tools: { label: "configTools", desc: "configToolsDesc" },
  gateway: { label: "configGateway", desc: "configGatewayDesc" },
  wizard: { label: "configWizard", desc: "configWizardDesc" },
  meta: { label: "configMeta", desc: "configMetaDesc" },
  logging: { label: "configLogging", desc: "configLoggingDesc" },
  browser: { label: "configBrowser", desc: "configBrowserDesc" },
  ui: { label: "configUi", desc: "configUiDesc" },
  models: { label: "configModels", desc: "configModelsDesc" },
  bindings: { label: "configBindings", desc: "configBindingsDesc" },
  broadcast: { label: "configBroadcast", desc: "configBroadcastDesc" },
  audio: { label: "configAudio", desc: "configAudioDesc" },
  session: { label: "configSession", desc: "configSessionDesc" },
  cron: { label: "configCron", desc: "configCronDesc" },
  web: { label: "configWeb", desc: "configWebDesc" },
  discovery: { label: "configDiscovery", desc: "configDiscoveryDesc" },
  canvasHost: { label: "configCanvasHost", desc: "configCanvasHostDesc" },
  talk: { label: "configTalk", desc: "configTalkDesc" },
  plugins: { label: "configPlugins", desc: "configPluginsDesc" },
};

export function getSectionMeta(key: string): { label: string; description: string } {
  const meta = SECTION_META_KEYS[key];
  if (meta) {
    return { label: t(meta.label), description: t(meta.desc) };
  }
  return { label: key, description: "" };
}
