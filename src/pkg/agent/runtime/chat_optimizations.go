package runtime

import (
	"github.com/stellarlinkco/agentsdk-go/pkg/api"
)

const (
	defaultChatHistoryMaxMessages   = 48
	defaultChatToolOutputInline     = 2500
	defaultChatToolOutputSnippet    = 480
	defaultChatCompactThreshold     = 0.72
	defaultChatCompactPreserveCount = 8
)

// applyChatAgentOptimizations tunes agentsdk-go for interactive chat: smaller tool schemas in
// history, tighter session reload, and automatic compaction when approaching the token budget.
func applyChatAgentOptimizations(apiOpts *api.Options, opts Options) {
	if apiOpts == nil {
		return
	}
	if apiOpts.ToolOutputInlineMaxRunes <= 0 || apiOpts.ToolOutputInlineMaxRunes > defaultChatToolOutputInline {
		apiOpts.ToolOutputInlineMaxRunes = defaultChatToolOutputInline
	}
	if apiOpts.ToolOutputSnippetMaxRunes <= 0 || apiOpts.ToolOutputSnippetMaxRunes > defaultChatToolOutputSnippet {
		apiOpts.ToolOutputSnippetMaxRunes = defaultChatToolOutputSnippet
	}
	if apiOpts.SessionHistoryMaxMessages <= 0 {
		apiOpts.SessionHistoryMaxMessages = defaultChatHistoryMaxMessages
	}
	if opts.TokenLimit > 0 && !apiOpts.AutoCompact.Enabled {
		apiOpts.AutoCompact = api.CompactConfig{
			Enabled:       true,
			Threshold:     defaultChatCompactThreshold,
			PreserveCount: defaultChatCompactPreserveCount,
		}
	}
	apiOpts.ToolPromptSchema = api.ToolPromptSchemaMinimal
}
