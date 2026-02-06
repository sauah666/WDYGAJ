
import React, { useState, useEffect } from 'react';
import { AppRoute, AgentConfig } from './types';
import { AgentState, createInitialAgentState, UserSearchPrefsV1 } from './core/domain/entities';
import { MockBrowserAdapter } from './adapters/browser/mock.browser.adapter';
import { PlaywrightBrowserAdapter } from './adapters/browser/playwright.browser.adapter';
import { LocalStorageAdapter } from './adapters/storage/local.storage.adapter';
import { MockLLMAdapter } from './adapters/llm/mock.llm.adapter';
import { GeminiLLMAdapter } from './adapters/llm/gemini.llm.adapter';
import { AgentUseCase } from './core/usecases/agent.usecase';
import { AgentPresenter } from './adapters/ui/agent.presenter';
import { DEFAULT_LLM_PROVIDER, LLMProviderRegistry } from './core/domain/llm_registry';

// Screens
import { ModeSelectionScreen } from './presentation/screens/ModeSelectionScreen';
import { SiteSelectionScreen } from './presentation/screens/SiteSelectionScreen';
import { SettingsScreen } from './presentation/screens/SettingsScreen';
import { AgentStatusScreen } from './presentation/screens/AgentStatusScreen';

// Core singleton for storage (always local)
const storageAdapter = new LocalStorageAdapter();

// Factory for dynamic adapters
const buildAdapters = (config: Partial<AgentConfig>) => {
  // Browser
  let browserAdapter;
  if (config.browserProvider === 'real') {
    browserAdapter = new PlaywrightBrowserAdapter();
  } else {
    browserAdapter = new MockBrowserAdapter();
  }

  // LLM - Phase G1: Logic updated to use activeLLMProviderId
  let llmAdapter;
  const providerId = config.activeLLMProviderId || DEFAULT_LLM_PROVIDER;
  const providerDef = LLMProviderRegistry[providerId] || LLMProviderRegistry[DEFAULT_LLM_PROVIDER];

  // Validation Check Logic (Soft check for factory, error reported via UI later)
  // We default to Mock if invalid or missing to ensure system creates stable object graph
  
  if (providerDef.id === 'gemini_cloud') {
     if (config.apiKey) {
         llmAdapter = new GeminiLLMAdapter(config.apiKey);
     } else {
         console.warn("Missing API Key for Gemini. Falling back to Mock temporarily.");
         llmAdapter = new MockLLMAdapter();
     }
  } else if (providerDef.id === 'openai_cloud') {
      console.warn("OpenAI Adapter not implemented, using Mock");
      llmAdapter = new MockLLMAdapter();
  } else {
      // Default / Local / Mock
      llmAdapter = new MockLLMAdapter();
  }

  return { browserAdapter, llmAdapter, providerId, providerDef };
};

// Initial wiring (default mock)
const { browserAdapter: initBrowser, llmAdapter: initLLM } = buildAdapters({});
const agentPresenter = new AgentPresenter();
let agentUseCase = new AgentUseCase(initBrowser, storageAdapter, agentPresenter, initLLM);
agentPresenter.setUseCase(agentUseCase);

