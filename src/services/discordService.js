// Discord API service — uses user token for DM access
// Note: Self-bot usage violates Discord ToS. This implementation is for educational
// purposes. Users are responsible for compliance with Discord's Terms of Service.

const DISCORD_API = 'https://discord.com/api/v10';

export class DiscordService {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.heartbeatInterval = null;
    this.sessionId = null;
    this.sequence = null;
    this.messageListeners = [];
    this.connectionListeners = [];
  }

  // ── REST API ──────────────────────────────────────────────────────────────

  async request(method, path, body = null) {
    const response = await fetch(`${DISCORD_API}${path}`, {
      method,
      headers: {
        'Authorization': this.token,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Discord API error ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async getCurrentUser() {
    return this.request('GET', '/users/@me');
  }

  async getDMChannels() {
    return this.request('GET', '/users/@me/channels');
  }

  async getChannelMessages(channelId, limit = 50, before = null) {
    let path = `/channels/${channelId}/messages?limit=${limit}`;
    if (before) path += `&before=${before}`;
    return this.request('GET', path);
  }

  async sendMessage(channelId, content) {
    return this.request('POST', `/channels/${channelId}/messages`, { content });
  }

  async getUser(userId) {
    return this.request('GET', `/users/${userId}`);
  }

  async openDMChannel(userId) {
    return this.request('POST', '/users/@me/channels', { recipient_id: userId });
  }

  // ── Connection test ────────────────────────────────────────────────────────

  async testToken() {
    try {
      const user = await this.getCurrentUser();
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ── Gateway / WebSocket ───────────────────────────────────────────────────

  connect(onMessage, onReady, onDisconnect) {
    this.messageListeners = [onMessage].filter(Boolean);
    this._onReady = onReady;
    this._onDisconnect = onDisconnect;

    this.ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      this._handleGateway(payload);
    };

    this.ws.onclose = () => {
      this._cleanup();
      if (this._onDisconnect) this._onDisconnect();
    };

    this.ws.onerror = () => {
      this._cleanup();
      if (this._onDisconnect) this._onDisconnect();
    };
  }

  disconnect() {
    this._cleanup();
  }

  _cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }

  _send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  _handleGateway(payload) {
    const { op, d, s, t } = payload;
    if (s) this.sequence = s;

    switch (op) {
      case 10: // Hello
        this.heartbeatInterval = setInterval(() => {
          this._send({ op: 1, d: this.sequence });
        }, d.heartbeat_interval);
        this._identify();
        break;

      case 0: // Dispatch
        this._handleDispatch(t, d);
        break;

      case 7: // Reconnect
        this.disconnect();
        break;
    }
  }

  _identify() {
    this._send({
      op: 2,
      d: {
        token: this.token,
        properties: {
          os: 'Windows',
          browser: 'Discord',
          device: 'Discord',
        },
        intents: 0,
      },
    });
  }

  _handleDispatch(type, data) {
    switch (type) {
      case 'READY':
        this.sessionId = data.session_id;
        if (this._onReady) this._onReady(data);
        break;

      case 'MESSAGE_CREATE':
        this.messageListeners.forEach((listener) => listener(data));
        break;
    }
  }

  // ── Formatting helpers ────────────────────────────────────────────────────

  static formatConversation(channel) {
    const recipient = channel.recipients?.[0];
    return {
      id: channel.id,
      type: channel.type,
      name: recipient
        ? (recipient.global_name || recipient.username)
        : (channel.name || 'Unknown'),
      username: recipient?.username,
      avatar: recipient
        ? `https://cdn.discordapp.com/avatars/${recipient.id}/${recipient.avatar}.png?size=64`
        : null,
      lastMessageId: channel.last_message_id,
      recipients: channel.recipients,
    };
  }

  static formatMessage(msg) {
    return {
      id: msg.id,
      content: msg.content || '',
      author: {
        id: msg.author?.id,
        username: msg.author?.username,
        globalName: msg.author?.global_name,
        avatar: msg.author?.avatar
          ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=32`
          : null,
      },
      timestamp: msg.timestamp,
      channelId: msg.channel_id,
      // Media / rich content
      attachments:   msg.attachments || [],
      embeds:        msg.embeds || [],
      sticker_items: msg.sticker_items || [],
    };
  }

  // ── Friend requests ────────────────────────────────────────────────────────

  async getPendingFriendRequests() {
    // Returns incoming friend requests (type=3)
    const rels = await this.request('GET', '/users/@me/relationships');
    return (rels || []).filter(r => r.type === 3);
  }

  async acceptFriendRequest(userId) {
    return this.request('PUT', `/users/@me/relationships/${userId}`, {});
  }

  async openDMWithUser(userId) {
    return this.request('POST', '/users/@me/channels', { recipient_id: userId });
  }
}
