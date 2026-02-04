import React, { useState, useEffect } from 'react';
import { AppRoute, AgentConfig } from './types';
import { AgentState, createInitialAgentState } from './core/domain/entities';
import { MockBrowserAdapter } from './adapters/browser/mock.browser.adapter';
import { LocalStorageAdapter } from './adapters/storage/local.storage.adapter';
import { MockLLMAdapter } from './adapters/llm/mock.llm.adapter';
import { AgentUseCase } from './core/usecases/agent.usecase';
import { AgentPresenter } from './adapters/ui/agent.presenter';

// Screens
import { ModeSelectionScreen } from './presentation/screens/ModeSelectionScreen';
import { SiteSelectionScreen } from './presentation/screens/SiteSelectionScreen';
import { SettingsScreen } from './presentation/screens/SettingsScreen';
import { AgentStatusScreen } from './presentation/screens/AgentStatusScreen';

// Composition Root
const browserAdapter = new MockBrowserAdapter();
const storageAdapter = new LocalStorageAdapter();
const llmAdapter = new MockLLMAdapter(); // Inject LLM
const agentPresenter = new AgentPresenter(); // Acts as UIPort
const agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
agentPresenter.setUseCase(agentUseCase); // Circular wiring

function App() {
  const [route, setRoute] = useState<AppRoute>(AppRoute.MODE_SELECTION);
  const [config, setConfig] = useState<Partial<AgentConfig>>({});
  const [agentState, setAgentState] = useState<AgentState>(createInitialAgentState());

  // Bind Presenter to React State
  useEffect(() => {
    agentPresenter.bind(setAgentState);
    return () => agentPresenter.unbind();
  }, []);

  // Restore state on load
  useEffect(() => {
    const restore = async () => {
       const saved = await storageAdapter.getAgentState();
       if (saved) setAgentState(saved);
    };
    restore();
  }, []);

  const handleModeSelect = (mode: string) => {
    setConfig(prev => ({ ...prev, mode }));
    setRoute(AppRoute.SITE_SELECTION);
  };

  const handleSiteSelect = (site: string) => {
    setConfig(prev => ({ ...prev, targetSite: site }));
    setRoute(AppRoute.SETTINGS);
  };

  const handleSettingsSave = async () => {
    await storageAdapter.saveConfig(config as AgentConfig);
    setRoute(AppRoute.AGENT_RUNNER);
  };

  const runAgent = () => {
    agentPresenter.startLoginSequence(agentState, config);
  };

  const confirmLogin = () => {
    agentPresenter.confirmLogin(agentState);
  }

  const confirmProfile = () => {
    agentPresenter.confirmProfilePage(agentState);
  }

  const resetProfile = () => {
    agentPresenter.resetProfile(agentState);
  }

  const stopAgent = () => {
    agentPresenter.cancelSequence(agentState);
  };

  const resetAgent = () => {
    agentPresenter.resetSession(agentState);
  };

  const renderScreen = () => {
    switch (route) {
      case AppRoute.MODE_SELECTION:
        return <ModeSelectionScreen onSelect={handleModeSelect} />;
      case AppRoute.SITE_SELECTION:
        return <SiteSelectionScreen onSelect={handleSiteSelect} onBack={() => setRoute(AppRoute.MODE_SELECTION)} />;
      case AppRoute.SETTINGS:
        return <SettingsScreen onSave={handleSettingsSave} />;
      case AppRoute.AGENT_RUNNER:
        return <AgentStatusScreen 
          state={agentState} 
          onRun={runAgent} 
          onStop={stopAgent} 
          onConfirmLogin={confirmLogin}
          onConfirmProfile={confirmProfile}
          onResetProfile={resetProfile}
          onReset={resetAgent}
        />;
      default:
        return <div className="p-10 text-white">404 Screen</div>;
    }
  };

  return (
    <div className="h-full w-full">
      {renderScreen()}
    </div>
  );
}

export default App;