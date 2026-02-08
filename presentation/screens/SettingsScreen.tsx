
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';
import { Save, RotateCcw, ArrowLeft, Key, Network, Cpu, ShieldCheck } from 'lucide-react';
import { AgentConfig } from '../../types';
import { listProviders, DEFAULT_LLM_PROVIDER } from '../../core/domain/llm_registry';
import { JokeService } from '../services/JokeService';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (key: keyof AgentConfig, value: any) => void;
  onSave: () => void;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

const LOOP_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/98771fc49589081d334b431a618452b72c0c450e/valera_idle_merged.mp4";

// Messages
const MSG_INTRO = "Панель управления нейроядром.";
const MSG_SAVED = "Конфигурация сохранена.";

export const SettingsScreen: React.FC<Props> = ({ config, onChange, onSave, onBack, onNavigate }) => {
  const [showPanel, setShowPanel] = useState(false);
  
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

  // Panel Animation Only
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
      // Immediate update to ensure no jump
      if (avatarRef.current) updateOrbTarget();
      return () => window.removeEventListener('resize', updateOrbTarget);
  }, []); // Run once on mount

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      onChange('activeLLMProviderId', val);
      
      let jokeCategory = 'LLM_LOBOTOMY'; // default mock
      if (val.includes('deepseek')) jokeCategory = 'LLM_CHINA_HACKER';
      else if (val.includes('local')) jokeCategory = 'LLM_LOCAL_GPU';
      else if (val.includes('cloud')) jokeCategory = 'LLM_CLOUD_EXPENSIVE';
      
      setAgentMessage(JokeService.getJoke(jokeCategory));
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('apiKey', e.target.value);
      // Occasional paranoia joke when typing key
      if (Math.random() > 0.8) {
          setAgentMessage(JokeService.getJoke('LLM_CLOUD_EXPENSIVE'));
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
      setAgentMessage(JokeService.getJoke('LLM_LOBOTOMY'));
  };

  const currentProviderId = config.activeLLMProviderId || DEFAULT_LLM_PROVIDER;
  const providers = listProviders();

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

      <div className="flex flex-col items-center justify-center h-full w-full relative pt-0 pb-0 overflow-hidden bg-[#0a0503]">
        
        {/* --- SETTINGS PANEL --- */}
        <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none`}>
            {/* MAXIMIZED CONTAINER */}
            <div 
                className={`relative w-[98%] h-[98%] md:w-[600px] md:h-auto md:max-h-[95vh] bg-[#2a2420] border-[3px] border-[#4a3b32] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-xl md:rounded-3xl overflow-hidden flex flex-col font-serif ${showPanel ? 'pointer-events-auto animate-switch-on' : 'opacity-0'}`}
                style={{ 
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-leather.png')`,
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,1)'
                }}
            >
                {/* 1. HEADER */}
                <div className="shrink-0 relative h-14 bg-[#1a120e] border-b-4 border-[#3a2d25] flex items-center justify-between px-4 shadow-md z-30">
                    <button onClick={onBack} className="text-[#78716c] hover:text-[#d97706] transition-colors p-2 rounded-full hover:bg-[#2a2018]">
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

                {/* 3. SETTINGS CONTENT (Maximized) */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar relative z-10 flex flex-col">
                    
                    {/* SECTION: SYSTEM */}
                    <div className="relative flex items-center justify-center py-4 opacity-50 shrink-0">
                        <div className="h-px bg-[#4a3b32] flex-1"></div>
                        <div className="px-3 text-[#8c7b70] font-serif text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                            <Cpu size={12} /> Нейроядро
                        </div>
                        <div className="h-px bg-[#4a3b32] flex-1"></div>
                    </div>

                    <div className="space-y-6">
                        {/* LLM Provider */}
                        <div className="flex flex-col gap-2">
                             <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Модель Интеллекта</label>
                             <div className="relative">
                                <select 
                                    value={currentProviderId}
                                    onChange={handleProviderChange}
                                    className="w-full h-14 bg-[#0c0a08] border-2 border-[#3e2f26] rounded-2xl px-4 text-[#cdbba7] font-mono text-base shadow-[inset_0_2px_5px_black] outline-none active:bg-[#1a120e] transition-all appearance-none cursor-pointer"
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

                        {/* API Key / URL */}
                        <div className="flex flex-col gap-4">
                            {currentProviderId !== 'mock' && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">
                                        {currentProviderId === 'local_llm' ? 'Адрес Шлюза' : 'Ключ Доступа'}
                                    </label>
                                    <div className="relative">
                                        {currentProviderId === 'local_llm' ? (
                                            <Network size={18} className="absolute left-4 top-4 text-[#57534e]" />
                                        ) : (
                                            <Key size={18} className="absolute left-4 top-4 text-[#57534e]" />
                                        )}
                                        <input 
                                            type={currentProviderId === 'local_llm' ? "text" : "password"}
                                            value={currentProviderId === 'local_llm' ? (config.localGatewayUrl || '') : (config.apiKey || '')}
                                            onChange={currentProviderId === 'local_llm' 
                                                ? (e) => onChange('localGatewayUrl', e.target.value)
                                                : handleKeyChange
                                            }
                                            placeholder={currentProviderId === 'local_llm' ? "http://localhost:1234/v1" : "sk-..."}
                                            className="w-full h-14 bg-[#140c08] border-2 border-[#3e2f26] rounded-2xl pl-12 pr-4 text-[#e7e5e4] font-mono text-sm outline-none focus:border-[#d97706] shadow-[inset_0_2px_5px_black] placeholder-[#2a2018]"
                                        />
                                    </div>
                                    <div className="ml-2 text-[10px] text-[#57534e] flex items-center gap-1">
                                        <ShieldCheck size={12} />
                                        <span>Только локальное хранение в браузере.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reset */}
                    <div className="pt-8 flex justify-center border-t border-[#3e2f26]/30 mt-6 mb-4">
                        <button onClick={handleReset} className="text-[10px] text-[#57534e] hover:text-[#b91c1c] uppercase tracking-widest flex items-center gap-2 transition-colors border-b border-transparent hover:border-[#b91c1c] pb-1">
                            <RotateCcw size={12} /> Сброс Настроек
                        </button>
                    </div>

                </div>

                {/* 4. FOOTER */}
                <div className="shrink-0 relative p-6 bg-[#1a120e] border-t-2 border-[#3a2d25] shadow-inner z-30">
                    <button 
                        onClick={handleSaveWrapper}
                        className="w-full relative h-16 bg-gradient-to-b from-[#6b350f] to-[#451a03] border border-[#78350f] shadow-[0_5px_10px_black] active:shadow-none active:translate-y-1 transition-all group overflow-hidden rounded-2xl flex items-center justify-center gap-3"
                    >
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay"></div>
                         <Save size={20} className="text-[#fcd34d] relative z-10" />
                         <span className="relative z-10 font-serif font-black text-xl text-[#fcd34d] tracking-[0.15em] uppercase drop-shadow-md">
                             Применить
                         </span>
                         <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20"></div>
                    </button>
                </div>
                
                <div className="absolute -bottom-2 left-8 right-8 h-2 bg-[#1a120e] border-l border-r border-b border-[#3a2d25] rounded-b-xl shadow-lg"></div>
            </div>
        </div>

        {/* --- ORB (FIXED STATIC) --- */}
        <div 
            className={`fixed z-50 ${orbDest ? 'opacity-100' : 'opacity-0'}`}
            style={orbDest ? {
                top: orbDest.top,
                left: orbDest.left,
                width: orbDest.width,
                height: orbDest.height,
                transform: 'none'
            } : {}}
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

      </div>
    </Layout>
  );
};
