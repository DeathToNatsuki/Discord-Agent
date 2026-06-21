// GlobalPoller.jsx
// Runs in the background regardless of which conversation is open.
// Handles:
//   1. Auto-responding across ALL enabled conversations (not just the selected one)
//   2. Auto-accepting friend requests
//
// This component renders nothing — it's mounted once at the app root.

import { useEffect, useRef } from 'react';
import { useAppStore, DEFAULT_PRESETS } from '../../store/appStore';
import { DiscordService } from '../../services/discordService';
import { AIProviderService } from '../../services/aiService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSystemPrompt({ preset, customPrompt, myUser, otherUser, memories }) {
  const myName      = myUser?.global_name || myUser?.username || 'me';
  const theirName   = otherUser?.global_name || otherUser?.name || 'them';
  const theirHandle = otherUser?.username ? ` (@${otherUser.username})` : '';
  let base = customPrompt?.trim() || preset?.system?.trim() || 'You are a helpful assistant.';
  base = base.replace(/\{owner\}/g, myName);

  return `${base}

CONTEXT:
- You are responding on behalf of ${myName} in a Discord DM with ${theirName}${theirHandle}.
- "assistant" role = messages BY ${myName}. "user" role = messages BY ${theirName}.

CRITICAL RULES:
- Output ONLY the raw message text. No labels, no name prefixes, no preamble.
- Write as ${myName}. Be concise and natural.
- Never reveal you are an AI.${memories?.length
  ? `\n\nKNOWN FACTS ABOUT ${theirName.toUpperCase()}:\n${memories.map(m => `- ${m.content}`).join('\n')}`
  : ''}`;
}

function buildAIMessages(messages, myUserId) {
  return messages
    .filter(m => m.content?.trim())
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
  return new Promise(r => setTimeout(r, ms));
}

async function applyDelayAndTyping(convId, token, settings) {
  if (!settings) return;
  const { messageDelayEnabled, messageDelayMin, messageDelayMax, typingIndicatorEnabled } = settings;
  if (!messageDelayEnabled) return;

  const minMs = (messageDelayMin || 1) * 1000;
  const maxMs = (messageDelayMax || 5) * 1000;
  const delayMs = minMs + Math.random() * (maxMs - minMs);

  if (typingIndicatorEnabled && token) {
    const tick = async () => {
      try {
        await fetch(`https://discord.com/api/v10/channels/${convId}/typing`, {
          method: 'POST',
          headers: { Authorization: token, 'User-Agent': 'Mozilla/5.0' },
        });
      } catch (_) {}
    };
    await tick();
    const interval = setInterval(tick, 5000);
    await sleep(delayMs);
    clearInterval(interval);
  } else {
    await sleep(delayMs);
  }
}

// ── Global Poller Component ───────────────────────────────────────────────────

