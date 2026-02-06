
import React, { useState, useEffect } from 'react';
import { AppRoute, AgentConfig, AgentStatus } from './types';
import { AgentState, createInitialAgentState, UserSearchPrefsV1 } from './core/domain/entities';
import { computeRuntimeCapabilities, validateConfigAgainstRuntime, ConfigIssueV1 } from './core/domain/runtime';
import { MockBrowserAdapter } from './adapters/browser/mock.browser.adapter';
import { RemoteBrowserAdapter } from './adapters/browser/remote.browser.adapter';
import { LocalStorageAdapter } from './adapters/storage/local.storage.adapter';
import { MockLLMAdapter } from './adapters/llm/mock.llm.adapter';
import { GeminiLLMAdapter } from './adapters/llm/gemini.llm.adapter';
import { OpenAILLMAdapter } from './adapters/llm/openai.llm.adapter';
import { AgentUseCase } from './core/usecases/agent.usecase';
import { AgentPresenter } from './adapters/ui/agent.presenter';
import { DEFAULT_LLM_PROVIDER, LLMProviderRegistry } from './core/domain/llm_registry';

// Screens
import { ModeSelectionScreen } from './presentation/screens/ModeSelectionScreen';
import { SiteSelectionScreen } from './presentation/screens/SiteSelectionScreen';
import { SettingsScreen } from './presentation/screens/SettingsScreen';
import { JobPreferencesScreen } from './presentation/screens/JobPreferencesScreen'; // NEW
import { AgentStatusScreen } from './presentation/screens/AgentStatusScreen';

// Core singleton for storage (always local)
const storageAdapter = new LocalStorageAdapter();
const runtimeCaps = computeRuntimeCapabilities();

// Factory for dynamic adapters
const buildAdapters = (config: Partial<AgentConfig>) => {
  // Browser Adapter Selection - ENFORCE REAL
  let browserAdapter;
  let activeBrowserProvider = config.browserProvider || 'remote_node'; // Default to remote node if undefined

  // 1. Try Native Playwright (Node Env)
  if (runtimeCaps.supportsPlaywright && activeBrowserProvider === 'playwright') {
      try {
          // @ts-ignore
          const { PlaywrightBrowserAdapter } = require('./adapters/browser/node/playwright.browser.adapter');
          browserAdapter = new PlaywrightBrowserAdapter();
      } catch (e) {
          console.error("Failed to load Playwright in Node env", e);
          // Fallback to Remote if local fails
          browserAdapter = new RemoteBrowserAdapter(config.nodeRunnerUrl || 'http://localhost:3000');
          activeBrowserProvider = 'remote_node';
      }
  } 
  // 2. Default/Fallback to Remote Node Runner (Web/Electron split)
  else {
      // User requested "No Mock", so we default to Remote Adapter even if it might fail connection
      browserAdapter = new RemoteBrowserAdapter(config.nodeRunnerUrl || 'http://localhost:3000');
      activeBrowserProvider = 'remote_node';
  }

  // LLM Adapter Selection (Updated for DeepSeek & Local)
  let llmAdapter;
  const providerId = config.activeLLMProviderId || DEFAULT_LLM_PROVIDER;
  const providerDef = LLMProviderRegistry[providerId] || LLMProviderRegistry[DEFAULT_LLM_PROVIDER];

  if (providerDef.id === 'gemini_cloud') {
     if (config.apiKey) {
         llmAdapter = new GeminiLLMAdapter(config.apiKey);
     } else {
         console.warn("Missing API Key for Gemini. Falling back to Mock.");
         llmAdapter = new MockLLMAdapter();
     }
  } else if (['openai_cloud', 'deepseek_cloud', 'local_llm'].includes(providerDef.id)) {
      const baseUrl = providerDef.id === 'local_llm' 
        ? (config.localGatewayUrl || providerDef.defaultBaseUrl) 
        : providerDef.defaultBaseUrl;
      
      const apiKey = config.apiKey || 'dummy'; // Dummy key for Local LLM if not set

      llmAdapter = new OpenAILLMAdapter(
          apiKey,
          baseUrl,
          providerDef.modelId || 'gpt-4'
      );
  } else {
      llmAdapter = new MockLLMAdapter();
  }

  return { browserAdapter, llmAdapter, providerId, providerDef, activeBrowserProvider };
};

// Initial wiring
const { browserAdapter: initBrowser, llmAdapter: initLLM } = buildAdapters({});
const agentPresenter = new AgentPresenter();
let agentUseCase = new AgentUseCase(initBrowser, storageAdapter, agentPresenter, initLLM);
agentPresenter.setUseCase(agentUseCase);

