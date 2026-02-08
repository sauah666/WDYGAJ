
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';
import { Save, RotateCcw, ArrowLeft, Key, Network, Cpu, ShieldCheck, ToggleLeft, ToggleRight, Monitor, Brain, Globe, HardDrive, Zap, Lock } from 'lucide-react';
import { AgentConfig } from '../../types';
import { listProviders, DEFAULT_LLM_PROVIDER } from '../../core/domain/llm_registry';
import { JokeService } from '../services/JokeService';
import { RuntimeCapabilitiesV1 } from '../../core/domain/runtime';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (key: keyof AgentConfig, value: any) => void;
  onSave: () => void;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  runtimeCaps?: RuntimeCapabilitiesV1;
  onWipeMemory?: () => void;
}

const LOOP_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/98771fc49589081d334b431a618452b72c0c450e/valera_idle_merged.mp4";

// Messages
const MSG_INTRO = "Панель управления нейроядром.";
const MSG_SAVED = "Конфигурация сохранена.";

export const SettingsScreen: React.FC<Props> = ({ config, onChange, onSave, onBack, onNavigate, runtimeCaps, onWipeMemory }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [showAmnesiaConfirm, setShowAmnesiaConfirm] = useState(false);
  const [isOrbExpanded, setIsOrbExpanded] = useState(false); 
  
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
      window.addEventListener('resize', updateOrbTarget);
      if (avatarRef.current) updateOrbTarget();
      return () => window.removeEventListener('resize', updateOrbTarget);
  }, []); 

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      onChange('activeLLMProviderId', val);
      
      let jokeCategory = 'LLM_LOBOTOMY'; 
      if (val.includes('deepseek')) jokeCategory = 'LLM_CHINA_HACKER';
      else if (val.includes('local')) jokeCategory = 'LLM_LOCAL_GPU';
      else if (val.includes('cloud')) jokeCategory = 'LLM_CLOUD_EXPENSIVE';
      
      setAgentMessage(JokeService.getJoke(jokeCategory));
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('apiKey', e.target.value);
      if (Math.random() > 0.8) {
          setAgentMessage(JokeService.getJoke('LLM_CLOUD_EXPENSIVE'));
      }
  };

  const handleRegimeToggle = () => {
      const willBeReal = config.useMockBrowser; 
      
      if (willBeReal) { // Switching TO REAL
          onChange('useMockBrowser', false);
          setAgentMessage("ВНИМАНИЕ! Режим LIVE. Агент будет использовать реальный браузер.");
      } else { // Switching TO MOCK
          onChange('useMockBrowser', true);
          setAgentMessage("Переход в режим симуляции. Безопасно, но скучно.");
      }
  };

  const handleSaveWrapper = () => {
      setAgentMessage(MSG_SAVED);
      setTimeout(() => onSave(), 800);
  };

  const handleReset = () => {
      onChange('activeLLMProviderId', DEFAULT_LLM_PROVIDER);
      onChange('apiKey', '');
      onChange('localGatewayUrl', '');
      onChange('useMockBrowser', true);
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

  // Determine Orb Style
  let orbStyle: React.CSSProperties = {};
  let orbClasses = "";

  if (isOrbExpanded) {
      orbClasses = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[500px] md:h-[500px] z-[60] transition-all duration-500 ease-out";
  } else if (orbDest) {
      orbStyle = {
          top: orbDest.top,
          left: orbDest.left,
          width: orbDest.width,
          height: orbDest.height,
          transform: 'none'
      };
      orbClasses = "fixed z-50 transition-all duration-[1200ms] ease-in-out cursor-pointer hover:brightness-110";
  } else {
      orbClasses = "fixed opacity-0 pointer-events-none"; 
  }

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
        @keyframes blink { 50% { opacity: 0; } }
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
                      Вы действительно хотите стереть память агента? Он забудет все просмотренные вакансии и отправленные отклики.
                  </p>
                  <div className="flex gap-4 w-full">
                      <button 
                          onClick={() => { setShowAmnesiaConfirm(false); setIsOrbExpanded(false); }}
                          className="flex-1 py-3 border border-[#44403c] rounded-xl hover:bg-[#292524] text-[#a8a29e] font-bold font-sans"
                      >
                          Отмена
                      </button>
                      <button 
                          onClick={handleWipeWrapper}
                          className="flex-1 py-3 bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#ef4444] rounded-xl text-white font-bold font-sans shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      >
                          Стереть
                      </button>
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
                {/* 1. HEADER */}
                <div className="shrink-0 relative h-14 bg-[#1a120e] border-b-4 border-[#3a2d25] flex items-center justify-between px-4 shadow-md z-30">
                    <button onClick={onBack} className="text-[#78716c] hover:text-[#d97706] transition-colors p-2 rounded-full hover:bg-[#2a2018] pointer-events-auto">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="relative z-10 font-serif font-bold text-xl text-[#cdbba7] tracking-widest uppercase text-shadow-md">
                        Настройки
                    </h2>
                    <div className="w-8"></div> 
                </div>

                {/* 2. ORB ROW */}
                <div className="shrink-0 p-4 pb-2 bg-[#2a2420] z-20 relative">
                    <div className="flex gap-4 items-stretch h-28">
                        {/* Avatar Placeholder */}
                        <div ref={avatarRef} className="w-28 shrink-0 relative opacity-0"></div>

                        {/* Message Screen */}
                        <div className="flex-1 bg-[#1a1512] rounded-xl border-2 border-[#3a2d25] shadow-[inset_0_2px_10px_black] relative overflow-hidden p-3 flex flex-col justify-center">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-10"></div>
                             <div className="relative z-10 font-mono text-[#d97706] text-sm leading-tight drop-shadow-md break-words pl-1">
                                 <span className="opacity-90">{typedMessage}</span>
                                 <span className="inline-block w-2 h-4 bg-[#d97706] ml-1 animate-[blink_1s_infinite] align-middle"></span>
                             </div>
                             <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse shadow-[0_0_4px_green]"></div>
                        </div>
                    </div>
                </div>

                {/* 3. SETTINGS CONTENT (COMPACT MODE) */}
                <div className="flex-1 px-4 md:px-6 pt-2 pb-4 relative z-10 flex flex-col gap-4 pointer-events-auto overflow-hidden">
                    
                    {/* SYSTEM CONTROL PANEL */}
                    <div className="bg-[#140c08] border-2 border-[#3e2f26] rounded-xl p-3 flex flex-col gap-2 shadow-inner shrink-0">
                        <div className="flex justify-between items-center border-b border-[#3e2f26] pb-2 mb-1">
                            <div className="text-[10px] text-[#78685f] font-bold uppercase tracking-wider font-serif flex items-center gap-2">
                                <Monitor size={12} /> Система
                            </div>
                            {/* Runtime Indicator */}
                            <div className="flex items-center gap-2">
                                {runtimeCaps?.hasElectronAPI ? (
                                    <span className="text-[10px] text-[#22c55e] font-mono flex items-center gap-1"><HardDrive size={10} /> NATIVE</span>
                                ) : (
                                    <span className="text-[10px] text-[#78716c] font-mono flex items-center gap-1"><Globe size={10} /> WEB</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className={`font-bold font-serif text-base ${isMock ? 'text-[#a8a29e]' : 'text-[#ef4444]'}`}>
                                    {isMock ? 'СИМУЛЯЦИЯ' : 'LIVE РЕЖИМ'}
                                </span>
                                <span className="text-[10px] text-[#57534e] font-mono">
                                    {isMock ? 'Безопасный режим' : 'Реальный браузер'}
                                </span>
                            </div>
                            <button 
                                onClick={handleRegimeToggle}
                                className={`p-2 rounded-lg border-2 transition-all active:scale-95 ${isMock ? 'border-[#4a3b32] text-[#78716c] hover:text-[#a8a29e]' : 'border-[#ef4444] text-[#ef4444] bg-[#450a0a]'}`}
                            >
                                {isMock ? <ToggleLeft size={32} /> : <ToggleRight size={32} />}
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

                        {/* Provider Select */}
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

                        {/* API Key */}
                        {currentProviderId !== 'mock' && (
                            <div className="relative animate-switch-on">
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
                            </div>
                        )}
                    </div>

                    {/* Spacer to push buttons to bottom */}
                    <div className="flex-1"></div>

                    {/* ACTION ROW */}
                    <div className="flex items-center gap-4 shrink-0 pb-2">
                        {/* Reset (Small) */}
                        <button 
                            onClick={handleReset} 
                            className="h-14 w-14 flex items-center justify-center border border-[#3e2f26] rounded-xl hover:border-[#b91c1c] text-[#57534e] hover:text-[#b91c1c] transition-colors bg-[#1a120e] group"
                            title="Сброс"
                        >
                            <RotateCcw size={20} className="group-hover:-rotate-180 transition-transform duration-500" />
                        </button>

                        {/* Save (Big) */}
                        <button 
                            onClick={handleSaveWrapper}
                            className="flex-1 relative h-14 bg-gradient-to-b from-[#6b350f] to-[#451a03] border border-[#78350f] shadow-[0_5px_10px_black] active:shadow-none active:translate-y-1 transition-all group overflow-hidden rounded-xl flex items-center justify-center gap-3"
                        >
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay"></div>
                             <Save size={20} className="text-[#fcd34d] relative z-10" />
                             <span className="relative z-10 font-serif font-black text-lg text-[#fcd34d] tracking-[0.15em] uppercase drop-shadow-md">
                                 Применить
                             </span>
                        </button>
                    </div>

                </div>
                
                {/* DECORATIVE BOTTOM */}
                <div className="absolute -bottom-2 left-8 right-8 h-2 bg-[#1a120e] border-l border-r border-b border-[#3a2d25] rounded-b-xl shadow-lg"></div>
            </div>
        </div>

        {/* --- ORB (FIXED STATIC) --- */}
        <div 
            className={orbClasses}
            style={orbStyle}
            onClick={handleOrbClick}
        >
            <Atropos activeOffset={10} shadowScale={0.5} className="w-full h-full rounded-full">
                <div 
                    className="relative w-full h-full rounded-full bg-[#1a120e] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden border-[#2e1d15] border-[3px]"
                >
                    <div className="absolute inset-0 border-[#b45309] rounded-full opacity-80 pointer-events-none z-50 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] border-[2px]"></div>
                    
                    <div className="absolute rounded-full bg-black shadow-[inset_0_10px_30px_rgba(255,255,255,0.05)] overflow-hidden isolate z-10 inset-0.5">
                        <video 
                            ref={loopVideoRef}
                            src={LOOP_VIDEO}
                            className="absolute inset-0 w-full h-full object-cover z-20 opacity-100"
                            playsInline muted loop autoPlay
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-30 mix-blend-multiply"></div>
                    </div>
                </div>
            </Atropos>
        </div>

        {/* EXPANDED ORB CONTROLS - FIXED ABOVE ORB */}
        {isOrbExpanded && (
            <div className="fixed left-1/2 -translate-x-1/2 top-[calc(50%-270px)] flex flex-col items-center gap-3 z-[70] pointer-events-auto">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowAmnesiaConfirm(true); }}
                    className="w-16 h-16 rounded-full bg-[#1a120e] border-2 border-[#ef4444] text-[#ef4444] hover:bg-[#450a0a] hover:scale-110 transition-all shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center justify-center group"
                >
                    <Brain size={32} className="animate-pulse group-hover:animate-none" />
                </button>
                <div className="px-3 py-1 bg-black/80 border border-[#ef4444]/50 rounded text-[#ef4444] font-bold text-xs tracking-[0.2em] uppercase backdrop-blur-sm shadow-lg">
                    Амнезия
                </div>
            </div>
        )}

      </div>
    </Layout>
  );
};