export default function GlobalPoller() {
  // Track last-seen message ID per conversation to detect new messages
  const lastSeenIds    = useRef({}); // { convId: lastMessageId }
  const generating     = useRef({}); // { convId: boolean } — prevent overlapping per conv
  const friendPollRef  = useRef(null);

  useEffect(() => {
    // ── Main polling interval ─────────────────────────────────────────────
    const interval = setInterval(async () => {
      const s = useAppStore.getState();

      if (!s.discordConnected || !s.discordToken) return;

      const myUserId = s.discordUser?.id;
      const token    = s.discordToken;

      // Get all conversations that have AI enabled with an auto-respond mode
      const autoConvs = s.discordConversations.filter(conv => {
        const cfg = s.conversationConfigs[conv.id];
        const perm = s.conversationPermissions[conv.id];
        if (!perm || !cfg?.enabled) return false;
        const mode = cfg.responseMode;
        return mode && mode !== 'manual' && mode !== 'disabled';
      });

      if (!autoConvs.length) return;

      const ap = s.activeProvider;
      if (!ap) return;
      const pc = s.providers[ap];
      if (!pc?.enabled) return;

      // Poll each auto-enabled conversation
      for (const conv of autoConvs) {
        // Skip if already generating for this conv
        if (generating.current[conv.id]) continue;

        let fetched;
        try {
          fetched = await new DiscordService(token).getChannelMessages(conv.id, 10);
        } catch (_) { continue; }

        if (!fetched?.length) continue;

        const formatted = fetched.map(DiscordService.formatMessage).reverse();
        const latestId  = formatted[formatted.length - 1]?.id;
        const lastSeen  = lastSeenIds.current[conv.id];

        // Initialize lastSeen on first poll — don't auto-respond to old messages
        if (!lastSeen) {
          lastSeenIds.current[conv.id] = latestId;
          continue;
        }

        // Find new messages
        const newMsgs = formatted.filter(m => {
          try { return BigInt(m.id) > BigInt(lastSeen); } catch (_) { return false; }
        });

        // Update lastSeen immediately
        if (latestId) lastSeenIds.current[conv.id] = latestId;

        if (!newMsgs.length) continue;

        // Check if the newest new message warrants a response
        const freshConfig = useAppStore.getState().conversationConfigs[conv.id] || {};
        const lastNew     = newMsgs[newMsgs.length - 1];

        if (!shouldAutoRespond(lastNew, freshConfig, myUserId)) continue;

        // Generate response
        generating.current[conv.id] = true;
        try {
          const freshS     = useAppStore.getState();
          const allPresets = [...DEFAULT_PRESETS, ...freshS.customPresets];
          const preset     = allPresets.find(p => p.id === (freshConfig.presetId || 'assistant')) || allPresets[1];

          // Get more context for this conversation
          let contextMsgs = formatted;
          try {
            const more = await new DiscordService(token).getChannelMessages(conv.id, 30);
            if (more?.length) contextMsgs = more.map(DiscordService.formatMessage).reverse();
          } catch (_) {}

          const aiMessages = buildAIMessages(contextMsgs, myUserId);
          if (!aiMessages.length || aiMessages[aiMessages.length - 1]?.role === 'assistant') {
            continue;
          }

          const systemPrompt = buildSystemPrompt({
            preset,
            customPrompt: freshConfig.customSystemPrompt,
            myUser: freshS.discordUser,
            otherUser: conv,
            memories: freshS.memories[conv.id] || [],
          });

          const svc    = new AIProviderService({ providerId: ap, ...pc });
          const result = await svc.generateResponse(aiMessages, systemPrompt, { maxTokens: 300 });
          const content = cleanAIResponse(result.content);
          if (!content) continue;

          const approvalMode = freshConfig.approvalMode || 'always';

          if (approvalMode === 'always') {
            useAppStore.getState().addToApprovalQueue({
              id:               `approval_${Date.now()}`,
              conversationId:   conv.id,
              conversationName: conv.name,
              draftContent:     content,
              generatedAt:      new Date().toISOString(),
              model:            result.model || ap,
              usage:            result.usage,
            });
          } else {
            await applyDelayAndTyping(conv.id, token, freshS.settings);
            await new DiscordService(token).sendMessage(conv.id, content);
            // Update lastSeen so we don't re-process our own sent message
            try {
              const check = await new DiscordService(token).getChannelMessages(conv.id, 1);
              if (check?.length) lastSeenIds.current[conv.id] = check[0].id;
            } catch (_) {}
          }
        } catch (err) {
          console.error(`GlobalPoller error for ${conv.name}:`, err.message);
        } finally {
          generating.current[conv.id] = false;
        }
      }
    }, 2000); // 2s global poll — slightly offset from the per-conv 1.5s

    // ── Friend request polling ────────────────────────────────────────────
    const friendInterval = setInterval(async () => {
      const s = useAppStore.getState();
      if (!s.discordConnected || !s.discordToken) return;
      if (!s.settings.autoAcceptFriendRequests) return;

      try {
        const svc      = new DiscordService(s.discordToken);
        const pending  = await svc.getPendingFriendRequests();
        if (!pending?.length) return;

        for (const req of pending) {
          const userId = req.user?.id || req.id;
          if (!userId) continue;

          // Accept the friend request
          await svc.acceptFriendRequest(userId);

          // Open a DM and send the greeting
          const greeting = s.settings.friendRequestGreeting?.trim();
          if (greeting) {
            try {
              const dm = await svc.openDMWithUser(userId);
              if (dm?.id) {
                await applyDelayAndTyping(dm.id, s.discordToken, s.settings);
                await svc.sendMessage(dm.id, greeting);

                // Add the new DM to the conversation list
                const newConv = DiscordService.formatConversation(dm);
                const existing = useAppStore.getState().discordConversations;
                if (!existing.find(c => c.id === dm.id)) {
                  useAppStore.getState().setDiscordConversations([newConv, ...existing]);
                }
              }
            } catch (e) {
              console.error('Failed to send friend greeting:', e.message);
            }
          }
        }
      } catch (err) {
        // Silently fail — relationship endpoint may not be accessible
      }
    }, 10000); // check every 10s

    return () => {
      clearInterval(interval);
      clearInterval(friendInterval);
    };
  }, []); // mount once, read everything from store via getState()

  return null; // renders nothing
}
