
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';
import { Phone, ChevronDown, Settings, Archive, Sliders, Power } from 'lucide-react';
import { AgentConfig, WorkMode } from '../../types';
import { JokeService } from '../services/JokeService';
import { AppliedVacancyRecord } from '../../core/domain/entities';
import { VacancyHistoryOverlay } from '../components/VacancyHistoryOverlay';

interface Props {
  config: Partial<AgentConfig>;
  activeSite?: string;
  onSiteSelect?: (site: string) => void;
  onConfigChange: (key: keyof AgentConfig, value: any) => void;
  onRun: () => void;
  onSelect: (mode: string) => void; // Used for "Advanced Setup" now
  onSettingsClick?: () => void;
  onNavigate?: (route: string) => void;
  appliedHistory?: AppliedVacancyRecord[]; 
  onWipeMemory?: () => void; 
}

const INTRO_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/9adbbc991fa9b9c12d54d6d435407de65c428635/valera_merged.mp4";
const LOOP_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/98771fc49589081d334b431a618452b72c0c450e/valera_idle_merged.mp4";

type VideoPhase = 'IDLE' | 'INTRO' | 'LOOP';

const LOCATIONS = [
    { label: "Москва", value: "Москва" },
    { label: "Санкт-Петербург", value: "Санкт-Петербург" },
    { label: "Вообще пофиг (Global)", value: "Global" }
];

