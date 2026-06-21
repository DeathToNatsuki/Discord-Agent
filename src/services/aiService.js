// AI Provider abstraction layer
// Supports: Claude, OpenAI, Gemini, OpenRouter, Ollama, LM Studio, Custom

export class AIProviderService {
  constructor(config) {
    this.providerId = config.providerId;
    this.config = config;
  }

  async generateResponse(messages, systemPrompt, options = {}) {
    const provider = this.providerId;

    switch (provider) {
      case 'claude':
        return this._callClaude(messages, systemPrompt, options);
      case 'openai':
        return this._callOpenAI(messages, systemPrompt, options);
      case 'gemini':
        return this._callGemini(messages, systemPrompt, options);
      case 'openrouter':
        return this._callOpenRouter(messages, systemPrompt, options);
      case 'ollama':
        return this._callOllama(messages, systemPrompt, options);
      case 'lmstudio':
        return this._callLMStudio(messages, systemPrompt, options);
      case 'custom':
        return this._callCustom(messages, systemPrompt, options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async testConnection() {
    try {
      await this.generateResponse([{ role: 'user', content: 'Hi' }], 'Say "OK" only.', { maxTokens: 5 });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async listModels() {
    switch (this.providerId) {
      case 'ollama':
        return this._listOllamaModels();
      case 'lmstudio':
        return this._listLMStudioModels();
      default:
        return STATIC_MODELS[this.providerId] || [];
    }
  }

  // ── Claude ────────────────────────────────────────────────────────────────

  async _callClaude(messages, systemPrompt, options) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.selectedModel || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 1024,
        system: systemPrompt,
        messages: this._formatMessagesOpenAI(messages),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API error ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      usage: {
        input: data.usage?.input_tokens,
        output: data.usage?.output_tokens,
      },
      model: data.model,
    };
  }

  // ── OpenAI ─────────────────────────────────────────────────────────────────

  async _callOpenAI(messages, systemPrompt, options) {
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...this._formatMessagesOpenAI(messages)]
      : this._formatMessagesOpenAI(messages);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.selectedModel || 'gpt-4o',
        max_tokens: options.maxTokens || 1024,
        messages: msgs,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        input: data.usage?.prompt_tokens,
        output: data.usage?.completion_tokens,
      },
      model: data.model,
    };
  }

  // ── Gemini ─────────────────────────────────────────────────────────────────

  async _callGemini(messages, systemPrompt, options) {
    const model = this.config.selectedModel || 'gemini-1.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      generationConfig: { maxOutputTokens: options.maxTokens || 1024 },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: {
        input: data.usageMetadata?.promptTokenCount,
        output: data.usageMetadata?.candidatesTokenCount,
      },
      model,
    };
  }

  // ── OpenRouter ─────────────────────────────────────────────────────────────

  async _callOpenRouter(messages, systemPrompt, options) {
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...this._formatMessagesOpenAI(messages)]
      : this._formatMessagesOpenAI(messages);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://discord-agent.app',
        'X-Title': 'Discord Agent',
      },
      body: JSON.stringify({
        model: this.config.selectedModel || 'anthropic/claude-3.5-sonnet',
        max_tokens: options.maxTokens || 1024,
        messages: msgs,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenRouter API error ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        input: data.usage?.prompt_tokens,
        output: data.usage?.completion_tokens,
      },
      model: data.model,
    };
  }

  // ── Ollama ─────────────────────────────────────────────────────────────────

  async _callOllama(messages, systemPrompt, options) {
    const host = this.config.host || 'http://localhost:11434';
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...this._formatMessagesOpenAI(messages)]
      : this._formatMessagesOpenAI(messages);

    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.selectedModel,
        messages: msgs,
        stream: false,
        options: { num_predict: options.maxTokens || 1024 },
      }),
    });

    if (!response.ok) throw new Error(`Ollama error ${response.status}`);

    const data = await response.json();
    return {
      content: data.message?.content || '',
      usage: {
        input: data.prompt_eval_count,
        output: data.eval_count,
      },
      model: data.model,
    };
  }

  async _listOllamaModels() {
    const host = this.config.host || 'http://localhost:11434';
    const response = await fetch(`${host}/api/tags`);
    if (!response.ok) throw new Error('Cannot reach Ollama');
    const data = await response.json();
    return (data.models || []).map((m) => ({ id: m.name, name: m.name, size: m.size }));
  }

  // ── LM Studio ──────────────────────────────────────────────────────────────

  async _callLMStudio(messages, systemPrompt, options) {
    const host = this.config.host || 'http://localhost:1234';
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...this._formatMessagesOpenAI(messages)]
      : this._formatMessagesOpenAI(messages);

    const response = await fetch(`${host}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.selectedModel || 'local-model',
        max_tokens: options.maxTokens || 1024,
        messages: msgs,
      }),
    });

    if (!response.ok) throw new Error(`LM Studio error ${response.status}`);

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        input: data.usage?.prompt_tokens,
        output: data.usage?.completion_tokens,
      },
      model: data.model,
    };
  }

  async _listLMStudioModels() {
    const host = this.config.host || 'http://localhost:1234';
    const response = await fetch(`${host}/v1/models`);
    if (!response.ok) throw new Error('Cannot reach LM Studio');
    const data = await response.json();
    return (data.data || []).map((m) => ({ id: m.id, name: m.id }));
  }

  // ── Custom ─────────────────────────────────────────────────────────────────

  async _callCustom(messages, systemPrompt, options) {
    if (!this.config.host) throw new Error('Custom API host not configured');

    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...this._formatMessagesOpenAI(messages)]
      : this._formatMessagesOpenAI(messages);

    const response = await fetch(`${this.config.host}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.selectedModel || 'default',
        max_tokens: options.maxTokens || 1024,
        messages: msgs,
      }),
    });

    if (!response.ok) throw new Error(`Custom API error ${response.status}`);

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        input: data.usage?.prompt_tokens,
        output: data.usage?.completion_tokens,
      },
      model: data.model,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _formatMessagesOpenAI(messages) {
    return messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
  }
}

