import React, { useState, useEffect } from 'react';
import { AgentConfig, AppRoute, AgentStatus, WorkMode } from './types';
import { AgentState, createInitialAgentState } from './core/domain/entities';
import { AgentUseCase } from './core/usecases/agent.usecase';
import { AgentPresenter } from './adapters/ui/agent.presenter';
import { BrowserPort } from './core/ports/browser.port';
import { LLMProviderPort } from './core/ports/llm.port';

import { LocalStorageAdapter } from './adapters/storage/local.storage.adapter';
import { MockBrowserAdapter } from './adapters/browser/mock.browser.adapter';
import { RemoteBrowserAdapter } from './adapters/browser/remote.browser.adapter';
import { ElectronIPCAdapter } from './adapters/browser/electron.ipc.adapter';
import { McpBrowserAdapter } from './adapters/browser/mcp.browser.adapter';

import { MockLLMAdapter } from './adapters/llm/mock.llm.adapter';
import { GeminiLLMAdapter } from './adapters/llm/gemini.llm.adapter';
import { OpenAILLMAdapter } from './adapters/llm/openai.llm.adapter';

import { computeRuntimeCapabilities, validateConfigAgainstRuntime, RuntimeCapabilitiesV1 } from './core/domain/runtime';

import { ModeSelectionScreen } from './presentation/screens/ModeSelectionScreen';
import { SiteSelectionScreen } from './presentation/screens/SiteSelectionScreen';
import { SettingsScreen } from './presentation/screens/SettingsScreen';
import { AgentStatusScreen } from './presentation/screens/AgentStatusScreen';

// Global Singleton-ish instances
const storageAdapter = new LocalStorageAdapter();
const agentPresenter = new AgentPresenter();
let agentUseCase: AgentUseCase | null = null;
let currentBrowserAdapter: BrowserPort | null = null;
let currentBrowserProvider: string | undefined = undefined;

const DEFAULT_CONFIG: AgentConfig = {
  mode: 'JOB_SEARCH',
  targetSite: 'hh.ru',
  useMockBrowser: true, // Safe default
  targetWorkModes: [WorkMode.REMOTE],
  minSalary: 100000,
  currency: 'RUB',
  autoCoverLetter: true
};