export const ModeSelectionScreen: React.FC<Props> = ({ 
    config, 
    onConfigChange, 
    onRun, 
    onSelect, 
    onSettingsClick, 
    onNavigate,
    appliedHistory = [],
    onWipeMemory
}) => {
  const [videoPhase, setVideoPhase] = useState<VideoPhase>('IDLE');
  const [isRelocated, setIsRelocated] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [loopStarted, setLoopStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [showArchive, setShowArchive] = useState(false);

  // Orb Positioning
  const avatarRef = useRef<HTMLDivElement>(null);
  const [orbDest, setOrbDest] = useState<{top: number, left: number, width: number, height: number} | null>(null);

  // Video Refs
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  
  // Location
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  // Message
  const [agentMessage, setAgentMessage] = useState<string>("Система готова. Задайте параметры.");
  const [typedMessage, setTypedMessage] = useState<string>("");
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter
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

  const handleSalaryChange = (val: number) => {
      onConfigChange('minSalary', val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
          let category = 'SALARY_BROKE';
          if (val >= 350000) category = 'SALARY_GREEDY';
          else if (val >= 200000) category = 'SALARY_GOOD';
          else if (val >= 100000) category = 'SALARY_MEDIOCRE';
          
          setAgentMessage(JokeService.getJoke(category));
      }, 600); 
  };
  
  const handleLocationSelect = (value: string) => {
      onConfigChange('city', value === 'Global' ? '' : value);
      setIsLocationOpen(false);
      
      if (value === 'Москва') setAgentMessage(JokeService.getJoke('LOC_MOSCOW'));
      else if (value === 'Санкт-Петербург') setAgentMessage(JokeService.getJoke('LOC_SPB'));
      else if (value === 'Global') setAgentMessage(JokeService.getJoke('LOC_GLOBAL'));
  };

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
              setIsLocationOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (config.minSalary === undefined) onConfigChange('minSalary', 0);
    const timer = setTimeout(() => setIsReady(true), 100);
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
      if (showPanel) setTimeout(updateOrbTarget, 100);
      return () => window.removeEventListener('resize', updateOrbTarget);
  }, [showPanel]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isRelocated) {
        timer = setTimeout(() => setShowPanel(true), 1200); 
    } else {
        setShowPanel(false);
    }
    return () => clearTimeout(timer);
  }, [isRelocated]);

  const handleCall = () => {
      if (videoPhase !== 'IDLE') return;
      updateOrbTarget();
      setIsRelocated(false);
      setLoopStarted(false);
      setVideoPhase('INTRO');
      if (introVideoRef.current) {
          introVideoRef.current.currentTime = 0;
          introVideoRef.current.playbackRate = 1.2; 
          introVideoRef.current.play().catch(console.error);
      }
      if (loopVideoRef.current) {
          loopVideoRef.current.currentTime = 0;
          loopVideoRef.current.pause();
      }
  };

  const handleBackToIdle = () => {
      setShowPanel(false);
      setIsRelocated(false);
      setVideoPhase('IDLE');
      setLoopStarted(false);
  };

  const handleIntroEnd = () => {
      setVideoPhase('LOOP');
      if (loopVideoRef.current) loopVideoRef.current.play().catch(console.error);
  };

  const handleLoopPlaying = () => setLoopStarted(true);

  const handleIntroTimeUpdate = () => {
      const video = introVideoRef.current;
      if (videoPhase === 'INTRO' && video && video.duration) {
          if (video.currentTime > video.duration / 2 && !isRelocated) {
              updateOrbTarget();
              setIsRelocated(true);
          }
      }
  };

  const handleAdvancedSetup = () => {
      // Directs to JobPreferencesScreen via App.tsx callback
      onSelect('JOB_SEARCH');
  };

  const handleWipeWrapper = () => {
      if(onWipeMemory) onWipeMemory();
      setShowArchive(false);
  };

  const isPlaying = videoPhase !== 'IDLE';
  const currentModes = config.targetWorkModes || [];
  
  const toggleMode = (mode: WorkMode) => {
      let newModes = [...currentModes];
      if (currentModes.includes(mode)) newModes = currentModes.filter(m => m !== mode);
      else newModes = [...currentModes, mode];
      onConfigChange('targetWorkModes', newModes);

      if (newModes.length >= 3) {
          setAgentMessage(JokeService.getJoke('MODE_DESPERATE'));
      } else if (!currentModes.includes(mode)) {
          if (mode === WorkMode.REMOTE) setAgentMessage(JokeService.getJoke('MODE_REMOTE'));
          if (mode === WorkMode.HYBRID) setAgentMessage(JokeService.getJoke('MODE_HYBRID'));
          if (mode === WorkMode.OFFICE) setAgentMessage(JokeService.getJoke('MODE_OFFICE'));
      }
  };

  return (
    <Layout title="" hideSidebar={true} onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
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

      {/* ARCHIVE OVERLAY */}
      {showArchive && (
          <VacancyHistoryOverlay 
              title="Архив Откликов"
              items={appliedHistory}
              onClose={() => setShowArchive(false)}
              onClear={handleWipeWrapper}
              onVisit={(url) => window.open(url, '_blank')}
              mode="ARCHIVE"
          />
      )}

      <div className="flex flex-col items-center justify-center h-full w-full relative pt-0 pb-0 overflow-hidden bg-[#0a0503]">
        
        {/* --- MAIN PANEL --- */}
        <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none`}>
            {/* FULL SCREEN CONTAINER */}
            <div 
                className={`relative w-[98%] h-[98%] md:w-[600px] md:h-auto md:max-h-[95vh] bg-[#2a2420] border-[3px] border-[#4a3b32] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-xl md:rounded-3xl overflow-hidden flex flex-col font-serif ${showPanel ? 'pointer-events-auto animate-switch-on' : 'opacity-0'}`}
                style={{ 
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-leather.png')`,
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,1)'
                }}
            >
                {/* Decorative Bolts */}
                <div className="absolute top-2 left-2 w-3 h-3 bg-[#1c1917] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] border border-[#4a3b32] z-40"></div>
                <div className="absolute top-2 right-2 w-3 h-3 bg-[#1c1917] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] border border-[#4a3b32] z-40"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 bg-[#1c1917] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] border border-[#4a3b32] z-40"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 bg-[#1c1917] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] border border-[#4a3b32] z-40"></div>

                {/* 1. HEADER (Fixed) */}
                <div className="shrink-0 relative h-14 bg-[#1a120e] border-b-4 border-[#3a2d25] flex items-center justify-between px-4 shadow-md z-30">
                    <div className="flex gap-2">
                        {/* Archive Button */}
                        <button 
                            onClick={() => setShowArchive(true)}
                            className="text-[#78716c] hover:text-[#fcd34d] transition-colors p-2 rounded-full hover:bg-[#2a2018] relative group"
                            title="Архив"
                        >
                            <Archive size={22} />
                            {appliedHistory.length > 0 && (
                                <div className="absolute top-1 right-1 w-2 h-2 bg-[#d97706] rounded-full"></div>
                            )}
                        </button>
                    </div>
                    
                    <h2 className="relative z-10 font-serif font-bold text-xl text-[#cdbba7] tracking-widest uppercase text-shadow-md">
                        Параметры Поиска
                    </h2>
                    
                    {/* Advanced Params Button (Sliders) */}
                    <button 
                        onClick={handleAdvancedSetup}
                        className="text-[#78716c] hover:text-[#fbbf24] transition-colors p-2 rounded-full hover:bg-[#2a2018] relative group"
                        title="Расширенные Настройки"
                    >
                        <Sliders size={20} />
                    </button>
                </div>

                {/* 2. ORB ROW */}
                <div className="shrink-0 p-4 pb-2 bg-[#2a2420] z-20 relative">
                    <div className="flex gap-4 items-stretch h-28">
                        {/* Avatar Placeholder (Target) */}
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

                {/* 3. INPUTS AREA */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar relative z-10 flex flex-col justify-evenly">
                     {/* Divider */}
                    <div className="relative flex items-center justify-center py-2 opacity-50 shrink-0">
                        <div className="h-px bg-[#4a3b32] flex-1"></div>
                        <div className="px-3 text-[#8c7b70] font-serif text-[10px] font-bold tracking-widest uppercase">
                            Быстрый Старт ({config.targetSite || 'hh.ru'})
                        </div>
                        <div className="h-px bg-[#4a3b32] flex-1"></div>
                    </div>

                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                        {/* Salary */}
                        <div className="flex flex-col gap-2">
                             <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Минимальная Зарплата</label>
                             <input 
                                type="number"
                                value={config.minSalary !== undefined ? config.minSalary : 0}
                                placeholder="0"
                                onChange={(e) => handleSalaryChange(parseInt(e.target.value) || 0)}
                                className="w-full h-16 bg-[#140c08] text-[#e7e5e4] font-mono text-3xl text-center outline-none border-2 border-[#3e2f26] rounded-2xl focus:border-[#d97706] transition-all shadow-[inset_0_2px_5px_black] placeholder-[#2a2018]"
                             />
                        </div>

                        {/* Location */}
                        <div className="flex flex-col gap-2 relative z-20" ref={locationRef}>
                            <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Где Искать</label>
                            <div className="relative">
                                <button 
                                    onClick={() => setIsLocationOpen(!isLocationOpen)}
                                    className="w-full h-16 flex items-center justify-between bg-[#0c0a08] border-2 border-[#3e2f26] rounded-2xl px-5 text-[#cdbba7] font-mono text-lg shadow-[inset_0_2px_5px_black] outline-none active:bg-[#1a120e] transition-all"
                                >
                                    <span className="truncate">{config.city || "Весь Мир (Global)"}</span>
                                    <ChevronDown size={20} className={`text-[#d97706] transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isLocationOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a120e] border border-[#4a3b32] rounded-2xl shadow-[0_10px_40px_black] overflow-hidden z-50">
                                        {LOCATIONS.map((loc) => (
                                            <button
                                                key={loc.value}
                                                onClick={() => handleLocationSelect(loc.value)}
                                                className="w-full text-left px-5 py-4 text-[#a8a29e] hover:bg-[#2a1a0f] hover:text-[#d97706] font-mono text-base border-b border-[#292524] last:border-0 transition-colors"
                                            >
                                                {loc.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Work Mode */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Режим</label>
                            <div className="grid grid-cols-3 gap-3">
                                 {[WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.OFFICE].map((mode) => {
                                     const active = currentModes.includes(mode);
                                     return (
                                         <button 
                                            key={mode}
                                            onClick={() => toggleMode(mode)}
                                            className={`relative h-14 border-2 bg-[#140f0c] shadow-[inset_0_0_5px_black] group overflow-hidden transition-all duration-200 active:scale-95 rounded-2xl flex items-center justify-center ${
                                                active ? 'border-[#d97706] bg-[#2a1a0f]' : 'border-[#3e2f26]'
                                            }`}
                                         >
                                            <div className="flex flex-col items-center gap-1 relative z-10">
                                                {active && <div className="w-1.5 h-1.5 rounded-full bg-[#d97706] shadow-[0_0_5px_orange]"></div>}
                                                <span className={`text-[10px] font-bold font-serif uppercase tracking-wider ${active ? 'text-[#d97706]' : 'text-[#4a3b32] group-hover:text-[#6b5548]'}`}>
                                                    {mode === 'REMOTE' ? 'Удаленно' : mode === 'HYBRID' ? 'Гибрид' : 'Офис'}
                                                </span>
                                            </div>
                                         </button>
                                     );
                                 })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. FOOTER (Fixed) */}
                <div className="shrink-0 relative p-6 bg-[#1a120e] border-t-2 border-[#3a2d25] shadow-inner z-30">
                    <button 
                        onClick={onRun}
                        className="w-full relative h-16 bg-gradient-to-b from-[#6b350f] to-[#451a03] border border-[#78350f] shadow-[0_5px_10px_black] active:shadow-none active:translate-y-1 transition-all group overflow-hidden rounded-2xl flex items-center justify-center gap-4"
                    >
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay"></div>
                         <div className="h-[2px] w-6 bg-[#d97706]/50"></div>
                         <span className="relative z-10 font-serif font-black text-xl text-[#fcd34d] tracking-[0.15em] uppercase drop-shadow-md">
                             Начать Поиск
                         </span>
                         <div className="h-[2px] w-6 bg-[#d97706]/50"></div>
                    </button>
                </div>
            </div>
        </div>

        {/* --- ORB --- */}
        <div 
            className={`fixed z-50 ease-in-out ${isReady ? 'transition-all duration-[1200ms]' : ''} ${
                isRelocated 
                    ? "" 
                    : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[360px] sm:h-[360px]"
            }`}
            style={isRelocated && orbDest ? {
                top: orbDest.top,
                left: orbDest.left,
                width: orbDest.width,
                height: orbDest.height,
                transform: 'none'
            } : {}}
        >
            <Atropos activeOffset={10} shadowScale={0.5} className="w-full h-full rounded-full">
                <div 
                    className={`relative w-full h-full rounded-full bg-[#1a120e] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden border-[#2e1d15] ease-in-out ${isReady ? 'transition-all duration-[1200ms]' : ''} ${
                        isRelocated ? "border-[3px]" : "border-[15px]"
                    }`}
                >
                    <div className={`absolute inset-0 border-[#b45309] rounded-full opacity-80 pointer-events-none z-50 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ease-in-out ${isReady ? 'transition-all duration-[1200ms]' : ''} ${
                        isRelocated ? "border-[2px]" : "border-[4px]"
                    }`}></div>
                    
                    <div className={`absolute rounded-full bg-black shadow-[inset_0_10px_30px_rgba(255,255,255,0.05)] overflow-hidden isolate z-10 ease-in-out ${isReady ? 'transition-all duration-[1200ms]' : ''} ${
                        isRelocated ? "inset-0.5" : "inset-4"
                    }`}>
                        <img 
                            src="https://raw.githubusercontent.com/sauah666/WDYGAJ/678f874bb628e15ef6eea7b2ed1c4b2228d204b6/valera.png"
                            alt="Valera"
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-10 ${videoPhase === 'IDLE' ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <video 
                            ref={loopVideoRef}
                            src={LOOP_VIDEO}
                            className={`absolute inset-0 w-full h-full object-cover z-20 ${videoPhase === 'LOOP' ? 'opacity-100' : 'opacity-0'}`}
                            playsInline muted loop preload="auto"
                            onPlaying={handleLoopPlaying}
                        />
                        <video 
                            ref={introVideoRef}
                            src={INTRO_VIDEO}
                            className={`absolute inset-0 w-full h-full object-cover z-30 ${(videoPhase === 'INTRO' || (videoPhase === 'LOOP' && !loopStarted)) ? 'opacity-100' : 'opacity-0'}`}
                            playsInline muted preload="auto"
                            onEnded={handleIntroEnd}
                            onTimeUpdate={handleIntroTimeUpdate}
                        />
                        <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none z-30 transition-opacity duration-500 ${videoPhase !== 'IDLE' ? 'opacity-10' : 'opacity-30 animate-pulse'}`}></div>
                    </div>
                </div>
            </Atropos>
        </div>

        {/* --- BUTTONS --- */}
        {/* Settings: Top Right */}
        <div 
            className={`fixed top-6 right-6 z-50 ease-out flex items-center justify-center ${isReady ? 'transition-all duration-[1200ms]' : ''} ${
                isRelocated ? 'opacity-0 -translate-y-20 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}
        >
            <button 
                onClick={onSettingsClick}
                disabled={isPlaying}
                className={`group relative w-14 h-14 transition-all duration-200 ease-out flex items-center justify-center active:scale-95 ${isPlaying ? 'opacity-50' : ''}`}
            >
                 <div className="absolute inset-0 rounded-full bg-[#0c0a08] shadow-md border-2 border-[#44403c] group-hover:border-[#d97706] transition-colors"></div>
                 <Settings size={22} className="relative z-10 text-[#a8a29e] group-hover:text-[#d97706] group-hover:rotate-90 transition-all duration-500" />
            </button>
        </div>

        {/* Call Button: Bottom Center */}
        <div 
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-30 ease-out flex items-center justify-center ${isReady ? 'transition-all duration-[1200ms]' : ''} ${
                isRelocated ? 'opacity-0 translate-y-20 pointer-events-none scale-50' : 'opacity-100 translate-y-0 scale-100'
            }`}
        >
            <button 
                onClick={handleCall}
                disabled={isPlaying}
                className={`group relative w-24 h-24 transition-all duration-200 ease-out flex items-center justify-center ${isPlaying ? 'scale-95' : 'active:scale-95'}`}
            >
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#1a120e] to-[#0c0a08] shadow-[0_5px_20px_rgba(0,0,0,0.6)] transition-all ${isPlaying ? 'translate-y-1' : ''}`}></div>
                <div className={`absolute inset-2 rounded-full bg-gradient-to-t from-[#292524] to-[#1a120e] flex items-center justify-center border border-[#3e2f26]`}>
                    <div className={`relative z-10 p-4 rounded-full border-2 bg-[#1c1917] shadow-lg transition-all duration-500 ${
                        isPlaying 
                        ? 'border-green-600 bg-[#064e3b] shadow-[0_0_20px_rgba(22,163,74,0.6)]' 
                        : 'border-[#44403c] hover:border-[#d97706]'
                    }`}>
                        {isPlaying ? (
                            <Power size={30} className="text-white animate-pulse" />
                        ) : (
                            <Phone size={30} className="text-[#a8a29e] group-hover:text-[#d6d3d1]" />
                        )}
                    </div>
                </div>
            </button>
        </div>

      </div>
    </Layout>
  );
};
