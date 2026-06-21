import React, { useState } from 'react';
import { useAppStore } from '../../../store/appStore';
import { DiscordService } from '../../../services/discordService';

const IconDiscord = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--discord)">
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

export default function DiscordConnect() {
  const { setDiscordToken, setDiscordConnected, setDiscordConversations } = useAppStore();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) {
      setError('Please enter your Discord token.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const service = new DiscordService(token.trim());
      const result = await service.testToken();

      if (!result.success) {
        setError(result.error || 'Invalid token. Please check and try again.');
        return;
      }

      // Load DM channels
      const channels = await service.getDMChannels();
      const conversations = (channels || []).map(DiscordService.formatConversation);

      setDiscordToken(token.trim());
      setDiscordConnected(true, result.user);
      setDiscordConversations(conversations);
    } catch (err) {
      setError(err.message || 'Connection failed. Check your token and network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-6)' }}>
      <div style={{ width: '100%', maxWidth: 280, textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: 56,
          height: 56,
          background: 'var(--discord-dim)',
          borderRadius: 'var(--r-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--sp-4)',
          border: '1px solid rgba(88,101,242,0.2)',
        }}>
          <IconDiscord />
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 'var(--sp-2)', color: 'var(--text-primary)' }}>
          Connect Discord
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--sp-5)', lineHeight: 1.6 }}>
          Enter your Discord token to access your direct messages.
        </div>

        {/* Warning */}
        <div style={{
          background: 'var(--warning-dim)',
          border: '1px solid rgba(253,203,110,0.25)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-3)',
          marginBottom: 'var(--sp-4)',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>Note</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Using your Discord token gives this app account access. Use responsibly. This is stored only on your device.
          </div>
        </div>

        {/* Token input */}
        <div style={{ position: 'relative', marginBottom: 'var(--sp-3)' }}>
          <input
            type={showToken ? 'text' : 'password'}
            className="input"
            placeholder="Discord token..."
            value={token}
            onChange={(e) => { setToken(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, paddingRight: 36 }}
          />
          <button
            onClick={() => setShowToken((v) => !v)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 2,
              display: 'flex',
            }}
          >
            <IconLock />
          </button>
        </div>

        {error && (
          <div style={{
            fontSize: 12,
            color: 'var(--error)',
            marginBottom: 'var(--sp-3)',
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--error-dim)',
            borderRadius: 'var(--r-md)',
            textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleConnect}
          disabled={loading || !token.trim()}
        >
          {loading ? <><span className="spinner spinner-sm" /> Connecting...</> : 'Connect'}
        </button>

        <div style={{ marginTop: 'var(--sp-4)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          How to get your token: Open Discord in a browser, press F12, go to Network, send a message, find the request and look for the "authorization" header.
        </div>
      </div>
    </div>
  );
}
