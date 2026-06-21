import { create } from 'zustand';

export const VERSION = '1.2.0';
export const GITHUB_REPO = 'DeathToNatsuki/Discord-Agent';

export const TABS = { AGENT: 'agent', MODEL: 'model', SETTINGS: 'settings', CREDITS: 'credits' };

export const PROVIDERS = {
  claude:     { id: 'claude',     name: 'Claude',           type: 'cloud' },
  openai:     { id: 'openai',     name: 'ChatGPT / OpenAI', type: 'cloud' },
  gemini:     { id: 'gemini',     name: 'Gemini',           type: 'cloud' },
  openrouter: { id: 'openrouter', name: 'OpenRouter',       type: 'cloud' },
  ollama:     { id: 'ollama',     name: 'Ollama',           type: 'local' },
  lmstudio:   { id: 'lmstudio',  name: 'LM Studio',        type: 'local' },
  custom:     { id: 'custom',     name: 'Custom API',       type: 'cloud' },
};

export const RESPONSE_MODES = {
  all:        { id: 'all',        label: 'Respond to all messages' },
  mentions:   { id: 'mentions',   label: 'Respond only to mentions' },
  contains:   { id: 'contains',   label: 'Contains specific text' },
  starts_with:{ id: 'starts_with',label: 'Starts with specific text' },
  manual:     { id: 'manual',     label: 'Manual (Generate Reply button only)' },
  disabled:   { id: 'disabled',   label: 'Disabled' },
};

export const DEFAULT_PRESETS = [
  {
    id: 'pretend_me',
    label: 'Pretend To Be Me',
    introMessage: null, // no intro — seamlessly continues as them
    system: `You are ghostwriting responses on behalf of the account owner in their Discord DMs. Your goal is to sound exactly like them — not like an AI assistant.

Study the conversation history carefully:
- Match their vocabulary, sentence length, punctuation habits, and tone exactly.
- If they use lowercase, you use lowercase. If they use slang, you use slang. If they never use punctuation, skip it.
- Mirror their energy level — if they're being brief, be brief. If they're being expressive, match that.
- Do NOT be overly helpful or assistant-like. Sound like a real person texting their friend.
- Never start with filler like "Sure!", "Of course!", "Great question!" — just respond naturally.
- If you're unsure what they'd say, keep it short and natural rather than long and formal.`,
  },
  {
    id: 'assistant',
    label: 'AI Assistant',
    introMessage: null,
    system: `You are a knowledgeable, friendly AI assistant responding in Discord DMs on behalf of the account owner.

- Be genuinely helpful and accurate.
- Keep responses concise for chat — avoid walls of text.
- Use a warm but not overly enthusiastic tone.
- If you don't know something, say so honestly.
- Don't use heavy markdown formatting in chat.`,
  },
  {
    id: 'professional',
    label: 'Professional',
    introMessage: `Hello, I'm {owner}'s assistant. How can I help you today?`,
    system: `You are a professional assistant responding on behalf of {owner} in Discord DMs.

- Introduce yourself as {owner}'s assistant if this appears to be the start of a conversation.
- Maintain a polished, courteous, and clear tone at all times.
- Be precise — get to the point quickly without unnecessary filler.
- Use proper grammar and punctuation.
- Avoid slang, filler words, and overly casual language.
- If handling a request, confirm what you'll do and follow through clearly.`,
  },
  {
    id: 'casual',
    label: 'Casual Friend',
    introMessage: null,
    system: `You are chatting as a relaxed, friendly person in Discord.

- Be warm, natural, and conversational — like texting a good friend.
- Keep it light and easy-going.
- Use casual language, short sentences, natural reactions.
- Match the vibe — playful when they're playful, chill when they're chill.
- Short and genuine beats long and formal every time.`,
  },
  {
    id: 'support',
    label: 'Customer Support',
    introMessage: `Hi! I'm {owner}'s support assistant. What can I help you with today?`,
    system: `You are a customer support assistant responding on behalf of {owner}.

- Start by greeting the user and identifying yourself as {owner}'s support assistant if this is the beginning of the conversation.
- Lead with empathy — acknowledge their issue before jumping to solutions.
- Ask clarifying questions when the issue isn't clear.
- Provide clear, step-by-step solutions when possible.
- Stay calm and patient even if they're frustrated.
- Close by confirming the issue is resolved or offering further help.`,
  },
  {
    id: 'custom',
    label: 'Custom Prompt',
    introMessage: null,
    system: '',
  },
];

function defaultConversationConfig() {
  return {
    enabled: false,
    presetId: 'assistant',
    customSystemPrompt: '',
    responseMode: 'manual',
    responseTriggerText: '',
    approvalMode: 'always', // 'always' | 'never'
    sentIntro: false, // tracks whether intro message has been sent for this conv
  };
}