export default function App() {
  const [route, setRoute] = useState<AppRoute>(AppRoute.MODE_SELECTION);
  const [config, setConfig] = useState<Partial<AgentConfig>>({
    mode: 'JOB_SEARCH',
    targetSite: 'hh.ru',
    activeLLMProviderId: DEFAULT_LLM_PROVIDER,
    browserProvider: 'mock'
  });
  const [agentState, setAgentState] = useState<AgentState>(createInitialAgentState());

  // Bind View to Presenter
  useEffect(() => {
    // Check for saved config/state on mount
    storageAdapter.getConfig().then(c => {
      if (c) {
        setConfig(c);
        
        // Re-wire adapters based on saved config
        const { browserAdapter, llmAdapter, providerDef } = buildAdapters(c);
        agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
        agentPresenter.setUseCase(agentUseCase);
        agentPresenter.setConfig(c);

        // Phase G1: Check for Config Validity on Load
        if (providerDef.envKeys.includes('apiKey') && !c.apiKey) {
             agentPresenter.reportLLMConfigError(createInitialAgentState(), `API Key required for ${providerDef.label}`);
        }
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
        
        // HOT RE-WIRING OF ADAPTERS
        console.log("Re-wiring adapters with new config:", config);
        const { browserAdapter, llmAdapter, providerDef } = buildAdapters(config);
        
        agentUseCase = new AgentUseCase(browserAdapter, storageAdapter, agentPresenter, llmAdapter);
        agentPresenter.setUseCase(agentUseCase);

        // Phase G1: Check Validity
        if (providerDef.envKeys.includes('apiKey') && !config.apiKey) {
             // We allow saving but warn / block running
             agentPresenter.reportLLMConfigError(agentState, `Missing API Key for ${providerDef.label}`);
        }

        setRoute(AppRoute.AGENT_RUNNER);
    }
  };

  // Agent Actions
  const handleRun = () => {
      // Final Check before running
      const providerId = config.activeLLMProviderId || DEFAULT_LLM_PROVIDER;
      const def = LLMProviderRegistry[providerId];
      
      if (def && def.envKeys.includes('apiKey') && !config.apiKey) {
          agentPresenter.reportLLMConfigError(agentState, `Cannot start: Missing API Key for ${def.label}`);
          return;
      }
      
      agentPresenter.startLoginSequence(agentState, config);
  };
  
  const handleStop = () => agentPresenter.cancelSequence(agentState);
  const handleConfirmLogin = () => agentPresenter.confirmLogin(agentState);
  const handleConfirmProfile = () => agentPresenter.confirmProfilePage(agentState);
  const handleResetProfile = () => agentPresenter.resetProfile(agentState);
  const handleReset = () => agentPresenter.resetSession(agentState);
  
  // Stage 5 Actions (Search Config)
  const handleContinueToSearch = () => agentPresenter.continueToSearch(agentState);
  const handleScanSearchUI = () => agentPresenter.scanSearchUI(agentState);
  const handleAnalyzeSearchUI = () => agentPresenter.analyzeSearchUI(agentState);
  const handleSubmitSearchPrefs = (prefs: UserSearchPrefsV1) => agentPresenter.submitSearchPrefs(agentState, prefs);
  const handleBuildPlan = () => agentPresenter.planSearchActions(agentState);
  
  // Phase A Actions
  const handleExecuteStep = () => agentPresenter.executePlanStep(agentState);
  const handleExecuteCycle = () => agentPresenter.executePlanCycle(agentState);
  const handleVerifyFilters = () => agentPresenter.verifySearchFilters(agentState);

  // Phase B Actions
  const handleCollectBatch = () => agentPresenter.collectVacancyBatch(agentState);
  const handleDedupBatch = () => agentPresenter.dedupVacancyBatch(agentState);

  // Phase C Actions
  const handleRunPrefilter = () => agentPresenter.runScriptPrefilter(agentState);
  const handleRunLLMScreening = () => agentPresenter.runLLMBatchScreening(agentState);

  // Phase D Actions
  const handleRunExtraction = () => agentPresenter.runVacancyExtraction(agentState);
  const handleRunLLMEvalBatch = () => agentPresenter.runLLMEvalBatch(agentState);
  const handleBuildApplyQueue = () => agentPresenter.buildApplyQueue(agentState);

  // Phase E Actions
  const handleProbeApplyEntrypoint = () => agentPresenter.probeApplyEntrypoint(agentState);
  const handleOpenApplyForm = () => agentPresenter.openApplyForm(agentState);
  const handleFillApplyDraft = () => agentPresenter.fillApplyDraft(agentState);
  const handleSubmitApply = () => agentPresenter.submitApply(agentState);

  // Phase F1 Actions
  const handleResolveDrift = () => agentPresenter.resolveDomDrift(agentState);

  // Phase F2 Actions
  const handleSelectSite = (siteId: string) => agentPresenter.selectActiveSite(agentState, siteId);

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
      screen = <SettingsScreen 
        config={config} 
        onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
        onSave={handleConfigSave} 
      />;
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
          onAnalyzeSearchUI={handleAnalyzeSearchUI}
          onSubmitSearchPrefs={handleSubmitSearchPrefs}
          onBuildPlan={handleBuildPlan}
          onExecuteStep={handleExecuteStep}
          onExecuteCycle={handleExecuteCycle}
          onVerifyFilters={handleVerifyFilters}
          onCollectBatch={handleCollectBatch}
          onDedupBatch={handleDedupBatch}
          onRunPrefilter={handleRunPrefilter}
          onRunLLMScreening={handleRunLLMScreening}
          onRunExtraction={handleRunExtraction}
          onRunLLMEvalBatch={handleRunLLMEvalBatch}
          onBuildApplyQueue={handleBuildApplyQueue}
          onProbeApplyEntrypoint={handleProbeApplyEntrypoint}
          onOpenApplyForm={handleOpenApplyForm}
          onFillApplyDraft={handleFillApplyDraft}
          onSubmitApply={handleSubmitApply}
          onResolveDrift={handleResolveDrift}
          onSelectSite={handleSelectSite}
        />
      );
      break;
    default:
      screen = <ModeSelectionScreen onSelect={handleModeSelect} />;
  }

  return screen;
}
