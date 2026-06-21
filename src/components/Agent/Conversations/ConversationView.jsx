import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, DEFAULT_PRESETS } from '../../../store/appStore';
import { DiscordService } from '../../../services/discordService';
import { AIProviderService } from '../../../services/aiService';
import PerUserControls from '../PerUserControls/PerUserControls';
import ApprovalCard from '../ApprovalWorkflow/ApprovalCard';
import MemoryPanel from '../Memory/MemoryPanel';
import PermissionGate from './PermissionGate';

const IconBrain = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96-.46 2.5 2.5 0 01-1.07-4.54A3 3 0 015 11.5 3 3 0 017.5 8.7a2.5 2.5 0 01.55-2.7A2.5 2.5 0 019.5 2z"/>
    <path d="M14.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 004.96-.46 2.5 2.5 0 001.07-4.54A3 3 0 0119 11.5 3 3 0 0116.5 8.7a2.5 2.5 0 00-.55-2.7A2.5 2.5 0 0014.5 2z"/>
  </svg>
);
const IconZap = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconSettings2 = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveIntroMessage(template, ownerName) {
  if (!template) return null;
  return template.replace(/\{owner\}/g, ownerName);
}

function buildSystemPrompt({ preset, customPrompt, myUser, otherUser, memories }) {
  const myName      = myUser?.global_name || myUser?.username || 'me';
  const myHandle    = myUser?.username ? ` (@${myUser.username})` : '';
  const theirName   = otherUser?.global_name || otherUser?.name || 'them';
  const theirHandle = otherUser?.username ? ` (@${otherUser.username})` : '';

  let base = customPrompt?.trim() || preset?.system?.trim() || 'You are a helpful assistant.';
  // Resolve {owner} placeholder in preset system prompts
  base = base.replace(/\{owner\}/g, myName);

  const context = `
CONTEXT:
- You are responding on behalf of ${myName}${myHandle} in a Discord DM with ${theirName}${theirHandle}.
- "assistant" role = messages sent BY ${myName}. "user" role = messages sent BY ${theirName}.

CRITICAL RULES:
- Output ONLY the raw message text. No labels, no name prefixes, no preamble like "Sure!" or "Of course!".
- Write as ${myName} — match their tone and style from the conversation history.
- Be concise and natural. This is Discord chat.
- Never reveal you are an AI. Never break character.
- No asterisk actions. No emoji unless the existing chat already uses them.`.trim();

  const memBlock = memories?.length
    ? `\n\nKNOWN FACTS ABOUT ${theirName.toUpperCase()}:\n${memories.map(m => `- ${m.content}`).join('\n')}`
    : '';

  return `${base}\n\n${context}${memBlock}`;
}

function buildAIMessages(messages, myUserId) {
  return messages
    .filter(m => m.content?.trim()) // skip empty/attachment-only messages
    .slice(-30)
    .map(m => ({
      role: (m.author?.id === myUserId || m.author?.id === 'me') ? 'assistant' : 'user',
      content: m.content.trim(),
    }));
}

function shouldAutoRespond(msg, config, myUserId) {
  if (!config?.enabled) return false;
  if (!msg?.author?.id) return false;
  if (msg.author.id === myUserId || msg.author.id === 'me') return false;
  const mode = config.responseMode || 'manual';
  if (mode === 'disabled' || mode === 'manual') return false;
  if (mode === 'all') return true;
  if (mode === 'mentions') return msg.content?.includes(`<@${myUserId}>`);
  if (mode === 'contains') {
    const t = config.responseTriggerText?.toLowerCase();
    return t ? msg.content?.toLowerCase().includes(t) : false;
  }
  if (mode === 'starts_with') {
    const t = config.responseTriggerText?.toLowerCase();
    return t ? msg.content?.toLowerCase().startsWith(t) : false;
  }
  return false;
}