const App: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [agentState, setAgentState] = useState<AgentState>(createInitialAgentState());
  const [route, setRoute] = useState<string>(AppRoute.MODE_SELECTION);
  const [runtimeCaps, setRuntimeCaps] = useState<RuntimeCapabilitiesV1>(computeRuntimeCapabilities());

  useEffect(() => {
    // 1. Load Capabilities
    const caps = computeRuntimeCapabilities();
    setRuntimeCaps(caps);

    // 2. Load Config
    storageAdapter.getConfig().then(saved => {
      if (saved) setConfig({ ...DEFAULT_CONFIG, ...saved });
    });

    // 3. Load State
    storageAdapter.getAgentState().then(saved => {
      if (saved) {
          setAgentState(saved);
      }
    });

    // 4. Bind Presenter
    agentPresenter.bind(setAgentState);

    // 5. Global Event Listener for Wipe
    const wipeHandler = () => {
        setAgentState(createInitialAgentState());
        storageAdapter.saveAgentState(createInitialAgentState());
    };
    window.addEventListener('AGENT_WIPE_MEMORY', wipeHandler);

    return () => {
      agentPresenter.unbind();
      window.removeEventListener('AGENT_WIPE_MEMORY', wipeHandler);
    };
  }, []);

  const handleConfigChange = (key: keyof AgentConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = async (andTest = false) => {
    await storageAdapter.saveConfig(config);
  };

  const buildAdapters = (cfg: AgentConfig) => {
    // Browser
    let browserAdapter: BrowserPort;
    let activeBrowserProvider = cfg.browserProvider;

    if (cfg.useMockBrowser) {
        browserAdapter = new MockBrowserAdapter();
        activeBrowserProvider = 'mock';
    } else {
        // STRICT MODE: Only proceed if a REAL provider is actually available.
        if (cfg.browserProvider === 'remote_node' && cfg.nodeRunnerUrl) {
            browserAdapter = new RemoteBrowserAdapter(cfg.nodeRunnerUrl);
        } else if (cfg.browserProvider === 'mcp' && cfg.mcpServerUrl) {
            browserAdapter = new McpBrowserAdapter(cfg.mcpServerUrl);
        } else if (runtimeCaps.hasElectronAPI) {
            browserAdapter = new ElectronIPCAdapter();
            activeBrowserProvider = 'electron_ipc';
        } else {
            // CRITICAL: DO NOT FALLBACK TO MOCK. THROW ERROR.
            const errMsg = "ОШИБКА ЗАПУСКА: Выбран режим REAL, но среда выполнения (Electron/Playwright) недоступна.\n\nРешение:\n1. Запустите приложение через 'npm start' (Electron).\n2. Или переключитесь в режим MOCK (Симуляция) в Настройках.";
            console.error(errMsg);
            throw new Error(errMsg);
        }
    }

    // LLM
    let llmAdapter: LLMProviderPort;
    const providerId = cfg.activeLLMProviderId || 'mock';
    
    if (providerId === 'gemini_cloud') {
        llmAdapter = new GeminiLLMAdapter(cfg.apiKey || '');
    } else if (['openai_cloud', 'deepseek_cloud', 'local_llm'].includes(providerId)) {
        let baseUrl = 'https://api.openai.com/v1';
        let model = 'gpt-4';
        
        if (providerId === 'deepseek_cloud') {
            baseUrl = 'https://api.deepseek.com';
            model = 'deepseek-chat';
        } else if (providerId === 'local_llm') {
            baseUrl = cfg.localGatewayUrl || 'http://localhost:1234/v1';
            model = 'local-model';
        }

        llmAdapter = new OpenAILLMAdapter(cfg.apiKey || '', baseUrl, model);
    } else {
        llmAdapter = new MockLLMAdapter();
    }

    return { browserAdapter, llmAdapter, activeBrowserProvider };
  };

  const handleLaunchAgent = async () => {
      // 1. Validate Config vs Runtime (Soft Check)
      const validation = validateConfigAgainstRuntime(config, runtimeCaps);
      if (!validation.ok) {
          alert("Ошибка конфигурации: " + validation.issues.map(i => i.message).join('\n'));
          return;
      }
      
      await storageAdapter.saveConfig(config);

      try {
          // 2. Build Adapters (Hard Check - will throw if Real mode is impossible)
          const { browserAdapter, llmAdapter, activeBrowserProvider } = buildAdapters(config);
          
          currentBrowserAdapter = browserAdapter; 
          currentBrowserProvider = activeBrowserProvider;

          // 3. Initialize UseCase
          agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
          agentPresenter.setUseCase(agentUseCase);
          agentPresenter.setConfig(config);

          setRoute(AppRoute.AGENT_RUNNER);
          
          const isRunning = agentState.status !== AgentStatus.IDLE && 
                            agentState.status !== AgentStatus.FAILED && 
                            agentState.status !== AgentStatus.COMPLETED &&
                            agentState.status !== AgentStatus.WAITING_FOR_SITE_SELECTION;

          if (!isRunning) {
              agentPresenter.startLoginSequence(agentState, config);
          } else {
              agentPresenter.renderState(agentState);
          }

      } catch (e: any) {
          // Catch the Strict Mode Error and alert the user
          alert(e.message);
          // Do not change route, stay on config screen
      }
  };

  const handleStopAgent = async () => {
      if (agentPresenter) {
          await agentPresenter.cancelSequence(agentState);
      }
  };

  const handlePauseAgent = async () => {
      if (agentUseCase) {
          await agentUseCase.setPauseState(agentState, true);
      }
  };

  const handleResumeAgent = async () => {
      if (agentUseCase) {
          await agentUseCase.setPauseState(agentState, false);
      }
  };

  const handleConfirmLogin = async () => {
      if (agentPresenter) {
          await agentPresenter.confirmLogin(agentState);
      }
  };

  const handleResetAgent = async () => {
      if (agentPresenter) {
          await agentPresenter.resetSession(agentState);
      }
  };

  const handleWipeMemory = async () => {
      if (agentPresenter) {
          await agentPresenter.wipeMemory(agentState);
      }
  };
  
  const handleCheckConnection = async (cfg: Partial<AgentConfig>) => {
      return await agentPresenter.testConfiguration(cfg);
  };

  const renderContent = () => {
      switch (route) {
          case AppRoute.MODE_SELECTION:
              return (
                  <ModeSelectionScreen 
                      config={config}
                      onConfigChange={handleConfigChange}
                      onRun={handleLaunchAgent}
                      onSelect={(mode) => console.log('Mode selected', mode)}
                      onSettingsClick={() => setRoute(AppRoute.SETTINGS)}
                      onNavigate={setRoute}
                      appliedHistory={agentState.appliedHistory}
                      onWipeMemory={handleWipeMemory}
                  />
              );
          
          case AppRoute.SITE_SELECTION:
              return (
                  <SiteSelectionScreen 
                      onSelect={(site) => {
                          handleConfigChange('targetSite', site);
                          setRoute(AppRoute.MODE_SELECTION);
                      }}
                      onBack={() => setRoute(AppRoute.MODE_SELECTION)}
                      onSettingsClick={() => setRoute(AppRoute.SETTINGS)}
                      onNavigate={setRoute}
                  />
              );

          case AppRoute.SETTINGS:
              return (
                  <SettingsScreen 
                      config={config}
                      onChange={handleConfigChange}
                      onSave={handleSaveConfig}
                      onBack={() => setRoute(AppRoute.MODE_SELECTION)}
                      onNavigate={setRoute}
                      runtimeCaps={runtimeCaps}
                      onWipeMemory={handleWipeMemory}
                      tokenLedger={agentState.tokenLedger}
                      onCheckConnection={handleCheckConnection}
                  />
              );

          case AppRoute.AGENT_RUNNER:
              return (
                  <AgentStatusScreen 
                      state={agentState}
                      onRun={handleLaunchAgent}
                      onStop={handleStopAgent}
                      onPause={handlePauseAgent}
                      onResume={handleResumeAgent}
                      onConfirmLogin={handleConfirmLogin}
                      onReset={handleResetAgent}
                      onNavigate={setRoute}
                      isMock={config.useMockBrowser || false}
                      onWipeMemory={handleWipeMemory}
                      browserAdapter={currentBrowserAdapter || undefined}
                  />
              );

          default:
              return (
                <ModeSelectionScreen 
                    config={config}
                    onConfigChange={handleConfigChange}
                    onRun={handleLaunchAgent}
                    onSelect={() => {}}
                    onSettingsClick={() => setRoute(AppRoute.SETTINGS)}
                    onNavigate={setRoute}
                    appliedHistory={agentState.appliedHistory}
                />
              );
      }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
        {renderContent()}
    </div>
  );
};

export default App;