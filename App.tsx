
import React, { useState, useEffect, useRef } from 'react';
import { AppRoute, AgentConfig, AgentStatus } from './types';
import { AgentState, createInitialAgentState, UserSearchPrefsV1 } from './core/domain/entities';
import { computeRuntimeCapabilities, validateConfigAgainstRuntime, ConfigIssueV1 } from './core/domain/runtime';
import { MockBrowserAdapter } from './adapters/browser/mock.browser.adapter';
import { RemoteBrowserAdapter } from './adapters/browser/remote.browser.adapter';
import { McpBrowserAdapter } from './adapters/browser/mcp.browser.adapter'; // NEW
import { LocalStorageAdapter } from './adapters/storage/local.storage.adapter';
import { ElectronIPCAdapter } from './adapters/browser/electron.ipc.adapter';
import { MockLLMAdapter } from './adapters/llm/mock.llm.adapter';
import { GeminiLLMAdapter } from './adapters/llm/gemini.llm.adapter';
import { OpenAILLMAdapter } from './adapters/llm/openai.llm.adapter';
import { AgentUseCase } from './core/usecases/agent.usecase';
import { AgentPresenter } from './adapters/ui/agent.presenter';
import { DEFAULT_LLM_PROVIDER, LLMProviderRegistry } from './core/domain/llm_registry';

// Screens
import { ModeSelectionScreen } from './presentation/screens/ModeSelectionScreen';
import { SettingsScreen } from './presentation/screens/SettingsScreen';
import { AgentStatusScreen } from './presentation/screens/AgentStatusScreen';

// Core singleton for storage (always local)
const storageAdapter = new LocalStorageAdapter();
const runtimeCaps = computeRuntimeCapabilities();