function cleanAIResponse(text) {
  let out = text?.trim() || '';
  out = out.replace(/^[\w\s]{1,25}:\s+/, '');
  if (out.startsWith('"') && out.endsWith('"')) out = out.slice(1, -1);
  return out.trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Core AI runner — reads everything fresh from store ────────────────────────
async function runAI(convId, messageList, addToApprovalQueue, setMessages) {
  const s = useAppStore.getState();

  const conv = s.discordConversations.find(c => c.id === convId) || s.selectedConversation;

  const ap = s.activeProvider;
  if (!ap) return;
  const pc = s.providers[ap];
  if (!pc?.enabled) return;

  const convCfg    = s.conversationConfigs[convId] || {};
  const allPresets = [...DEFAULT_PRESETS, ...s.customPresets];
  const preset     = allPresets.find(p => p.id === (convCfg.presetId || 'assistant')) || allPresets[1];

  const myUser   = s.discordUser;
  const myName   = myUser?.global_name || myUser?.username || 'me';
  const uid      = myUser?.id;

  // ── Intro message for personas that have one ──────────────────────────────
  // Only send if: preset has an intro, this conv hasn't sent one yet,
  // and the AI message list is empty (first exchange) or only has one user msg
  const aiMsgs = buildAIMessages(messageList, uid);
  const hasOurMessages = aiMsgs.some(m => m.role === 'assistant');
  const shouldSendIntro = !convCfg.sentIntro && !hasOurMessages && preset.introMessage;

  if (shouldSendIntro) {
    const introText = resolveIntroMessage(preset.introMessage, myName);
    if (introText) {
      // Mark intro as sent before sending to prevent races
      useAppStore.getState().updateConversationConfig(convId, { sentIntro: true });

      const settings = s.settings;
      await applyDelayAndTyping(convId, introText, s.discordToken, settings);

      await new DiscordService(s.discordToken).sendMessage(convId, introText);
      const introMsg = {
        id: `intro_${Date.now()}`,
        content: introText,
        author: { id: uid || 'me', username: myUser?.username || 'You', globalName: myUser?.global_name },
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, introMsg]);
      return; // Don't generate an additional AI response right now
    }
  }

  // ── Normal AI response ────────────────────────────────────────────────────
  if (!aiMsgs.length) return;
  if (aiMsgs[aiMsgs.length - 1]?.role === 'assistant') return;

  const systemPrompt = buildSystemPrompt({
    preset,
    customPrompt: convCfg.customSystemPrompt,
    myUser,
    otherUser: conv,
    memories: s.memories[convId] || [],
  });

  const svc    = new AIProviderService({ providerId: ap, ...pc });
  const result = await svc.generateResponse(aiMsgs, systemPrompt, { maxTokens: 300 });
  const content = cleanAIResponse(result.content);
  if (!content) return;

  const approvalMode = convCfg.approvalMode || 'always';

  if (approvalMode === 'always') {
    addToApprovalQueue({
      id:               `approval_${Date.now()}`,
      conversationId:   convId,
      conversationName: conv?.name,
      draftContent:     content,
      generatedAt:      new Date().toISOString(),
      model:            result.model || ap,
      usage:            result.usage,
    });
  } else {
    // Auto-send with optional delay + typing
    await applyDelayAndTyping(convId, content, s.discordToken, s.settings);
    await new DiscordService(s.discordToken).sendMessage(convId, content);
    const sentMsg = {
      id:        `sent_${Date.now()}`,
      content,
      author:    { id: uid || 'me', username: myUser?.username || 'You', globalName: myUser?.global_name },
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, sentMsg]);
  }
}