// Static model lists for cloud providers
export const STATIC_MODELS = {
  claude: [
    { id: 'claude-opus-4-5',            name: 'Claude Opus 4.5',      tier: 'premium' },
    { id: 'claude-sonnet-4-5',          name: 'Claude Sonnet 4.5',    tier: 'standard' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet',    tier: 'standard' },
    { id: 'claude-3-5-haiku-20241022',  name: 'Claude 3.5 Haiku',     tier: 'fast' },
    { id: 'claude-3-opus-20240229',     name: 'Claude 3 Opus',        tier: 'premium' },
    { id: 'claude-3-haiku-20240307',    name: 'Claude 3 Haiku',       tier: 'fast' },
  ],
  openai: [
    { id: 'gpt-4o',       name: 'GPT-4o',       tier: 'premium' },
    { id: 'gpt-4o-mini',  name: 'GPT-4o Mini',  tier: 'fast' },
    { id: 'gpt-4-turbo',  name: 'GPT-4 Turbo',  tier: 'premium' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', tier: 'fast' },
  ],
  gemini: [
    { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro',   tier: 'premium' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash',  tier: 'fast' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', tier: 'fast' },
  ],
  openrouter: [
    { id: 'anthropic/claude-3.5-sonnet',  name: 'Claude 3.5 Sonnet (via OR)',  tier: 'standard' },
    { id: 'openai/gpt-4o',               name: 'GPT-4o (via OR)',             tier: 'premium' },
    { id: 'google/gemini-pro-1.5',       name: 'Gemini 1.5 Pro (via OR)',     tier: 'premium' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B',         tier: 'standard' },
    { id: 'mistralai/mixtral-8x7b-instruct',   name: 'Mixtral 8x7B',          tier: 'fast' },
  ],
};

// Recommended local models with system requirements
export const LOCAL_MODEL_LIBRARY = [
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    provider: 'ollama',
    description: 'Fast, lightweight model. Good for casual conversations.',
    size: '2.0 GB',
    ramRequired: 4,
    vramRequired: 3,
    pullCommand: 'ollama pull llama3.2:3b',
  },
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2 1B',
    provider: 'ollama',
    description: 'Ultra-lightweight. Runs on almost any machine.',
    size: '1.3 GB',
    ramRequired: 2,
    vramRequired: 1,
    pullCommand: 'ollama pull llama3.2:1b',
  },
  {
    id: 'phi3.5',
    name: 'Phi 3.5 Mini',
    provider: 'ollama',
    description: 'Microsoft\'s compact model with strong reasoning.',
    size: '2.2 GB',
    ramRequired: 4,
    vramRequired: 3,
    pullCommand: 'ollama pull phi3.5',
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen 2.5 7B',
    provider: 'ollama',
    description: 'Balanced performance. Good at following instructions.',
    size: '4.7 GB',
    ramRequired: 8,
    vramRequired: 6,
    pullCommand: 'ollama pull qwen2.5:7b',
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    provider: 'ollama',
    description: 'High quality for its size. Great general purpose model.',
    size: '4.1 GB',
    ramRequired: 8,
    vramRequired: 5,
    pullCommand: 'ollama pull mistral:7b',
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    provider: 'ollama',
    description: 'Meta\'s latest 8B model. Strong performance across tasks.',
    size: '4.7 GB',
    ramRequired: 8,
    vramRequired: 6,
    pullCommand: 'ollama pull llama3.1:8b',
  },
];

export function getModelCompatibility(model, systemInfo) {
  if (!systemInfo) return 'unknown';

  const ramGB = systemInfo.totalMemory / (1024 ** 3);

  if (ramGB >= model.ramRequired * 1.5) return 'compatible';
  if (ramGB >= model.ramRequired) return 'partial';
  return 'incompatible';
}