export default function App() {
  const [route, setRoute] = useState<AppRoute>(AppRoute.MODE_SELECTION);
  const [lastRoute, setLastRoute] = useState<AppRoute>(AppRoute.MODE_SELECTION); 
  
  const [config, setConfig] = useState<Partial<AgentConfig>>({
    mode: 'JOB_SEARCH',
    targetSite: 'hh.ru',
    activeLLMProviderId: DEFAULT_LLM_PROVIDER,
    browserProvider: 'remote_node', // Enforce Real by default
    localGatewayUrl: 'http://localhost:1234/v1',
    minSalary: 100000,
    currency: 'RUB'
  });
  const [agentState, setAgentState] = useState<AgentState>(createInitialAgentState());

  // Bind View to Presenter
  useEffect(() => {
    storageAdapter.getConfig().then(c => {
      if (c) {
        // Merge defaults with saved config
        const merged = { ...config, ...c };
        // Enforce Real Browser Logic
        if (!merged.browserProvider || merged.browserProvider === 'mock') {
             merged.browserProvider = runtimeCaps.supportsPlaywright ? 'playwright' : 'remote_node';
        }
        
        setConfig(merged);
        const { browserAdapter, llmAdapter } = buildAdapters(merged);
        agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
        agentPresenter.setUseCase(agentUseCase);
        agentPresenter.setConfig(merged);
      }
    });
    
    storageAdapter.getAgentState().then(s => {
      if (s) setAgentState(s);
    });

    agentPresenter.bind((newState) => {
      setAgentState(newState);
    });

    return () => agentPresenter.unbind();
  }, []);

  // --- Actions ---

  // Central Navigation Handler for Sidebar
  const handleNavigate = (target: string) => {
      // Map string route to Enum if needed, or just cast
      if (target === 'MODE_SELECTION') {
          setRoute(AppRoute.MODE_SELECTION);
      } else if (target === 'SETTINGS') {
          setLastRoute(route);
          setRoute(AppRoute.SETTINGS);
      }
  };

  const handleGlobalSettingsOpen = () => {
      setLastRoute(route);
      setRoute(AppRoute.SETTINGS);
  };

  const handleModeSelect = (mode: string) => {
    setConfig(prev => ({ ...prev, mode }));
    setRoute(AppRoute.SITE_SELECTION);
  };

  const handleSiteSelect = (site: string) => {
    setConfig(prev => ({ ...prev, targetSite: site }));
    setRoute(AppRoute.JOB_PREFERENCES);
  };

  const handleSystemConfigSave = async () => {
      const validation = validateConfigAgainstRuntime(config, runtimeCaps);
      if (validation.ok) {
          await storageAdapter.saveConfig(config as AgentConfig);
          const { browserAdapter, llmAdapter } = buildAdapters(config);
          agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
          agentPresenter.setUseCase(agentUseCase);
          
          // User Requirement: "say ok saved, store the config and return to main"
          alert("Configuration Saved."); 
          setRoute(AppRoute.MODE_SELECTION); 
      } else {
          alert("Configuration Error: " + validation.issues[0].message);
      }
  };

  const handleLaunchAgent = async () => {
      const validation = validateConfigAgainstRuntime(config, runtimeCaps);
      if (!validation.ok) {
          alert("Configuration Error. Check Settings.");
          return;
      }
      await storageAdapter.saveConfig(config as AgentConfig);
      setRoute(AppRoute.AGENT_RUNNER);
      agentPresenter.startLoginSequence(agentState, config);
  };

  const handleStop = () => agentPresenter.cancelSequence(agentState);
  const handleConfirmLogin = () => agentPresenter.confirmLogin(agentState);
  const handleReset = async () => {
      await agentPresenter.resetSession(agentState);
      setRoute(AppRoute.MODE_SELECTION);
  };
  
  // Pause Logic
  const handlePause = () => {
      agentUseCase.setPauseState(agentState, true);
  };
  const handleResume = () => {
      agentUseCase.setPauseState(agentState, false);
  };

  // Router
  let screen;
  switch (route) {
    case AppRoute.MODE_SELECTION:
      screen = <ModeSelectionScreen 
                  onSelect={handleModeSelect} 
                  onSettingsClick={handleGlobalSettingsOpen}
                  onNavigate={handleNavigate}
               />;
      break;
    case AppRoute.SITE_SELECTION:
      screen = <SiteSelectionScreen 
                  onSelect={handleSiteSelect} 
                  onBack={() => setRoute(AppRoute.MODE_SELECTION)} 
                  onSettingsClick={handleGlobalSettingsOpen} 
                  onNavigate={handleNavigate}
               />;
      break;
    case AppRoute.JOB_PREFERENCES:
      screen = <JobPreferencesScreen 
        config={config} 
        onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
        onRun={handleLaunchAgent}
        onBack={() => setRoute(AppRoute.SITE_SELECTION)}
        onSettingsClick={handleGlobalSettingsOpen}
        onNavigate={handleNavigate}
      />;
      break;
    case AppRoute.SETTINGS:
      screen = <SettingsScreen 
        config={config} 
        onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
        onSave={handleSystemConfigSave} 
        onBack={() => setRoute(lastRoute)}
        onNavigate={handleNavigate}
      />;
      break;
    case AppRoute.AGENT_RUNNER:
      screen = (
        <AgentStatusScreen 
          state={agentState} 
          onRun={handleLaunchAgent} 
          onStop={handleStop}
          onConfirmLogin={handleConfirmLogin}
          onReset={handleReset}
          onSettingsClick={handleGlobalSettingsOpen}
          onPause={handlePause}
          onResume={handleResume}
          onNavigate={handleNavigate}
        />
      );
      break;
    default:
      screen = <ModeSelectionScreen 
                  onSelect={handleModeSelect} 
                  onSettingsClick={handleGlobalSettingsOpen} 
                  onNavigate={handleNavigate}
               />;
  }

  return screen;
}