// Factory for dynamic adapters
const buildAdapters = (config: Partial<AgentConfig>) => {
  // Browser Adapter Selection Strategy:
  // 1. Force Mock if config.useMockBrowser is explicitly true.
  // 2. If running in Electron, prefer ElectronIPCAdapter.
  // 3. Fallback to MockBrowserAdapter.
  
  let browserAdapter;
  let activeBrowserProvider = 'mock'; 

  if (config.useMockBrowser) {
      console.log("Forced Mock Browser via Config");
      browserAdapter = new MockBrowserAdapter();
      activeBrowserProvider = 'mock';
  } else if (runtimeCaps.hasElectronAPI) {
      console.log("Electron Runtime Detected. Using IPC Adapter.");
      browserAdapter = new ElectronIPCAdapter();
      activeBrowserProvider = 'electron_ipc';
  } else {
      console.log("No native runtime detected. Fallback to Mock.");
      browserAdapter = new MockBrowserAdapter();
      activeBrowserProvider = 'mock';
  }

  // LLM Adapter Selection
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
      
      const apiKey = config.apiKey || 'dummy'; 

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

// Initial wiring - Default to Mock for safety until config loads
const { browserAdapter: initBrowser, llmAdapter: initLLM, activeBrowserProvider: initProvider } = buildAdapters({ useMockBrowser: true });
const agentPresenter = new AgentPresenter();
let agentUseCase = new AgentUseCase(initBrowser, storageAdapter, agentPresenter, initLLM);
agentPresenter.setUseCase(agentUseCase);

// Helper to keep the current adapter instance accessible to UI
let currentBrowserAdapter = initBrowser;
// Track active provider for UI rendering logic
let currentBrowserProvider = initProvider;

export default function App() {
  const [route, setRoute] = useState<AppRoute>(AppRoute.MODE_SELECTION);
  const [lastRoute, setLastRoute] = useState<AppRoute>(AppRoute.MODE_SELECTION); 
  const [skipIntro, setSkipIntro] = useState(false); 
  
  const [config, setConfig] = useState<Partial<AgentConfig>>({
    mode: 'JOB_SEARCH',
    targetSite: 'hh.ru',
    activeLLMProviderId: DEFAULT_LLM_PROVIDER,
    useMockBrowser: true, 
    localGatewayUrl: 'http://localhost:1234/v1',
    mcpServerUrl: 'http://localhost:3000/sse', 
    minSalary: 100000,
    currency: 'RUB'
  });
  const [agentState, setAgentState] = useState<AgentState>(createInitialAgentState());
  
  const agentStateRef = useRef(agentState);
  useEffect(() => { agentStateRef.current = agentState; }, [agentState]);

  // 1. INITIALIZATION (Run Once)
  useEffect(() => {
    const initAsync = async () => {
        const c = await storageAdapter.getConfig();
        const savedState = await storageAdapter.getAgentState();
        
        if (savedState) setAgentState(savedState);

        let mergedConfig = config;
        if (c) {
            mergedConfig = { ...config, ...c };
            if (mergedConfig.useMockBrowser === undefined) {
                mergedConfig.useMockBrowser = true;
            }
            setConfig(mergedConfig);
        }
        
        const { browserAdapter, llmAdapter, activeBrowserProvider } = buildAdapters(mergedConfig);
        currentBrowserAdapter = browserAdapter; 
        currentBrowserProvider = activeBrowserProvider;
        
        agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
        agentPresenter.setUseCase(agentUseCase);
        agentPresenter.setConfig(mergedConfig);
    };

    initAsync();
  }, []); 

  // 2. BIND PRESENTER
  useEffect(() => {
    agentPresenter.bind((newState) => {
      setAgentState(newState);
    });
    return () => agentPresenter.unbind();
  }, []);

  // 3. EVENT LISTENERS
  useEffect(() => {
    const handleWipe = () => {
        handleWipeWrapper();
    };
    window.addEventListener('AGENT_WIPE_MEMORY', handleWipe);
    return () => {
        window.removeEventListener('AGENT_WIPE_MEMORY', handleWipe);
    };
  }, []);

  // --- Actions ---

  const handleWipeWrapper = async () => {
      // Execute logic via presenter
      await agentPresenter.wipeMemory(agentStateRef.current);
      // Force reload state from storage to ensure UI sync
      const freshState = await storageAdapter.getAgentState();
      if (freshState) setAgentState(freshState);
  };

  const handleNavigate = (target: string) => {
      if (target === 'MODE_SELECTION') {
          setSkipIntro(false);
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

  const handleAdvancedSetup = () => {
    console.log("Advanced setup deprecated");
  };

  const handleSystemConfigSave = async () => {
      const validation = validateConfigAgainstRuntime(config, runtimeCaps);
      if (validation.ok) {
          await storageAdapter.saveConfig(config as AgentConfig);
          const { browserAdapter, llmAdapter, activeBrowserProvider } = buildAdapters(config);
          
          currentBrowserAdapter = browserAdapter; 
          currentBrowserProvider = activeBrowserProvider;

          agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
          agentPresenter.setUseCase(agentUseCase);
          agentPresenter.setConfig(config); 
          
          alert("Configuration Saved."); 
          setSkipIntro(true); 
          setRoute(AppRoute.MODE_SELECTION); 
      } else {
          alert("Configuration Error. " + validation.issues[0].message);
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
      setSkipIntro(true);
      setRoute(AppRoute.MODE_SELECTION);
  };
  
  const handlePause = () => {
      agentUseCase.setPauseState(agentState, true);
  };
  const handleResume = () => {
      agentUseCase.setPauseState(agentState, false);
  };

  const isMockActive = currentBrowserProvider === 'mock';

  let screen;
  switch (route) {
    case AppRoute.MODE_SELECTION:
      screen = <ModeSelectionScreen 
                  activeSite={config.targetSite}
                  config={config}
                  onConfigChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
                  onRun={handleLaunchAgent}
                  onSelect={handleAdvancedSetup} 
                  onSettingsClick={handleGlobalSettingsOpen} 
                  onNavigate={handleNavigate}
                  appliedHistory={agentState.appliedHistory}
                  onWipeMemory={handleWipeWrapper}
                  skipIntro={skipIntro}
               />;
      break;
    case AppRoute.SETTINGS:
      screen = <SettingsScreen 
        config={config} 
        onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
        onSave={handleSystemConfigSave} 
        onBack={() => setRoute(lastRoute)}
        onNavigate={handleNavigate}
        runtimeCaps={runtimeCaps}
        onWipeMemory={handleWipeWrapper}
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
          isMock={isMockActive}
          browserAdapter={currentBrowserAdapter}
        />
      );
      break;
    default:
      screen = <ModeSelectionScreen 
                  activeSite={config.targetSite}
                  config={config}
                  onConfigChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
                  onRun={handleLaunchAgent}
                  onSelect={handleAdvancedSetup} 
                  onSettingsClick={handleGlobalSettingsOpen} 
                  onNavigate={handleNavigate}
                  appliedHistory={agentState.appliedHistory}
                  onWipeMemory={handleWipeWrapper}
                  skipIntro={skipIntro}
               />;
  }

  return screen;
}
