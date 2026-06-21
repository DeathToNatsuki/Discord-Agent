import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../../store/appStore';

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);

const IconDisconnect = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 010 12.73M5.64 5.64a9 9 0 000 12.73M12 12h.01M2 12h2M20 12h2M12 2v2M12 20v2"/>
  </svg>
);

export default function ConversationList() {
  const {
    discordConversations,
    selectedConversation,
    setSelectedConversation,
    conversationConfigs,
    setDiscordConnected,
    setDiscordConversations,
    approvalQueue,
  } = useAppStore();

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return discordConversations;
    const q = search.toLowerCase();
    return discordConversations.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q)
    );
  }, [discordConversations, search]);

  const handleDisconnect = () => {
    setDiscordConnected(false, null);
    setDiscordConversations([]);
    setSelectedConversation(null);
  };

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Direct Messages</span>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={handleDisconnect}
          title="Disconnect"
        >
          <IconDisconnect />
        </button>
      </div>

      <div style={{ padding: 'var(--sp-3)', flexShrink: 0 }}>
        <div className="search-wrapper">
          <IconSearch />
          <input
            className="input"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel-body" style={{ paddingTop: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--sp-8) var(--sp-4)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span style={{ fontSize: 12 }}>No conversations found</span>
          </div>
        ) : (
          <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((conv) => {
              const config = conversationConfigs[conv.id];
              const isActive = selectedConversation?.id === conv.id;
              const pendingCount = approvalQueue.filter((a) => a.conversationId === conv.id).length;
              const initials = (conv.name || '?').slice(0, 2).toUpperCase();

              return (
                <button
                  key={conv.id}
                  className={`conversation-item animate-fade-in ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="conversation-avatar">
                    {conv.avatar ? (
                      <img src={conv.avatar} alt={conv.name} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">{conv.name}</div>
                    {conv.username && (
                      <div className="conversation-preview">@{conv.username}</div>
                    )}
                  </div>
                  <div className="conversation-meta">
                    {config?.enabled && (
                      <span className="status-dot online" />
                    )}
                    {pendingCount > 0 && (
                      <span className="sidebar-nav-badge" style={{ fontSize: 9 }}>{pendingCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
