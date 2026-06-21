import React, { useEffect, useCallback } from 'react';
import { useAppStore, TABS } from './store/appStore';
import TitleBar from './components/shared/TitleBar';
import Sidebar from './components/shared/Sidebar';
import AgentTab from './components/Agent/AgentTab';
import AIProviderPanel from './components/Agent/AIProvider/AIProviderPanel';
import SettingsTab from './components/Settings/SettingsTab';
import CreditsTab from './components/Credits/CreditsTab';
import UpdateBanner from './components/shared/UpdateBanner';
import GlobalPoller from './components/shared/GlobalPoller';
import { checkForUpdate } from './services/updateService';
import './styles/globals.css';
import './styles/app.css';

export default function App() {
  const { activeTab, theme, setSystemInfo, setUpdateAvailable } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Detect hardware
  useEffect(() => {
    setSystemInfo({
      totalMemory: navigator.deviceMemory
        ? navigator.deviceMemory * 1024 * 1024 * 1024
        : 8 * 1024 * 1024 * 1024,
      freeMemory: 4 * 1024 * 1024 * 1024,
      cpus: [{ model: navigator.hardwareConcurrency
        ? `${navigator.hardwareConcurrency}-core CPU`
        : 'Unknown CPU' }],
      platform: navigator.platform || 'web',
    });
  }, [setSystemInfo]);

  // Check for updates on launch (after 2s delay so UI loads first)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const update = await checkForUpdate();
      if (update) setUpdateAvailable(update);
    }, 2000);
    return () => clearTimeout(timer);
  }, [setUpdateAvailable]);

  const renderTab = useCallback(() => {
    switch (activeTab) {
      case TABS.AGENT:    return <AgentTab />;
      case TABS.MODEL:    return <div style={{ flex: 1, overflowY: 'auto' }}><AIProviderPanel fullPage /></div>;
      case TABS.SETTINGS: return <SettingsTab />;
      case TABS.CREDITS:  return <CreditsTab />;
      default:            return <AgentTab />;
    }
  }, [activeTab]);

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {renderTab()}
        </main>
      </div>
      <UpdateBanner />
      <GlobalPoller />
    </div>
  );
}
