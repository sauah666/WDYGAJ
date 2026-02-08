
// Layer: DOMAIN / LOGIC
// Purpose: Handle runtime detection, capabilities, and configuration validation.

import { AgentConfig } from '../../types';

export type RuntimeEnvKind = 'BROWSER_UI' | 'NODE_RUNNER' | 'ELECTRON_RENDERER';

export interface RuntimeCapabilitiesV1 {
  kind: RuntimeEnvKind;
  hasNodeRuntime: boolean;
  hasRequire: boolean; 
  supportsPlaywright: boolean;
  supportsLocalLLMGateway: boolean;
  hasElectronAPI: boolean; // New capability
}

export interface ConfigIssueV1 {
  code: 'UNSUPPORTED_BROWSER_RUNTIME' | 'MISSING_API_KEY' | 'MISSING_LOCAL_GATEWAY' | 'MISSING_NODE_RUNNER_URL' | 'NOT_IMPLEMENTED';
  scope: 'BROWSER' | 'LLM' | 'SETTINGS';
  message: string;
  blocking: boolean;
}

export const computeRuntimeCapabilities = (): RuntimeCapabilitiesV1 => {
  // Simple heuristics to detect environment
  const isNode = typeof process !== 'undefined' && (process as any).versions != null && (process as any).versions.node != null;
  // @ts-ignore
  const hasRequire = typeof require === 'function';
  // @ts-ignore
  const hasElectronAPI = typeof window !== 'undefined' && !!window.electronAPI;
  
  let kind: RuntimeEnvKind = 'BROWSER_UI';
  if (isNode) kind = 'NODE_RUNNER';
  if (hasElectronAPI) kind = 'ELECTRON_RENDERER';

  return {
    kind,
    hasNodeRuntime: isNode,
    hasRequire: hasRequire,
    supportsPlaywright: isNode && hasRequire,
    supportsLocalLLMGateway: true,
    hasElectronAPI
  };
};

export const validateConfigAgainstRuntime = (config: Partial<AgentConfig>, caps: RuntimeCapabilitiesV1): { ok: boolean; issues: ConfigIssueV1[] } => {
    const issues: ConfigIssueV1[] = [];

    // Browser Runtime Validation
    if (config.browserProvider === 'playwright') {
        // If we are in Electron Renderer, Playwright is supported VIA IPC, not directly.
        // But the "playwright" provider in App.tsx usually means "Native Node". 
        // We will treat Electron as a separate valid path or alias it.
        if (!caps.supportsPlaywright && !caps.hasElectronAPI) {
            issues.push({
                code: 'UNSUPPORTED_BROWSER_RUNTIME',
                scope: 'BROWSER',
                message: 'Playwright is not available directly in this browser. Use Electron or Mock.',
                blocking: false // WARN only
            });
        }
    }

    // LLM Validation
    if (config.activeLLMProviderId === 'gemini_cloud' || config.activeLLMProviderId === 'openai_cloud' || config.activeLLMProviderId === 'deepseek_cloud') {
        if (!config.apiKey) {
            issues.push({
                code: 'MISSING_API_KEY',
                scope: 'LLM',
                message: `API Key required for ${config.activeLLMProviderId}.`,
                blocking: true
            });
        }
    }

    if (config.activeLLMProviderId === 'local_llm') {
        if (!config.localGatewayUrl) {
            issues.push({
                code: 'MISSING_LOCAL_GATEWAY',
                scope: 'LLM',
                message: 'Local Gateway URL required for Local LLM (e.g. http://localhost:1234/v1).',
                blocking: true
            });
        }
    }

    return {
        ok: issues.filter(i => i.blocking).length === 0,
        issues
    };
};
