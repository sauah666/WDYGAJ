import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';
import { Save, RotateCcw, ArrowLeft, Key, Network, Cpu, ShieldCheck, ToggleLeft, ToggleRight, Monitor, Brain, Globe, HardDrive, Zap, Lock, Crosshair, Layers, AppWindow, TestTube, Activity, Trash2 } from 'lucide-react';
import { AgentConfig } from '../../types';
import { listProviders, DEFAULT_LLM_PROVIDER } from '../../core/domain/llm_registry';
import { JokeService } from '../services/JokeService';
import { RuntimeCapabilitiesV1 } from '../../core/domain/runtime';
import { TokenLedger } from '../../core/domain/entities';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (key: keyof AgentConfig, value: any) => void;
  onSave: (andTest?: boolean) => void; // Support optional testing
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  runtimeCaps?: RuntimeCapabilitiesV1;
  onWipeMemory?: () => void;
  tokenLedger?: TokenLedger;
  onCheckConnection?: (config: Partial<AgentConfig>) => Promise<boolean>;
}

const LOOP_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/98771fc49589081d334b431a618452b72c0c450e/valera_idle_merged.mp4";
const STANDBY_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/e3e1c61224d4c30fb39e8a939df0f4d6a304a908/please_standby.mp4";

// Messages
const MSG_INTRO = "Панель управления нейроядром.";
const MSG_SAVED = "Конфигурация сохранена.";

type ConnectionStatus = 'IDLE' | 'CHECKING' | 'CONNECTED' | 'FAILED';

