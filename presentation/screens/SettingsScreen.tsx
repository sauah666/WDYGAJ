import React from 'react';
import { Save, Key, Shield, Globe, RotateCcw, Server, AlertTriangle, Command, Network, Wrench } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentConfig } from '../../types';
import { listProviders, DEFAULT_LLM_PROVIDER, LLMProviderRegistry } from '../../core/domain/llm_registry';
import { computeRuntimeCapabilities } from '../../core/domain/runtime';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (key: keyof AgentConfig, value: any) => void;
  onSave: () => void;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

export const SettingsScreen: React.FC<Props> = ({ config, onChange, onSave, onBack, onNavigate }) => {
  const providers = listProviders();
  const currentProviderId = config.activeLLMProviderId || DEFAULT_LLM_PROVIDER;
  
  const runtime = computeRuntimeCapabilities();
  const isBrowserEnv = runtime.kind === 'BROWSER_UI';

  const handleResetLLMConfig = () => {
      onChange('activeLLMProviderId', DEFAULT_LLM_PROVIDER);
      onChange('apiKey', '');
      onChange('localGatewayUrl', '');
  };

  return (
    <Layout title="Калибровка Системы" currentRoute="SETTINGS" onSettingsClick={() => {}} onNavigate={onNavigate}>
      <div className="max-w-5xl mx-auto mt-6">
        
        {/* Main Panel */}
        <div className="bg-[#1c1917] border-4 border-[#292524] shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
            {/* Screws */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#0c0a08] border border-[#44403c]"></div>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#0c0a08] border border-[#44403c]"></div>
            
            <div className="p-8 border-b-2 border-[#292524] bg-[#151413] flex justify-between items-end">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#292524] rounded border border-[#44403c] text-amber-600 shadow-inner">
                        <Wrench size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-serif font-bold text-[#d6d3d1] uppercase tracking-wide">Внутренняя Механика</h3>
                        <p className="text-lg text-[#78716c] mt-1 font-cursive">Настройка параметров исполнения и нейронных связей.</p>
                    </div>
                </div>
                <div className="text-[10px] font-mono text-[#44403c] uppercase border border-[#292524] px-2 py-1 bg-[#0c0a08]">
                    CONF_MOD_RU_V1
                </div>
            </div>
            
            <div className="p-8 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            
            {/* Browser Runtime Section */}
            <div className="relative p-6 border-2 border-[#292524] bg-[#1c1917]">
                <div className="absolute -top-3 left-4 bg-[#1c1917] px-2 text-xs font-bold text-amber-700 uppercase tracking-widest border-l border-r border-[#292524] font-serif">
                    Двигатель Навигации
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[12px] font-bold text-[#a8a29e] mb-2 uppercase font-serif">Режим Исполнения</label>
                        <div className="relative">
                            <select 
                                value={config.browserProvider}
                                onChange={(e) => onChange('browserProvider', e.target.value)}
                                className="w-full bg-[#0c0a08] border border-[#44403c] text-[#d6d3d1] px-4 py-3 focus:border-amber-600 outline-none appearance-none font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                            >
                                {runtime.supportsPlaywright && <option value="playwright">Local Playwright (Native)</option>}
                                <option value="remote_node">Remote Node Runner (Удаленный)</option>
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none text-[#57534e]">▼</div>
                        </div>
                    </div>

                    {config.browserProvider === 'playwright' && !isBrowserEnv && (
                        <div>
                            <label className="block text-[12px] font-bold text-[#a8a29e] mb-2 uppercase font-serif">Путь к Бинарному Файлу</label>
                            <input 
                                type="text" 
                                value={config.chromeExecutablePath || ''}
                                onChange={(e) => onChange('chromeExecutablePath', e.target.value)}
                                placeholder="Авто-определение"
                                className="w-full bg-[#0c0a08] border border-[#44403c] text-amber-100 px-4 py-3 focus:border-amber-600 outline-none font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] placeholder-[#44403c]" 
                            />
                        </div>
                    )}

                    {config.browserProvider === 'remote_node' && (
                        <div>
                            <label className="block text-[12px] font-bold text-[#a8a29e] mb-2 uppercase font-serif">Удаленный Канал</label>
                            <div className="relative">
                                <Server size={14} className="absolute left-3 top-4 text-[#57534e]" />
                                <input 
                                    type="text" 
                                    value={config.nodeRunnerUrl || ''}
                                    onChange={(e) => onChange('nodeRunnerUrl', e.target.value)}
                                    placeholder="http://localhost:3000"
                                    className="w-full bg-[#0c0a08] border border-[#44403c] text-amber-100 pl-10 pr-4 py-3 focus:border-amber-600 outline-none font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" 
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Core Section */}
            <div className="relative p-6 border-2 border-[#292524] bg-[#1c1917]">
                <div className="absolute -top-3 left-4 bg-[#1c1917] px-2 text-xs font-bold text-amber-700 uppercase tracking-widest border-l border-r border-[#292524] font-serif">
                    Когнитивное Ядро
                </div>

                <div className="flex justify-end mb-4">
                    <button 
                        onClick={handleResetLLMConfig}
                        className="text-[12px] text-[#78716c] hover:text-amber-500 flex items-center gap-2 uppercase tracking-wide border-b border-transparent hover:border-amber-500 transition-all font-serif"
                    >
                        <RotateCcw size={10} /> Заводской Сброс
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[12px] font-bold text-[#a8a29e] mb-2 uppercase font-serif">Модуль Провайдера</label>
                        <div className="relative">
                            <select 
                                value={currentProviderId}
                                onChange={(e) => onChange('activeLLMProviderId', e.target.value)}
                                className="w-full bg-[#0c0a08] border border-[#44403c] text-[#d6d3d1] px-4 py-3 focus:border-purple-600 outline-none appearance-none font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                            >
                                {providers.map(p => (
                                    <option key={p.id} value={p.id} disabled={!p.enabled}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none text-[#57534e]">▼</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {currentProviderId !== 'mock' && (
                            <div>
                                <label className="block text-[12px] font-bold text-[#a8a29e] mb-2 uppercase font-serif">Ключ Доступа</label>
                                <div className="relative">
                                    <Key size={14} className="absolute left-3 top-4 text-[#57534e]" />
                                    <input 
                                        type="password" 
                                        value={config.apiKey || ''}
                                        onChange={(e) => onChange('apiKey', e.target.value)}
                                        placeholder={currentProviderId === 'local_llm' ? "Not required" : "sk-..."}
                                        className="w-full bg-[#0c0a08] border border-[#44403c] text-amber-100 pl-10 pr-4 py-3 focus:border-purple-600 outline-none font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" 
                                    />
                                </div>
                            </div>
                        )}

                        {currentProviderId === 'local_llm' && (
                            <div>
                                <label className="block text-[12px] font-bold text-[#a8a29e] mb-2 uppercase font-serif">Локальный Шлюз</label>
                                <div className="relative">
                                    <Network size={14} className="absolute left-3 top-4 text-[#57534e]" />
                                    <input 
                                        type="text" 
                                        value={config.localGatewayUrl || ''}
                                        onChange={(e) => onChange('localGatewayUrl', e.target.value)}
                                        placeholder="http://localhost:1234/v1"
                                        className="w-full bg-[#0c0a08] border border-[#44403c] text-amber-100 pl-10 pr-4 py-3 focus:border-orange-600 outline-none font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 bg-[#151413] border-t-2 border-[#292524] flex justify-end space-x-6">
                {onBack && (
                    <button onClick={onBack} className="text-[#78716c] hover:text-[#d6d3d1] px-6 py-3 text-lg font-bold uppercase tracking-wider transition-colors border-b-2 border-transparent hover:border-[#78716c] font-serif">
                        Сбросить
                    </button>
                )}
                <button 
                    onClick={onSave}
                    className="flex items-center space-x-3 bg-amber-800 hover:bg-amber-700 text-[#f5f5f4] px-8 py-3 font-bold uppercase tracking-wider shadow-[0_4px_0_#451a03] active:translate-y-[4px] active:shadow-none transition-all border border-amber-900 font-serif"
                >
                    <Save size={18} />
                    <span>Применить</span>
                </button>
            </div>
        </div>
      </div>
    </Layout>
  );
};