// ── Delay + typing indicator logic ────────────────────────────────────────────
async function applyDelayAndTyping(convId, content, token, settings) {
  if (!settings) return;

  const { messageDelayEnabled, messageDelayMin, messageDelayMax,
          typingIndicatorEnabled } = settings;

  // Calculate delay
  let delayMs = 0;
  if (messageDelayEnabled) {
    const minMs = (messageDelayMin || 1) * 1000;
    const maxMs = (messageDelayMax || 5) * 1000;
    delayMs = minMs + Math.random() * (maxMs - minMs);
  }

  if (typingIndicatorEnabled && token && delayMs > 0) {
    // Send typing indicator for the duration of the delay
    const typingInterval = setInterval(async () => {
      try {
        await fetch(`https://discord.com/api/v10/channels/${convId}/typing`, {
          method: 'POST',
          headers: { Authorization: token, 'User-Agent': 'Mozilla/5.0' },
        });
      } catch (_) {}
    }, 5000); // Discord typing lasts ~10s, refresh every 5s

    // Also trigger immediately
    try {
      await fetch(`https://discord.com/api/v10/channels/${convId}/typing`, {
        method: 'POST',
        headers: { Authorization: token, 'User-Agent': 'Mozilla/5.0' },
      });
    } catch (_) {}

    await sleep(delayMs);
    clearInterval(typingInterval);
  } else if (delayMs > 0) {
    await sleep(delayMs);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversationView() {
  const {
    selectedConversation,
    conversationPermissions,
    discordToken,
    discordUser,
    approvalQueue,
    addToApprovalQueue,
    removeFromApprovalQueue,
    addMemory,
  } = useAppStore();

  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  // Config panel open by default
  const [sidePanel,  setSidePanel]  = useState('config');
  const [generating, setGenerating] = useState(false);

  const messagesEndRef  = useRef(null);

  // Single ref holding all mutable poll state — never causes re-renders
  const poll = useRef({
    convId:           null,
    discordToken:     null,
    lastSeenId:       null,
    isGenerating:     false,
    addToApprovalQueue: null,
    setMessages:      null,
  });

  // Keep ref in sync every render
  poll.current.convId              = selectedConversation?.id;
  poll.current.discordToken        = discordToken;
  poll.current.addToApprovalQueue  = addToApprovalQueue;
  poll.current.setMessages         = setMessages;

  const convId        = selectedConversation?.id;
  const hasPermission = convId ? conversationPermissions[convId] : false;
  const myUserId      = discordUser?.id;

  const config = convId ? (useAppStore.getState().conversationConfigs[convId] || {}) : {};
  const { activeProvider, providers } = useAppStore.getState();
  const pendingApprovals = approvalQueue.filter(a => a.conversationId === convId);
  const autoMode = config.responseMode &&
    config.responseMode !== 'manual' &&
    config.responseMode !== 'disabled';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!convId || !discordToken || !hasPermission) {
      setMessages([]);
      poll.current.lastSeenId = null;
      return;
    }
    setLoading(true);
    new DiscordService(discordToken)
      .getChannelMessages(convId, 50)
      .then(msgs => {
        const formatted = (msgs || []).map(DiscordService.formatMessage).reverse();
        setMessages(formatted);
        if (formatted.length) poll.current.lastSeenId = formatted[formatted.length - 1].id;
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [convId, discordToken, hasPermission]);

  // ── Master polling interval — created ONCE, never recreated ──────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const ps = poll.current;
      if (!ps.convId || !ps.discordToken || ps.isGenerating) return;

      const s          = useAppStore.getState();
      const permission = s.conversationPermissions[ps.convId];
      if (!permission) return;

      const convConfig = s.conversationConfigs[ps.convId] || {};
      const isAuto     = convConfig.enabled &&
        convConfig.responseMode &&
        convConfig.responseMode !== 'manual' &&
        convConfig.responseMode !== 'disabled';

      let fetched;
      try {
        fetched = await new DiscordService(ps.discordToken).getChannelMessages(ps.convId, 20);
      } catch (_) { return; }

      if (!fetched?.length) return;

      const formatted = fetched.map(DiscordService.formatMessage).reverse();
      const latestId  = formatted[formatted.length - 1]?.id;

      // Find truly new messages
      const lastSeen  = ps.lastSeenId;
      const newMsgs   = lastSeen
        ? formatted.filter(m => { try { return BigInt(m.id) > BigInt(lastSeen); } catch(_){return false;} })
        : [];

      // Add new messages to UI
      if (newMsgs.length > 0) {
        ps.setMessages(prev => {
          const ids   = new Set(prev.map(m => m.id));
          const toAdd = newMsgs.filter(m => !ids.has(m.id));
          return toAdd.length ? [...prev, ...toAdd] : prev;
        });
      }

      // Always update lastSeenId to the real Discord latest
      if (latestId) ps.lastSeenId = latestId;

      // Auto-respond?
      if (!isAuto || !newMsgs.length) return;

      const myUid   = s.discordUser?.id;
      const lastNew = newMsgs[newMsgs.length - 1];
      if (!shouldAutoRespond(lastNew, convConfig, myUid)) return;

      ps.isGenerating = true;
      try {
        await runAI(ps.convId, formatted, ps.addToApprovalQueue, ps.setMessages);
      } catch (err) {
        console.error('Auto-respond error:', err.message);
      } finally {
        ps.isGenerating = false;
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []); // empty — created once, reads everything from refs

  // ── Manual generate ───────────────────────────────────────────────────────
  const handleManualGenerate = useCallback(async () => {
    if (!convId || !discordToken || generating) return;
    setGenerating(true);
    try {
      const fetched  = await new DiscordService(discordToken).getChannelMessages(convId, 30);
      const fullList = (fetched || []).map(DiscordService.formatMessage).reverse();
      setMessages(fullList);
      if (fullList.length) poll.current.lastSeenId = fullList[fullList.length - 1].id;
      await runAI(convId, fullList, addToApprovalQueue, setMessages);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [convId, discordToken, generating, addToApprovalQueue]);

  const handleRefresh = useCallback(async () => {
    if (!convId || !discordToken) return;
    const fetched = await new DiscordService(discordToken).getChannelMessages(convId, 50).catch(() => []);
    const list = (fetched || []).map(DiscordService.formatMessage).reverse();
    setMessages(list);
    if (list.length) poll.current.lastSeenId = list[list.length - 1].id;
  }, [convId, discordToken]);

  const sendMessage = useCallback(async (content) => {
    if (!discordToken || !convId || !content?.trim()) return;
    const s = useAppStore.getState();
    await applyDelayAndTyping(convId, content, discordToken, s.settings);
    try {
      await new DiscordService(discordToken).sendMessage(convId, content);
      const msg = {
        id: `local_${Date.now()}`, content,
        author: { id: myUserId || 'me', username: discordUser?.username || 'You', globalName: discordUser?.global_name },
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, msg]);
      poll.current.lastSeenId = msg.id;
    } catch (err) { alert(`Send failed: ${err.message}`); }
  }, [discordToken, convId, myUserId, discordUser]);

  const handleApprove = useCallback(async (item, editedContent) => {
    const final = editedContent?.trim() || item.draftContent;
    await sendMessage(final);
    removeFromApprovalQueue(item.id);
    if (editedContent && editedContent !== item.draftContent) {
      addMemory(convId, `User prefers: "${editedContent.slice(0, 120)}"`);
    }
  }, [sendMessage, removeFromApprovalQueue, convId, addMemory]);

  const handleReject = useCallback(item => removeFromApprovalQueue(item.id), [removeFromApprovalQueue]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!selectedConversation) {
    return (
      <div className="empty-state" style={{ flex: 1 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.2 }}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Select a conversation</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.7 }}>Choose a DM from the left panel</div>
      </div>
    );
  }

  if (!hasPermission) return <PermissionGate conversation={selectedConversation} />;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div className="conversation-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
              {selectedConversation.avatar
                ? <img src={selectedConversation.avatar} alt={selectedConversation.name} />
                : selectedConversation.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedConversation.name}</div>
              {selectedConversation.username && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{selectedConversation.username}</div>
              )}
            </div>
            {config.enabled && (
              <span className="badge badge-accent" style={{ marginLeft: 4 }}>
                {autoMode ? 'Auto' : 'AI Active'}
              </span>
            )}
            {config.enabled && autoMode && (
              <span className="badge badge-success" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                <IconZap /> live
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={handleRefresh} title="Refresh">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            </button>
            <button className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setSidePanel(v => v === 'memory' ? null : 'memory')}
              style={{ color: sidePanel === 'memory' ? 'var(--accent)' : undefined }} title="Memory">
              <IconBrain />
            </button>
            <button className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setSidePanel(v => v === 'config' ? null : 'config')}
              style={{ color: sidePanel === 'config' ? 'var(--accent)' : undefined }} title="AI Config">
              <IconSettings2 />
            </button>
          </div>
        </div>

        {/* Approvals */}
        {pendingApprovals.length > 0 && (
          <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)',
            background: 'var(--bg-raised)', flexShrink: 0 }}>
            <div className="section-label" style={{ marginBottom: 4 }}>Pending approval ({pendingApprovals.length})</div>
            {pendingApprovals.map(item => (
              <ApprovalCard key={item.id} item={item} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="message-area">
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-4)' }}><span className="spinner" /></div>}
          {!loading && messages.length === 0 && <div className="empty-state"><span style={{ fontSize: 12 }}>No messages yet</span></div>}
          {messages.map(msg => <MessageRow key={msg.id} message={msg} myUserId={myUserId} />)}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom bar */}
        <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', gap: 'var(--sp-2)', alignItems: 'center',
          background: 'var(--bg-surface)', flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>
            {!activeProvider
              ? <span style={{ color: 'var(--warning)' }}>No AI provider — go to AI Model tab</span>
              : config.enabled
                ? autoMode
                  ? <><span style={{ color: 'var(--success)' }}>Auto-responding</span> · {providers[activeProvider]?.selectedModel}</>
                  : <>Manual · {providers[activeProvider]?.selectedModel}</>
                : <span>Enable AI in the config panel <span style={{ color: 'var(--text-secondary)' }}>(top right)</span></span>
            }
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleManualGenerate} disabled={generating || !activeProvider}>
            {generating ? <><span className="spinner spinner-sm" /> Generating...</> : <><IconZap /> Generate Reply</>}
          </button>
        </div>
      </div>

      {/* Side panels */}
      {sidePanel === 'config' && (
        <div style={{ width: 300, borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideInRight 0.2s ease' }}>
          <PerUserControls conversationId={convId} onClose={() => setSidePanel(null)} />
        </div>
      )}
      {sidePanel === 'memory' && (
        <div style={{ width: 280, borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideInRight 0.2s ease' }}>
          <MemoryPanel conversationId={convId} onClose={() => setSidePanel(null)} />
        </div>
      )}
    </div>
  );
}

function MessageRow({ message, myUserId }) {
  const isOutgoing  = message.author?.id === myUserId || message.author?.id === 'me';
  const initials    = (message.author?.username || '?').slice(0, 2).toUpperCase();
  const time        = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const displayName = isOutgoing ? 'You' : (message.author?.globalName || message.author?.username || 'Unknown');

  // Render attachments/embeds/stickers gracefully
  const hasContent  = message.content?.trim();
  const attachments = message.attachments || [];
  const stickers    = message.sticker_items || [];
  const embeds      = message.embeds || [];

  return (
    <div className={`message-row ${isOutgoing ? 'outgoing' : ''}`}>
      <div className="message-avatar">
        {message.author?.avatar
          ? <img src={message.author.avatar} alt={displayName} />
          : <span>{initials}</span>}
      </div>
      <div style={{ minWidth: 0, maxWidth: '72%' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexDirection: isOutgoing ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{displayName}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{time}</span>
        </div>
        {hasContent && <div className="message-bubble">{message.content}</div>}
        {/* Attachments (images, GIFs, files) */}
        {attachments.map((att, i) => {
          const isImage = att.content_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.filename || att.url || '');
          if (isImage) {
            return (
              <div key={i} style={{ marginTop: hasContent ? 6 : 0 }}>
                <img src={att.url || att.proxy_url} alt={att.filename || 'image'}
                  style={{ maxWidth: 280, maxHeight: 200, borderRadius: 'var(--r-md)', display: 'block', objectFit: 'contain', background: 'var(--bg-overlay)' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
            );
          }
          return (
            <div key={i} style={{ marginTop: hasContent ? 6 : 0 }}>
              <a href={att.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline' }}>
                {att.filename || 'attachment'}
              </a>
            </div>
          );
        })}
        {/* Stickers */}
        {stickers.map((s, i) => (
          <div key={i} style={{ marginTop: hasContent ? 6 : 0, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            [Sticker: {s.name}]
          </div>
        ))}
        {/* Embeds (links) */}
        {!hasContent && !attachments.length && !stickers.length && embeds.map((emb, i) => (
          <div key={i} className="message-bubble" style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {emb.title || emb.description || '[embed]'}
          </div>
        ))}
        {/* Completely empty message fallback */}
        {!hasContent && !attachments.length && !stickers.length && !embeds.length && (
          <div className="message-bubble" style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>[media]</div>
        )}
      </div>
    </div>
  );
}