export const SettingsScreen: React.FC<Props> = ({ config, onChange, onSave, onBack, onNavigate, runtimeCaps, onWipeMemory, tokenLedger, onCheckConnection }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [showAmnesiaConfirm, setShowAmnesiaConfirm] = useState(false);
  const [isOrbExpanded, setIsOrbExpanded] = useState(false); 
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('IDLE');
  
  // Agent Logic
  const [agentMessage, setAgentMessage] = useState<string>(MSG_INTRO);
  const [typedMessage, setTypedMessage] = useState<string>("");
  
  // UI Refs
  const avatarRef = useRef<HTMLDivElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  const [orbDest, setOrbDest] = useState<{top: number, left: number, width: number, height: number} | null>(null);

  useEffect(() => {
      let frameId: number;
      let charIndex = 0;
      const speed = 2; 
      let tick = 0;
      const animate = () => {
          tick++;
          if (tick >= speed) {
              tick = 0;
              charIndex++;
              setTypedMessage(agentMessage.slice(0, charIndex));
          }
          if (charIndex <= agentMessage.length) {
              frameId = requestAnimationFrame(animate);
          }
      };
      setTypedMessage(""); 
      frameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameId);
  }, [agentMessage]);

  useEffect(() => {
    const timer = setTimeout(() => setShowPanel(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const updateOrbTarget = () => {
      if (avatarRef.current) {
          const rect = avatarRef.current.getBoundingClientRect();
          setOrbDest({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
          });
      }
  };

  useLayoutEffect(() => {
      updateOrbTarget();
      const handleResize = () => updateOrbTarget();
      window.addEventListener('resize', handleResize);
      
      if (showPanel) {
          requestAnimationFrame(updateOrbTarget);
          setTimeout(updateOrbTarget, 200);
      }
      
      return () => window.removeEventListener('resize', handleResize);
  }, [showPanel]); 

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      onChange('activeLLMProviderId', val);
      setConnectionStatus('IDLE');
      
      let jokeCategory = 'LLM_LOBOTOMY'; 
      if (val.includes('deepseek')) jokeCategory = 'LLM_CHINA_HACKER';
      else if (val.includes('local')) jokeCategory = 'LLM_LOCAL_GPU';
      else if (val.includes('cloud')) jokeCategory = 'LLM_CLOUD_EXPENSIVE';
      
      setAgentMessage(JokeService.getJoke(jokeCategory));
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('apiKey', e.target.value);
      setConnectionStatus('IDLE');
      if (Math.random() > 0.8) {
          setAgentMessage(JokeService.getJoke('LLM_CLOUD_EXPENSIVE'));
      }
  };

  const handleClearKey = () => {
      onChange('apiKey', '');
      setAgentMessage("Ключ удален. Нажмите 'Применить' для сохранения.");
  };

  const handleBrowserModeChange = (mode: 'MOCK' | 'REAL') => {
      const useMock = mode === 'MOCK';
      onChange('useMockBrowser', useMock);
      
      if (!useMock && !runtimeCaps?.hasElectronAPI) {
          setAgentMessage("ВНИМАНИЕ! Native Runtime не обнаружен. Будет использован Mock.");
      } else {
          setAgentMessage(useMock ? "Режим симуляции. Безопасно." : "Режим реального браузера активирован.");
      }
  };

  // --- MASTER REGIME SWITCH ---
  const handleRegimeChange = (regime: 'MOCK' | 'REAL') => {
      if (regime === 'MOCK') {
          onChange('useMockBrowser', true);
          // If in Mock, usually imply Mock LLM too, but let user override below
          onChange('activeLLMProviderId', 'mock'); 
          setAgentMessage("Режим симуляции. Все системы виртуальны.");
      } else {
          onChange('useMockBrowser', false);
          // Default to Local LLM if switching from Mock to Real
          const currentIsMock = !config.activeLLMProviderId || config.activeLLMProviderId === 'mock';
          if (currentIsMock) {
              onChange('activeLLMProviderId', 'local_llm');
          }
          setAgentMessage("Боевой режим. Активация реальных адаптеров.");
      }
  };

  const handleSaveWrapper = async () => {
      onSave(false); 
      
      if (onCheckConnection && config.activeLLMProviderId && config.activeLLMProviderId !== 'mock') {
          setConnectionStatus('CHECKING');
          setAgentMessage("Проверка связи с нейроядром...");
          try {
              const success = await onCheckConnection(config);
              if (success) {
                  setConnectionStatus('CONNECTED');
                  setAgentMessage("Связь с ядром установлена.");
              } else {
                  setConnectionStatus('FAILED');
                  setAgentMessage("Сбой подключения: Проверьте сервер и CORS.");
              }
          } catch (e) {
              setConnectionStatus('FAILED');
              setAgentMessage("Критический сбой связи.");
          }
      } else {
          setAgentMessage(MSG_SAVED);
      }
  };

  const handleReset = () => {
      onChange('activeLLMProviderId', DEFAULT_LLM_PROVIDER);
      onChange('apiKey', '');
      onChange('localGatewayUrl', '');
      onChange('useMockBrowser', true);
      setConnectionStatus('IDLE');
      setAgentMessage(JokeService.getJoke('LLM_LOBOTOMY'));
  };

  const handleWipeWrapper = () => {
      if(onWipeMemory) onWipeMemory();
      setShowAmnesiaConfirm(false);
      setIsOrbExpanded(false);
  };

  const handleOrbClick = () => {
      setIsOrbExpanded(true);
  };

  const handleOrbClose = () => {
      setIsOrbExpanded(false);
  };

  const currentProviderId = config.activeLLMProviderId || DEFAULT_LLM_PROVIDER;
  const providers = listProviders();
  const isMock = !!config.useMockBrowser;
  const isChecking = connectionStatus === 'CHECKING';
  
  // FIX: Explicitly rely on useMockBrowser config for Visual State
  const regimeMockActive = isMock;
  const regimeRealActive = !isMock;
  
  // Capability check
  const canUseRealBrowser = runtimeCaps?.hasElectronAPI || runtimeCaps?.hasNodeRuntime;

  let orbStyle: React.CSSProperties = {};
  let orbClasses = "";
  const transitionClass = isOrbExpanded ? "transition-all duration-500 ease-out" : "";

  if (isOrbExpanded) {
      orbClasses = `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[500px] md:h-[500px] z-[60] ${transitionClass}`;
  } else if (orbDest) {
      orbStyle = {
          top: orbDest.top,
          left: orbDest.left,
          width: orbDest.width,
          height: orbDest.height,
          transform: 'none'
      };
      orbClasses = `fixed z-50 ${transitionClass} cursor-pointer hover:brightness-110`;
  } else {
      orbClasses = "fixed opacity-0 pointer-events-none"; 
  }

  let statusColor = "bg-slate-700"; 
  if (connectionStatus === 'CHECKING') statusColor = "bg-yellow-500 animate-pulse";
  else if (connectionStatus === 'CONNECTED') statusColor = "bg-green-500 shadow-[0_0_10px_green]";
  else if (connectionStatus === 'FAILED') statusColor = "bg-red-600 animate-bounce";

  return (
    <Layout title="" hideSidebar={true} onSettingsClick={() => {}} onNavigate={onNavigate}>
      <style>{`
        @keyframes switchOn {
            0% { opacity: 0; filter: brightness(0) blur(2px); }
            100% { opacity: 1; filter: brightness(1); }
        }
        .animate-switch-on {
            animation: switchOn 0.5s ease-out forwards;
        }
        @keyframes fluoresce {
            0% { box-shadow: 0 0 10px #8b5cf6, inset 0 0 10px #8b5cf6; }
            50% { box-shadow: 0 0 40px #8b5cf6, inset 0 0 20px #8b5cf6; border-color: #a78bfa; }
            100% { box-shadow: 0 0 10px #8b5cf6, inset 0 0 10px #8b5cf6; }
        }
        .animate-fluoresce {
            animation: fluoresce 2s infinite ease-in-out;
        }
      `}</style>

      {/* BACKDROP */}
      <div 
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[55] transition-opacity duration-500 ${isOrbExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={handleOrbClose}
      ></div>

      {/* AMNESIA CONFIRM OVERLAY */}
      {showAmnesiaConfirm && (
          <div className="absolute inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center animate-switch-on p-4">
              <div className="bg-[#1a120e] border-[3px] border-[#b91c1c] rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(185,28,28,0.5)] flex flex-col items-center text-center">
                  <Brain size={48} className="text-[#ef4444] mb-4 animate-pulse" />
                  <h3 className="text-xl font-bold text-[#fca5a5] uppercase tracking-widest mb-2 font-sans">Режим Амнезии</h3>
                  <p className="text-[#a8a29e] font-mono text-sm mb-6">
                      Вы действительно хотите стереть память агента?
                  </p>
                  <div className="flex gap-4 w-full">
                      <button onClick={() => { setShowAmnesiaConfirm(false); setIsOrbExpanded(false); }} className="flex-1 py-3 border border-[#44403c] rounded-xl hover:bg-[#292524] text-[#a8a29e] font-bold font-sans">Отмена</button>
                      <button onClick={handleWipeWrapper} className="flex-1 py-3 bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#ef4444] rounded-xl text-white font-bold font-sans shadow-[0_0_15px_rgba(239,68,68,0.4)]">Стереть</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col items-center justify-center h-full w-full relative pt-0 pb-0 overflow-hidden bg-[#0a0503]">
        
        {/* --- SETTINGS PANEL --- */}
        <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none`}>
            <div 
                className={`relative w-[98%] h-[98%] md:w-[600px] md:h-auto md:max-h-[95vh] bg-[#2a2420] border-[3px] border-[#4a3b32] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-xl md:rounded-3xl overflow-hidden flex flex-col font-serif ${showPanel ? 'pointer-events-auto animate-switch-on' : 'opacity-0'}`}
                style={{ 
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-leather.png')`,
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,1)'
                }}
            >
                {/* HEADER */}
                <div className="shrink-0 relative h-14 bg-[#1a120e] border-b-4 border-[#3a2d25] flex items-center justify-between px-4 shadow-md z-30">
                    <button onClick={onBack} className="text-[#78716c] hover:text-[#d97706] transition-colors p-2 rounded-full hover:bg-[#2a2018] pointer-events-auto">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="relative z-10 font-serif font-bold text-xl text-[#cdbba7] tracking-widest uppercase text-shadow-md">
                        Настройки
                    </h2>
                    <div className="w-8"></div> 
                </div>

                {/* ORB ROW */}
                <div className="shrink-0 p-4 pb-2 bg-[#2a2420] z-20 relative">
                    <div className="flex gap-4 items-stretch h-28">
                        <div ref={avatarRef} className="w-28 shrink-0 relative opacity-0"></div>
                        {orbDest && <div className="absolute z-50 pointer-events-none" style={{ top: '10px', left: '10px' }}></div>}
                        <div className="flex-1 bg-[#1a1512] rounded-xl border-2 border-[#3a2d25] shadow-[inset_0_2px_10px_black] relative overflow-hidden p-3 flex flex-col justify-center">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-10"></div>
                             <div className="relative z-10 font-mono text-[#d97706] text-sm leading-tight drop-shadow-md break-words pl-1">
                                 <span className="opacity-90">{typedMessage}</span>
                                 <span className="inline-block w-2 h-4 bg-[#d97706] ml-1 animate-[blink_1s_infinite] align-middle"></span>
                             </div>
                             <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border border-black ${statusColor} transition-all duration-300`}></div>
                        </div>
                    </div>
                </div>

                {/* STATUS BAR & REGIME SWITCH */}
                <div className="shrink-0 px-4 pb-2 flex justify-between items-center gap-2 z-20 pointer-events-auto">
                    {tokenLedger && (
                        <div className="flex items-center gap-1 bg-[#1a120e] px-2 py-1 rounded border border-[#3a2d25] text-[10px] font-mono text-[#78716c]">
                            <Cpu size={12} className={isChecking ? "text-purple-400 animate-pulse" : ""} />
                            <span>LLM: {tokenLedger.calls}</span>
                            <span className="text-[#57534e]">|</span>
                            <span>TK: {tokenLedger.inputTokens + tokenLedger.outputTokens}</span>
                        </div>
                    )}
                    
                    {/* MASTER REGIME SWITCH */}
                    <div className="flex bg-[#0c0a08] rounded-lg border border-[#3e2f26] p-0.5 shadow-inner">
                        <button 
                            onClick={() => handleRegimeChange('MOCK')}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold font-serif uppercase transition-all ${
                                regimeMockActive ? 'bg-[#2a1a0f] text-[#d97706] shadow-sm border border-[#d97706]/30' : 'text-[#57534e] hover:text-[#a8a29e]'
                            }`}
                        >
                            <TestTube size={10} /> Mock
                        </button>
                        <button 
                            onClick={() => handleRegimeChange('REAL')}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold font-serif uppercase transition-all ${
                                regimeRealActive ? 'bg-[#2a1a0f] text-[#22c55e] shadow-sm border border-[#22c55e]/30' : 'text-[#57534e] hover:text-[#a8a29e]'
                            }`}
                        >
                            <Activity size={10} /> Real
                        </button>
                    </div>
                </div>

                {/* SETTINGS CONTENT */}
                <div className="flex-1 px-4 md:px-6 pt-2 pb-4 relative z-10 flex flex-col gap-4 pointer-events-auto overflow-hidden">
                    
                    {/* SYSTEM CONTROL PANEL */}
                    <div className="bg-[#140c08] border-2 border-[#3e2f26] rounded-xl p-3 flex flex-col gap-2 shadow-inner shrink-0">
                        <div className="flex justify-between items-center border-b border-[#3e2f26] pb-2 mb-1">
                            <div className="text-[10px] text-[#78685f] font-bold uppercase tracking-wider font-serif flex items-center gap-2">
                                <Monitor size={12} /> Браузер
                            </div>
                            <div className="flex items-center gap-2">
                                {runtimeCaps?.hasElectronAPI ? (
                                    <span className="text-[10px] text-[#22c55e] font-mono flex items-center gap-1"><HardDrive size={10} /> NATIVE</span>
                                ) : (
                                    <span className="text-[10px] text-[#78716c] font-mono flex items-center gap-1"><Globe size={10} /> WEB</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {/* Renamed "Built-in" to "Simulation" to avoid confusion */}
                            <button 
                                onClick={() => handleBrowserModeChange('MOCK')}
                                className={`relative h-10 border rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                                    isMock 
                                    ? 'bg-[#2a1a0f] border-[#d97706]' 
                                    : 'bg-[#0c0a08] border-[#3e2f26] hover:border-[#57534e]'
                                }`}
                            >
                                <Layers size={14} className={isMock ? 'text-[#d97706]' : 'text-[#57534e]'} />
                                <span className={`font-serif font-bold text-[10px] uppercase tracking-wide ${isMock ? 'text-[#d97706]' : 'text-[#57534e]'}`}>
                                    Симуляция
                                </span>
                                {isMock && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#d97706] shadow-[0_0_5px_orange]"></div>}
                            </button>

                            {/* Renamed "External" to "Real" */}
                            <button 
                                onClick={() => handleBrowserModeChange('REAL')}
                                disabled={!canUseRealBrowser}
                                className={`relative h-10 border rounded-lg transition-all flex items-center justify-center gap-2 ${
                                    !isMock 
                                    ? 'bg-[#2a1a0f] border-[#ef4444]' 
                                    : 'bg-[#0c0a08] border-[#3e2f26]'
                                } ${!canUseRealBrowser ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-[#57534e] active:scale-95'}`}
                            >
                                <AppWindow size={14} className={!isMock ? 'text-[#ef4444]' : 'text-[#57534e]'} />
                                <span className={`font-serif font-bold text-[10px] uppercase tracking-wide ${!isMock ? 'text-[#ef4444]' : 'text-[#57534e]'}`}>
                                    Real (Electron)
                                </span>
                                {!isMock && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#ef4444] shadow-[0_0_5px_red]"></div>}
                            </button>
                        </div>
                    </div>

                    {/* NEURAL CORE PANEL */}
                    <div className="bg-[#140c08] border-2 border-[#3e2f26] rounded-xl p-3 flex flex-col gap-3 shadow-inner shrink-0">
                        <div className="flex justify-between items-center border-b border-[#3e2f26] pb-2">
                            <div className="text-[10px] text-[#78685f] font-bold uppercase tracking-wider font-serif flex items-center gap-2">
                                <Cpu size={12} /> Нейроядро
                            </div>
                            <div className="text-[10px] text-[#d97706] font-mono font-bold">
                                {providers.find(p => p.id === currentProviderId)?.label.split(' ')[0]}
                            </div>
                        </div>

                        <div className="relative">
                            <select 
                                value={currentProviderId}
                                onChange={handleProviderChange}
                                className="w-full h-10 bg-[#0c0a08] border border-[#3e2f26] rounded-lg px-3 text-[#cdbba7] font-mono text-sm shadow-inner outline-none focus:border-[#d97706] transition-all appearance-none cursor-pointer"
                            >
                                {providers.map(p => (
                                    <option key={p.id} value={p.id} disabled={!p.enabled}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                            <Zap size={14} className="absolute right-3 top-3 text-[#57534e] pointer-events-none" />
                        </div>

                        {currentProviderId !== 'mock' && (
                            <div className="relative animate-switch-on mb-4">
                                <div className="absolute left-3 top-3 text-[#57534e]">
                                    {currentProviderId === 'local_llm' ? <Network size={14} /> : <Key size={14} />}
                                </div>
                                <input 
                                    type={currentProviderId === 'local_llm' ? "text" : "password"}
                                    value={currentProviderId === 'local_llm' ? (config.localGatewayUrl || '') : (config.apiKey || '')}
                                    onChange={currentProviderId === 'local_llm' 
                                        ? (e) => onChange('localGatewayUrl', e.target.value)
                                        : handleKeyChange
                                    }
                                    placeholder={currentProviderId === 'local_llm' ? "http://localhost:1234/v1" : "sk-..."}
                                    className="w-full h-10 bg-[#0c0a08] border border-[#3e2f26] rounded-lg pl-9 pr-3 text-[#e7e5e4] font-mono text-sm outline-none focus:border-[#d97706] shadow-inner placeholder-[#2a2018]"
                                />
                                {currentProviderId !== 'local_llm' && (
                                    <button 
                                        onClick={handleClearKey}
                                        className="absolute -bottom-5 right-0 text-[10px] text-red-900 hover:text-red-500 font-mono transition-colors uppercase tracking-widest cursor-pointer underline decoration-red-900/50 hover:decoration-red-500"
                                    >
                                        сброс ключа
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1"></div>

                    {/* ACTION ROW */}
                    <div className="flex items-center gap-4 shrink-0 pb-2">
                        <button 
                            onClick={handleReset} 
                            className="h-14 w-14 flex items-center justify-center border border-[#3e2f26] rounded-xl hover:border-[#b91c1c] text-[#57534e] hover:text-[#b91c1c] transition-colors bg-[#1a120e] group"
                            title="Сброс"
                        >
                            <RotateCcw size={20} className="group-hover:-rotate-180 transition-transform duration-500" />
                        </button>

                        <button 
                            onClick={handleSaveWrapper}
                            disabled={isChecking}
                            className={`flex-1 relative h-14 border shadow-[0_5px_10px_black] active:shadow-none active:translate-y-1 transition-all group overflow-hidden rounded-xl flex items-center justify-center gap-3 ${
                                isChecking ? 'bg-[#451a03] border-[#78350f] opacity-70 cursor-wait' : 'bg-gradient-to-b from-[#6b350f] to-[#451a03] border-[#78350f]'
                            }`}
                        >
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay"></div>
                             <Save size={20} className="text-[#fcd34d] relative z-10" />
                             <span className="relative z-10 font-serif font-black text-lg text-[#fcd34d] tracking-[0.15em] uppercase drop-shadow-md">
                                 {isChecking ? 'Проверка...' : 'Применить'}
                             </span>
                        </button>
                    </div>

                </div>
                
                <div className="absolute -bottom-2 left-8 right-8 h-2 bg-[#1a120e] border-l border-r border-b border-[#3a2d25] rounded-b-xl shadow-lg"></div>
            </div>
        </div>

        {/* ORB STATIC */}
        <div className={orbClasses} style={orbStyle} onClick={handleOrbClick}>
            <Atropos activeOffset={10} shadowScale={0.5} className="w-full h-full rounded-full">
                <div className={`relative w-full h-full rounded-full bg-[#1a120e] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden border-[#2e1d15] ease-in-out ${isChecking ? "border-[3px] border-purple-500 animate-fluoresce" : "border-[3px]"}`}>
                    <div className="absolute inset-0 border-[#b45309] rounded-full opacity-80 pointer-events-none z-50 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] border-[2px]"></div>
                    <div className="absolute rounded-full bg-black shadow-[inset_0_10px_30px_rgba(255,255,255,0.05)] overflow-hidden isolate z-10 inset-0.5">
                        <video src={STANDBY_VIDEO} className={`absolute inset-0 w-full h-full object-cover z-30 transition-opacity duration-300 ${isChecking ? 'opacity-100' : 'opacity-0'}`} playsInline muted loop autoPlay />
                        <video ref={loopVideoRef} src={LOOP_VIDEO} className="absolute inset-0 w-full h-full object-cover z-20 opacity-100" playsInline muted loop autoPlay />
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-30 mix-blend-multiply"></div>
                    </div>
                </div>
            </Atropos>
            <div className={`absolute top-0 right-0 w-6 h-6 rounded-full border-2 border-black z-[70] shadow-lg ${statusColor} transition-all duration-500`}></div>
        </div>

        {/* EXPANDED ORB CONTROLS */}
        {isOrbExpanded && (
            <div className="fixed left-1/2 -translate-x-1/2 top-[calc(50%-270px)] flex flex-col items-center gap-3 z-[70] pointer-events-auto">
                <button onClick={(e) => { e.stopPropagation(); setShowAmnesiaConfirm(true); }} className="w-16 h-16 rounded-full bg-[#1a120e] border-2 border-[#ef4444] text-[#ef4444] hover:bg-[#450a0a] hover:scale-110 transition-all shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center justify-center group">
                    <Brain size={32} className="animate-pulse group-hover:animate-none" />
                </button>
                <div className="px-3 py-1 bg-black/80 border border-[#ef4444]/50 rounded text-[#ef4444] font-bold text-xs tracking-[0.2em] uppercase backdrop-blur-sm shadow-lg">Амнезия</div>
            </div>
        )}

      </div>
    </Layout>
  );
};