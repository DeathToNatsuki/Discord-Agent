import React from 'react';
import { useAppStore } from '../../store/appStore';
import ConversationList from './Conversations/ConversationList';
import ConversationView from './Conversations/ConversationView';
import DiscordConnect from './DiscordIntegration/DiscordConnect';

export default function AgentTab() {
  const { discordConnected } = useAppStore();

  return (
    <div className="agent-layout">
      <div className="agent-left-panel">
        {discordConnected ? <ConversationList /> : <DiscordConnect />}
      </div>
      <div className="agent-right-panel">
        <ConversationView />
      </div>
    </div>
  );
}
