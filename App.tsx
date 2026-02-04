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
const llmAdapter = new MockLLMAdapter();
const agentPresenter = new AgentPresenter();
const agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);

// Circular dependency wiring
agentPresenter.setUseCase(agentUseCase);

export default function App() {
  const [route, setRoute] = useState<AppRoute>(AppRoute.MODE_SELECTION);
  const [config, setConfig] = useState<Partial<AgentConfig>>({
    mode: 'JOB_SEARCH',
    targetSite: 'hh.ru'
  });
  const [agentState, setAgentState] = useState<AgentState>(createInitialAgentState());

  // Bind View to Presenter
  useEffect(() => {
    // Check for saved config/state on mount
    storageAdapter.getConfig().then(c => {
      if (c) setConfig(c);
    });
    
    storageAdapter.getAgentState().then(s => {
      if (s) setAgentState(s);
    });

    agentPresenter.bind((newState) => {
      setAgentState(newState);
    });

    return () => agentPresenter.unbind();
  }, []);

  // Navigation Handlers
  const handleModeSelect = (mode: string) => {
    setConfig(prev => ({ ...prev, mode }));
    setRoute(AppRoute.SITE_SELECTION);
  };

  const handleSiteSelect = (site: string) => {
    setConfig(prev => ({ ...prev, targetSite: site }));
    setRoute(AppRoute.SETTINGS);
  };

  const handleConfigSave = async () => {
    if (config.mode && config.targetSite) {
        await storageAdapter.saveConfig(config as AgentConfig);
        setRoute(AppRoute.AGENT_RUNNER);
    }
  };

  // Agent Actions
  const handleRun = () => agentPresenter.startLoginSequence(agentState, config);
  const handleStop = () => agentPresenter.cancelSequence(agentState);
  const handleConfirmLogin = () => agentPresenter.confirmLogin(agentState);
  const handleConfirmProfile = () => agentPresenter.confirmProfilePage(agentState);
  const handleResetProfile = () => agentPresenter.resetProfile(agentState);
  const handleReset = () => agentPresenter.resetSession(agentState);
  
  // Stage 5 Actions (Search Config)
  const handleContinueToSearch = () => agentPresenter.continueToSearch(agentState);
  const handleScanSearchUI = () => agentPresenter.scanSearchUI(agentState);

  // Router
  let screen;
  switch (route) {
    case AppRoute.MODE_SELECTION:
      screen = <ModeSelectionScreen onSelect={handleModeSelect} />;
      break;
    case AppRoute.SITE_SELECTION:
      screen = <SiteSelectionScreen onSelect={handleSiteSelect} onBack={() => setRoute(AppRoute.MODE_SELECTION)} />;
      break;
    case AppRoute.SETTINGS:
      screen = <SettingsScreen onSave={handleConfigSave} />;
      break;
    case AppRoute.AGENT_RUNNER:
      screen = (
        <AgentStatusScreen 
          state={agentState} 
          onRun={handleRun}
          onStop={handleStop}
          onConfirmLogin={handleConfirmLogin}
          onConfirmProfile={handleConfirmProfile}
          onResetProfile={handleResetProfile}
          onReset={handleReset}
          onContinueToSearch={handleContinueToSearch}
          onScanSearchUI={handleScanSearchUI}
        />
      );
      break;
    default:
      screen = <ModeSelectionScreen onSelect={handleModeSelect} />;
  }

  return screen;
}