export const useAppStore = create((set, get) => ({
  activeTab: TABS.AGENT,
  setActiveTab: (tab) => set({ activeTab: tab }),

  theme: 'dark',
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  // Update available
  updateAvailable: null, // null | { version, url, body }
  setUpdateAvailable: (info) => set({ updateAvailable: info }),
  dismissUpdate: () => set({ updateAvailable: null }),

  providers: {
    claude:     { apiKey: '', enabled: false, selectedModel: 'claude-3-5-sonnet-20241022' },
    openai:     { apiKey: '', enabled: false, selectedModel: 'gpt-4o' },
    gemini:     { apiKey: '', enabled: false, selectedModel: 'gemini-1.5-pro' },
    openrouter: { apiKey: '', enabled: false, selectedModel: 'anthropic/claude-3.5-sonnet' },
    ollama:     { host: 'http://localhost:11434', enabled: false, selectedModel: '' },
    lmstudio:   { host: 'http://localhost:1234', enabled: false, selectedModel: '' },
    custom:     { apiKey: '', host: '', enabled: false, selectedModel: '' },
  },
  activeProvider: null,
  setActiveProvider: (id) => set({ activeProvider: id }),
  updateProvider: (id, updates) => set(s => ({
    providers: { ...s.providers, [id]: { ...s.providers[id], ...updates } },
  })),

  discordToken: '',
  discordConnected: false,
  discordUser: null,
  discordConversations: [],
  setDiscordToken: (token) => set({ discordToken: token }),
  setDiscordConnected: (connected, user = null) => set({ discordConnected: connected, discordUser: user }),
  setDiscordConversations: (conversations) => set({ discordConversations: conversations }),

  conversationPermissions: {},
  grantConversationPermission: (id) => set(s => ({
    conversationPermissions: { ...s.conversationPermissions, [id]: true },
  })),
  revokeConversationPermission: (id) => set(s => {
    const p = { ...s.conversationPermissions };
    delete p[id];
    return { conversationPermissions: p };
  }),

  selectedConversation: null,
  setSelectedConversation: (conv) => set({ selectedConversation: conv }),

  conversationConfigs: {},
  updateConversationConfig: (id, updates) => set(s => ({
    conversationConfigs: {
      ...s.conversationConfigs,
      [id]: { ...defaultConversationConfig(), ...s.conversationConfigs[id], ...updates },
    },
  })),

  approvalQueue: [],
  addToApprovalQueue: (item) => set(s => ({ approvalQueue: [...s.approvalQueue, item] })),
  removeFromApprovalQueue: (id) => set(s => ({ approvalQueue: s.approvalQueue.filter(i => i.id !== id) })),

  customPresets: [],
  addCustomPreset: (preset) => set(s => ({
    customPresets: [...s.customPresets, { ...preset, id: `custom_${Date.now()}`, introMessage: null }],
  })),
  updateCustomPreset: (id, updates) => set(s => ({
    customPresets: s.customPresets.map(p => p.id === id ? { ...p, ...updates } : p),
  })),
  deleteCustomPreset: (id) => set(s => ({
    customPresets: s.customPresets.filter(p => p.id !== id),
  })),

  memories: {},
  addMemory: (convId, memory) => set(s => ({
    memories: {
      ...s.memories,
      [convId]: [...(s.memories[convId] || []), {
        id: `mem_${Date.now()}`,
        content: memory,
        createdAt: new Date().toISOString(),
      }],
    },
  })),
  deleteMemory: (convId, memId) => set(s => ({
    memories: {
      ...s.memories,
      [convId]: (s.memories[convId] || []).filter(m => m.id !== memId),
    },
  })),
  clearMemory: (convId) => set(s => {
    const m = { ...s.memories };
    if (convId) delete m[convId]; else return { memories: {} };
    return { memories: m };
  }),

  settings: {
    showDrafts: true,
    showMemoryUsage: true,
    contextLimit: 8192,
    defaultPresetId: 'assistant',
    // Message delay
    messageDelayEnabled: false,
    messageDelayMin: 2,   // seconds
    messageDelayMax: 5,
    // Typing indicator
    typingIndicatorEnabled: false,
    // Friend requests
    autoAcceptFriendRequests: false,
    friendRequestGreeting: `Hey! Thanks for adding me. What can I help you with?`,
  },
  updateSettings: (updates) => set(s => ({ settings: { ...s.settings, ...updates } })),

  systemInfo: null,
  setSystemInfo: (info) => set({ systemInfo: info }),
}));
