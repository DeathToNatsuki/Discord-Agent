# Discord Agent — Architecture Documentation

## Overview

Discord Agent is built on a clean, layered architecture that separates concerns between the desktop shell, UI, business logic, and external integrations.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Electron Shell                            │
│   main.js (Node process) ←→ preload.js ←→ renderer (browser)   │
└──────────────────────────────────────────────────────────────────┘
                               │
                     Context Bridge (IPC)
                               │
┌──────────────────────────────────────────────────────────────────┐
│                         React UI Layer                           │
│   Agent Tab │ Settings Tab │ Credits Tab                         │
│   ↕                                                              │
│   Shared Components: TitleBar, Sidebar, Toast                    │
└──────────────────────────────────────────────────────────────────┘
                               │
                        Zustand Store
                               │
         ┌─────────────────────┼──────────────────────┐
         │                     │                      │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  AI Service     │  │ Discord Service  │  │  Local Storage  │
│  (aiService.js) │  │(discordService)  │  │ (electron-store)│
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                     │
    ┌────┴────┐           ┌────┴────┐
    │ Claude  │           │ REST API│
    │ OpenAI  │           │ Gateway │
    │ Gemini  │           │   WS    │
    │ OR      │           └─────────┘
    │ Ollama  │
    │ LMStudio│
    └─────────┘
```

---

## Component Architecture

### Agent Tab

```
AgentTab
├── [Left Panel]
│   ├── Tab switcher (Chats / AI Model)
│   ├── DiscordConnect          — Token entry, connection test
│   ├── ConversationList        — Filterable DM list
│   └── AIProviderPanel
│       ├── Cloud providers     — Claude, OpenAI, Gemini, OpenRouter, Custom
│       ├── Local providers     — Ollama, LM Studio
│       └── Model Library       — Download recommendations + compat check
│
└── [Right Panel]
    └── ConversationView
        ├── PermissionGate      — Explicit consent before reading messages
        ├── ApprovalCard(s)     — AI drafts waiting for approval
        ├── MessageArea         — Conversation history display
        ├── GenerateBar         — Trigger AI generation
        ├── PerUserControls     — Preset, mode, trigger config [side panel]
        └── MemoryPanel         — Notes/memory management [side panel]
```

### State Shape (Zustand)

```javascript
{
  // Navigation
  activeTab: 'agent' | 'settings' | 'credits',

  // Theme
  theme: 'dark' | 'light',

  // AI Providers — keyed by provider ID
  providers: {
    claude:     { apiKey, enabled, selectedModel },
    openai:     { apiKey, enabled, selectedModel },
    gemini:     { apiKey, enabled, selectedModel },
    openrouter: { apiKey, enabled, selectedModel },
    ollama:     { host, enabled, selectedModel },
    lmstudio:   { host, enabled, selectedModel },
    custom:     { apiKey, host, enabled, selectedModel },
  },
  activeProvider: string | null,

  // Discord
  discordToken: string,
  discordConnected: boolean,
  discordUser: object | null,
  discordConversations: Conversation[],

  // Per-conversation permissions
  conversationPermissions: { [conversationId]: boolean },

  // Selected conversation
  selectedConversation: Conversation | null,

  // Per-conversation AI config
  conversationConfigs: {
    [conversationId]: {
      enabled: boolean,
      presetId: string,
      customSystemPrompt: string,
      responseMode: string,
      responseTriggerText: string,
      aiForAllUsers: boolean,
      enabledUsers: string[],
    }
  },

  // Approval queue
  approvalQueue: ApprovalItem[],

  // Custom presets
  customPresets: Preset[],

  // Memory per conversation
  memories: { [conversationId]: Memory[] },

  // App settings
  settings: {
    approvalMode: 'always' | 'never' | 'selected',
    showDrafts: boolean,
    showMemoryUsage: boolean,
    contextLimit: number,
    defaultPresetId: string,
  },

  // Hardware info
  systemInfo: object | null,
}
```

---

## AI Provider Abstraction

`AIProviderService` provides a unified interface over all supported providers:

```javascript
const service = new AIProviderService({
  providerId: 'claude',
  apiKey: '...',
  selectedModel: 'claude-3-5-sonnet-20241022',
});

const result = await service.generateResponse(messages, systemPrompt, { maxTokens: 512 });
// result: { content: string, usage: { input, output }, model: string }
```

Adding a new provider requires:
1. Adding entry to `PROVIDERS` map
2. Adding `_callProviderName()` method
3. Adding a `case` in `generateResponse()`
4. Adding UI card to `AIProviderPanel`

---

## Discord Integration

### Authentication
The app uses a Discord user token directly in API requests. This is the standard `Authorization` header value found in Discord's web client network requests.

### REST Operations
- `GET /users/@me` — Validate token, get current user
- `GET /users/@me/channels` — List DM channels
- `GET /channels/:id/messages` — Fetch message history
- `POST /channels/:id/messages` — Send a message

### Gateway (WebSocket)
The `DiscordService.connect()` method opens a WebSocket to `wss://gateway.discord.gg` for real-time message events. Uses:
- Op 10 (Hello) → sends heartbeat on interval
- Op 2 (Identify) → authenticates
- Op 0 Dispatch `MESSAGE_CREATE` → triggers listener callbacks

---

## Memory System

Memory is stored per conversation ID as an array of string notes:

```javascript
memories: {
  "channel_id_123": [
    { id: "mem_1", content: "User prefers short responses", createdAt: "..." },
    { id: "mem_2", content: "User works in software engineering", createdAt: "..." }
  ]
}
```

Memories are injected into the AI system prompt:
```
You are ... [preset]

Memory about this conversation:
- User prefers short responses
- User works in software engineering
```

Users can:
- Add memories manually
- Delete individual memories
- Clear all memories for a conversation
- Export memories as JSON

---

## Security Considerations

1. **Context isolation**: Electron's `contextIsolation: true` prevents renderer code from accessing Node.js APIs directly
2. **Preload bridge**: Only explicitly exposed `electronAPI` methods are available in the renderer
3. **Token storage**: Discord tokens and API keys are stored via `electron-store` (encrypted on macOS via Keychain)
4. **No remote code**: `webSecurity: true` in production; no eval or remote module loading
5. **Consent gates**: Explicit permission required before reading any conversation
6. **Approval default**: All AI responses require manual approval by default

---

## Persistence Strategy

| Data | Storage | Notes |
|------|---------|-------|
| API keys | electron-store | Encrypted on macOS |
| Discord token | electron-store | Local only |
| App settings | electron-store | JSON serialized |
| Conversation configs | electron-store | Per-conversation |
| Memories | electron-store | Per-conversation arrays |
| Conversation permissions | electron-store | Simple boolean map |

In the browser dev environment, Zustand state is in-memory only and resets on refresh.

---

## Future Scalability

| Feature | Approach |
|---|---|
| Multiple Discord accounts | Add account switcher; namespace all store keys by account ID |
| Server channels (not just DMs) | DiscordService already supports any channel ID |
| Scheduled responses | Add cron/timer logic in main.js or a background worker |
| Response templates | Extend preset system with variable interpolation |
| Analytics / history | Add SQLite via better-sqlite3 for message/response logs |
| Plugin system | Define plugin API over IPC; load plugins from user data dir |
| Cloud sync | Add optional sync endpoint; encrypt before upload |
