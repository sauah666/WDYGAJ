import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';
import { Phone, ChevronDown, Settings, Archive, Power, Brain, Infinity, AlertTriangle } from 'lucide-react';
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
  onSelect: (mode: string) => void; 
  onSettingsClick?: () => void;
  onNavigate?: (route: string) => void;
  appliedHistory?: AppliedVacancyRecord[]; 
  onWipeMemory?: () => void;
  skipIntro?: boolean; 
}

const INTRO_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/9adbbc991fa9b9c12d54d6d435407de65c428635/valera_merged.mp4";
const LOOP_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/98771fc49589081d334b431a618452b72c0c450e/valera_idle_merged.mp4";
const STANDBY_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/e3e1c61224d4c30fb39e8a939df0f4d6a304a908/please_standby.mp4";
const CHASSIS_BG = "https://raw.githubusercontent.com/sauah666/WDYGAJ/ed61ef26ca4add352beecc389c7c40e7d8e7893d/valera_framed.png";
const STEAM_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/f1d8a52d7fee04b41bfab56be7375f83bf7ac959/steam.mp4";

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
    onSettingsClick, 
    onNavigate,
    appliedHistory = [],
    onWipeMemory,
    skipIntro = false
}) => {
  const [videoPhase, setVideoPhase] = useState<VideoPhase>(skipIntro ? 'LOOP' : 'IDLE');
  const [isRelocated, setIsRelocated] = useState(skipIntro);
  const [isOrbExpanded, setIsOrbExpanded] = useState(false); 
  const [showPanel, setShowPanel] = useState(skipIntro);
  const [loopStarted, setLoopStarted] = useState(false);
  
  const [showArchive, setShowArchive] = useState(false);
  const [showAmnesiaConfirm, setShowAmnesiaConfirm] = useState(false);

  // Orb Positioning
  const avatarRef = useRef<HTMLDivElement>(null);
  const [orbDest, setOrbDest] = useState<{top: number, left: number, width: number, height: number} | null>(null);

  // Video Refs
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  const standbyVideoRef = useRef<HTMLVideoElement>(null);
  
  // Location
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  // Message
  const [agentMessage, setAgentMessage] = useState<string>("Система готова. Задайте параметры.");
  const [typedMessage, setTypedMessage] = useState<string>("");
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validation Logic
  const currentModes = config.targetWorkModes || [];
  const isAutoCoverLetter = !!config.autoCoverLetter;
  const hasCoverLetter = !!config.coverLetterTemplate && config.coverLetterTemplate.trim().length > 0;
  
  const canStart = currentModes.length > 0 && (isAutoCoverLetter || hasCoverLetter);

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
    if (config.maxApplications === undefined) onConfigChange('maxApplications', 10);
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

  useEffect(() => {
    if (skipIntro) return; 
    let timer: ReturnType<typeof setTimeout>;
    if (isRelocated) {
        timer = setTimeout(() => setShowPanel(true), 1200); 
    } else {
        setShowPanel(false);
    }
    return () => clearTimeout(timer);
  }, [isRelocated, skipIntro]);

  const handleWakeUp = () => {
      if (videoPhase !== 'IDLE') return;
      updateOrbTarget();
      setIsRelocated(false);
      setLoopStarted(false);
      setVideoPhase('INTRO');
      
      if (standbyVideoRef.current) standbyVideoRef.current.pause();
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

  const handleWipeWrapper = () => {
      if(onWipeMemory) onWipeMemory();
      setShowArchive(false);
      setShowAmnesiaConfirm(false);
      setIsOrbExpanded(false); 
  };

  const handleOrbClick = () => {
      if (isRelocated && videoPhase !== 'IDLE') {
          setIsOrbExpanded(true);
      }
  };

  const handleOrbClose = () => {
      setIsOrbExpanded(false);
  };

  const isPlaying = videoPhase !== 'IDLE';
  
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

  const handleStartSearch = () => {
      if (canStart) onRun();
  };

  const handleCoverLetterModeSwitch = (mode: 'MANUAL' | 'AUTO') => {
      const isAuto = mode === 'AUTO';
      onConfigChange('autoCoverLetter', isAuto);
      setAgentMessage(JokeService.getJoke(isAuto ? 'CL_AUTO' : 'CL_MANUAL'));
  };

  const handleLimitSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (val === 101) {
          onConfigChange('maxApplications', 0); // 0 = Infinity
          setAgentMessage("⚠️ ВНИМАНИЕ: Безлимитный режим. Следите за расходом токенов!");
      } else {
          onConfigChange('maxApplications', val);
      }
  };

  let orbStyle: React.CSSProperties = {};
  let orbClasses = "";

  const isAnimating = (!skipIntro && videoPhase !== 'IDLE') || isOrbExpanded;
  const transitionClass = isAnimating ? "transition-all duration-[1200ms] ease-in-out" : "";

  if (isOrbExpanded) {
      orbClasses = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[500px] md:h-[500px] z-[60] transition-all duration-500 ease-out";
  } else if (isRelocated && orbDest) {
      orbStyle = {
          top: orbDest.top,
          left: orbDest.left,
          width: orbDest.width,
          height: orbDest.height,
          transform: 'none'
      };
      orbClasses = `fixed z-50 ${transitionClass} cursor-pointer hover:brightness-110`;
  } else {
      orbClasses = "fixed top-[33%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[265px] h-[265px] md:w-[315px] md:h-[315px] z-[5] ease-in-out";
  }

  // Calculate Slider Value: 0 (infinity) -> 101 for UI
  const sliderVal = (!config.maxApplications || config.maxApplications === 0) ? 101 : config.maxApplications;
  const isInfinity = sliderVal === 101;

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
        /* Custom Range Slider Styling */
        input[type=range] {
            -webkit-appearance: none; 
            width: 100%; 
            background: transparent;
        }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #d97706;
            cursor: pointer;
            margin-top: -8px;
            box-shadow: 0 0 10px rgba(217, 119, 6, 0.5);
            border: 2px solid #fff;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 4px;
            cursor: pointer;
            background: #3e2f26;
            border-radius: 2px;
        }
        input[type=range]:focus {
            outline: none;
        }
      `}</style>

      {/* BACKDROP */}
      <div 
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[55] transition-opacity duration-500 ${isOrbExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={handleOrbClose}
      ></div>

      {/* AMNESIA OVERLAY */}
      {showAmnesiaConfirm && (
          <div className="absolute inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center animate-switch-on p-4">
              <div className="bg-[#1a120e] border-[3px] border-[#b91c1c] rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(185,28,28,0.5)] flex flex-col items-center text-center">
                  <Brain size={48} className="text-[#ef4444] mb-4 animate-pulse" />
                  <h3 className="text-xl font-bold text-[#fca5a5] uppercase tracking-widest mb-2 font-sans">Режим Амнезии</h3>
                  <p className="text-[#a8a29e] font-mono text-sm mb-6">
                      Вы действительно хотите стереть память агента?
                  </p>
                  <div className="flex gap-4 w-full">
                      <button onClick={() => { setShowAmnesiaConfirm(false); setIsOrbExpanded(false); }} className="flex-1 py-3 border border-[#44403c] rounded-2xl hover:bg-[#292524] text-[#a8a29e] font-bold font-sans">Отмена</button>
                      <button onClick={handleWipeWrapper} className="flex-1 py-3 bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#ef4444] rounded-2xl text-white font-bold font-sans shadow-[0_0_15px_rgba(239,68,68,0.4)]">Стереть</button>
                  </div>
              </div>
          </div>
      )}

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
        
        {/* BACKGROUNDS */}
        <div className={`absolute bottom-0 w-full h-[33%] z-5 pointer-events-none transition-all duration-700 ease-in-out flex justify-center items-end ${isRelocated ? 'opacity-0' : 'opacity-100'}`}>
             <video src={STEAM_VIDEO} className="w-full h-full object-cover opacity-80" autoPlay loop muted playsInline />
        </div>
        <div className={`absolute inset-0 z-10 pointer-events-none flex items-center justify-center transition-all duration-700 ease-in-out ${isRelocated ? 'opacity-0 brightness-0' : 'opacity-100 brightness-100'}`}>
            <img src={CHASSIS_BG} alt="Chassis" className="w-full h-full object-cover object-center scale-105" />
        </div>

        {/* --- MAIN PANEL (COMPACT LAYOUT) --- */}
        <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none`}>
            <div 
                className={`relative w-[98%] h-[98%] md:w-[600px] md:h-auto md:max-h-[95vh] bg-[#2a2420] border-[3px] border-[#4a3b32] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-xl md:rounded-[2.5rem] overflow-hidden flex flex-col font-serif ${showPanel ? 'pointer-events-auto animate-switch-on' : 'opacity-0'}`}
                style={{ 
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-leather.png')`,
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,1)'
                }}
            >
                {/* 1. HEADER */}
                <div className="shrink-0 relative h-12 bg-[#1a120e] border-b-4 border-[#3a2d25] flex items-center justify-between px-6 md:px-8 shadow-md z-30">
                    <div className="flex gap-2">
                        <button onClick={() => setShowArchive(true)} className="text-[#78716c] hover:text-[#fcd34d] transition-colors p-1.5 rounded-full hover:bg-[#2a2018] relative group pointer-events-auto">
                            <Archive size={20} />
                            {appliedHistory.length > 0 && <div className="absolute top-1 right-1 w-2 h-2 bg-[#d97706] rounded-full"></div>}
                        </button>
                    </div>
                    <h2 className="relative z-10 font-serif font-bold text-lg text-[#cdbba7] tracking-widest uppercase text-shadow-md">
                        Параметры
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={onSettingsClick} className="text-[#78716c] hover:text-[#fcd34d] transition-colors p-1.5 rounded-full hover:bg-[#2a2018] relative group pointer-events-auto">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {/* 2. ORB ROW */}
                <div className="shrink-0 p-3 pb-1 bg-[#2a2420] z-20 relative">
                    <div className="flex gap-3 items-stretch h-24 relative px-2">
                        <div ref={avatarRef} className="w-24 shrink-0 relative opacity-0"></div>
                        <div className="flex-1 bg-[#1a1512] rounded-2xl border-2 border-[#3a2d25] shadow-[inset_0_2px_10px_black] relative overflow-hidden p-2 flex flex-col justify-center">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-10"></div>
                             <div className="relative z-10 font-mono text-[#d97706] text-xs leading-tight drop-shadow-md break-words pl-1">
                                 <span className="opacity-90">{typedMessage}</span>
                                 <span className="inline-block w-2 h-4 bg-[#d97706] ml-1 animate-[blink_1s_infinite] align-middle"></span>
                             </div>
                             <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse shadow-[0_0_4px_green]"></div>
                        </div>
                    </div>
                </div>

                {/* 3. INPUTS AREA (CONDENSED) */}
                <div className="flex-1 px-6 md:px-8 pb-2 relative z-10 flex flex-col gap-2 pointer-events-auto overflow-hidden">
                     
                    {/* Divider */}
                    <div className="relative flex items-center justify-center py-1 opacity-50 shrink-0">
                        <div className="h-px bg-[#4a3b32] flex-1"></div>
                        <div className="px-2 text-[#8c7b70] font-serif text-[9px] font-bold tracking-widest uppercase">
                            Быстрый Старт ({config.targetSite || 'hh.ru'})
                        </div>
                        <div className="h-px bg-[#4a3b32] flex-1"></div>
                    </div>

                    {/* Row 1: Salary & Location */}
                    <div className="flex gap-3 shrink-0">
                        {/* Salary */}
                        <div className="flex-[1.2] flex flex-col gap-1">
                            <label className="text-[9px] text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Зарплата</label>
                            <input 
                                type="number"
                                value={config.minSalary !== undefined ? config.minSalary : 0}
                                placeholder="0"
                                onChange={(e) => handleSalaryChange(parseInt(e.target.value) || 0)}
                                className="w-full h-8 bg-[#140c08] text-[#e7e5e4] font-mono text-sm text-center outline-none border border-[#3e2f26] rounded-xl focus:border-[#d97706] transition-all shadow-inner placeholder-[#2a2018]"
                            />
                        </div>
                        {/* Location */}
                        <div className="flex-1 flex flex-col gap-1 relative z-30" ref={locationRef}>
                            <label className="text-[9px] text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Локация</label>
                            <div className="relative">
                                <button 
                                    onClick={() => setIsLocationOpen(!isLocationOpen)}
                                    className="w-full h-8 flex items-center justify-between bg-[#0c0a08] border border-[#3e2f26] rounded-xl px-3 text-[#cdbba7] font-mono text-xs shadow-inner outline-none active:bg-[#1a120e]"
                                >
                                    <span className="truncate">{config.city || "Global"}</span>
                                    <ChevronDown size={14} className={`text-[#d97706] transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isLocationOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a120e] border border-[#4a3b32] rounded-2xl shadow-xl overflow-hidden z-50">
                                        {LOCATIONS.map((loc) => (
                                            <button key={loc.value} onClick={() => handleLocationSelect(loc.value)} className="w-full text-left px-3 py-2 text-[#a8a29e] hover:bg-[#2a1a0f] hover:text-[#d97706] font-mono text-xs border-b border-[#292524] last:border-0 first:pt-3 last:pb-3">
                                                {loc.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Work Mode (Full Width) */}
                    <div className="flex flex-col gap-1 shrink-0">
                        <label className="text-[9px] text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Режим Работы</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.OFFICE].map((mode) => {
                                const active = currentModes.includes(mode);
                                return (
                                    <button 
                                    key={mode}
                                    onClick={() => toggleMode(mode)}
                                    className={`relative h-8 border bg-[#140f0c] shadow-inner group overflow-hidden transition-all duration-200 active:scale-95 rounded-xl flex items-center justify-center ${
                                        active ? 'border-[#d97706] bg-[#2a1a0f]' : 'border-[#3e2f26]'
                                    }`}
                                    title={mode}
                                    >
                                        <span className={`text-[8px] md:text-[9px] font-bold font-serif uppercase tracking-wider ${active ? 'text-[#d97706]' : 'text-[#4a3b32] group-hover:text-[#6b5548]'}`}>
                                            {mode === 'REMOTE' ? 'Удаленка' : mode === 'HYBRID' ? 'Гибрид' : 'Офис'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 3: Application Limit (Slider) */}
                    <div className="flex flex-col gap-1 shrink-0 bg-[#140c08] border border-[#3e2f26] rounded-xl p-2 px-3 shadow-inner">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[9px] text-[#78685f] font-bold uppercase tracking-wider font-serif flex items-center gap-1">
                                {isInfinity && <AlertTriangle size={10} className="text-[#ef4444] animate-pulse" />}
                                Лимит Откликов
                            </label>
                            <span className={`font-mono text-xs font-bold ${isInfinity ? 'text-[#ef4444]' : 'text-[#d97706]'}`}>
                                {isInfinity ? <Infinity size={14} /> : sliderVal}
                            </span>
                        </div>
                        <div className="relative flex items-center h-6">
                            <input 
                                type="range" 
                                min="1" 
                                max="101" 
                                value={sliderVal} 
                                onChange={handleLimitSliderChange}
                                className="z-10"
                            />
                            {/* Track marks */}
                            <div className="absolute top-1/2 left-0 w-full h-[2px] pointer-events-none flex justify-between px-1">
                                <div className="w-[1px] h-2 bg-[#4a3b32]"></div>
                                <div className="w-[1px] h-2 bg-[#4a3b32]"></div>
                                <div className="w-[1px] h-2 bg-[#ef4444]"></div> {/* Red line for Infinity */}
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Cover Letter - Compressed */}
                    <div className="flex-1 min-h-0 flex flex-col gap-1 pb-1">
                        <div className="flex justify-between items-center shrink-0">
                            <label className="text-[9px] text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Письмо</label>
                            {/* Compact Switch */}
                            <div className="relative h-5 w-28 bg-[#0c0a08] rounded-full border border-[#3e2f26] p-0.5 flex shadow-inner">
                                <div className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-[#2a1a0f] border border-[#d97706] rounded-full transition-all duration-300 ${isAutoCoverLetter ? 'left-[calc(50%+1px)]' : 'left-0.5'}`}></div>
                                <button onClick={() => handleCoverLetterModeSwitch('MANUAL')} className={`relative z-10 flex-1 flex items-center justify-center font-bold text-[8px] uppercase tracking-wider transition-colors ${!isAutoCoverLetter ? 'text-[#d97706]' : 'text-[#57534e]'}`}>Ручное</button>
                                <button onClick={() => handleCoverLetterModeSwitch('AUTO')} className={`relative z-10 flex-1 flex items-center justify-center font-bold text-[8px] uppercase tracking-wider transition-colors ${isAutoCoverLetter ? 'text-[#d97706]' : 'text-[#57534e]'}`}>Авто</button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="relative flex-1 min-h-0 overflow-hidden rounded-xl border border-[#3e2f26] bg-[#140c08] shadow-inner">
                            {/* Manual */}
                            <div className={`absolute inset-0 transition-all duration-500 transform ${!isAutoCoverLetter ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                                <textarea 
                                    value={config.coverLetterTemplate || ''}
                                    onChange={(e) => onConfigChange('coverLetterTemplate', e.target.value)}
                                    className="w-full h-full bg-transparent p-2 text-[#e7e5e4] font-mono text-[10px] outline-none resize-none custom-scrollbar placeholder-[#2a2018] leading-tight"
                                    placeholder="Здравствуйте! Меня заинтересовала вакансия..."
                                />
                            </div>
                            {/* Auto */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${isAutoCoverLetter ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
                                <div className="flex flex-col items-center justify-center gap-1 text-center px-4">
                                    <Brain size={20} className="text-[#d97706] animate-pulse" />
                                    <span className="text-[#57534e] font-mono text-[9px] uppercase tracking-widest">
                                        Нейросеть напишет письмо
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. FOOTER */}
                <div className="shrink-0 relative p-3 px-6 md:px-8 bg-[#1a120e] border-t-2 border-[#3a2d25] shadow-inner z-30 pointer-events-auto flex justify-center">
                    <button 
                        onClick={handleStartSearch} 
                        disabled={!canStart}
                        className={`relative px-10 h-10 border shadow-[0_3px_8px_black] transition-all group overflow-hidden rounded-full flex items-center justify-center gap-3 ${
                            canStart 
                                ? 'bg-gradient-to-b from-[#6b350f] to-[#451a03] border-[#78350f] active:translate-y-1 cursor-pointer' 
                                : 'bg-[#292524] border-[#1c1917] opacity-60 cursor-not-allowed grayscale'
                        }`}
                    >
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay"></div>
                         <span className={`relative z-10 font-serif font-black text-sm tracking-[0.15em] uppercase drop-shadow-md ${canStart ? 'text-[#fcd34d]' : 'text-[#78716c]'}`}>
                             ПОЕХАЛИ!
                         </span>
                    </button>
                </div>
            </div>
        </div>

        {/* --- ORB --- */}
        <div className={orbClasses} style={orbStyle} onClick={handleOrbClick}>
            <Atropos activeOffset={10} shadowScale={0.5} className="w-full h-full rounded-full">
                <div className={`relative w-full h-full rounded-full bg-[#1a120e] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden border-[#2e1d15] ease-in-out ${isRelocated ? (videoPhase !== 'IDLE' ? "transition-all duration-[1200ms]" : "") + " border-[3px]" : "border-0"}`}>
                    <div className={`absolute inset-0 border-[#b45309] rounded-full opacity-80 pointer-events-none z-50 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ease-in-out ${isRelocated ? (videoPhase !== 'IDLE' ? "transition-all duration-[1200ms]" : "") + " border-[2px]" : "border-0"}`}></div>
                    <div className={`absolute rounded-full bg-black shadow-[inset_0_10px_30px_rgba(255,255,255,0.05)] overflow-hidden isolate z-10 ease-in-out ${isRelocated ? (videoPhase !== 'IDLE' ? "transition-all duration-[1200ms]" : "") + " inset-0.5" : "inset-0"}`}>
                        <video ref={standbyVideoRef} src={STANDBY_VIDEO} className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${videoPhase === 'IDLE' ? 'opacity-100' : 'opacity-0'}`} playsInline muted loop autoPlay />
                        <video ref={loopVideoRef} src={LOOP_VIDEO} className={`absolute inset-0 w-full h-full object-cover z-20 ${videoPhase === 'LOOP' ? 'opacity-100' : 'opacity-0'}`} playsInline muted loop preload="auto" onPlaying={handleLoopPlaying} />
                        <video ref={introVideoRef} src={INTRO_VIDEO} className={`absolute inset-0 w-full h-full object-cover z-30 ${(videoPhase === 'INTRO' || (videoPhase === 'LOOP' && !loopStarted)) ? 'opacity-100' : 'opacity-0'}`} playsInline muted preload="auto" onEnded={handleIntroEnd} onTimeUpdate={handleIntroTimeUpdate} />
                        <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none z-30 transition-opacity duration-500 ${videoPhase !== 'IDLE' ? 'opacity-10' : 'opacity-30 animate-pulse'}`}></div>
                    </div>
                </div>
            </Atropos>
        </div>

        {/* --- BUTTONS --- */}
        {!isRelocated && (
            <div className={`fixed top-6 right-6 z-50 ease-out flex items-center justify-center opacity-100 translate-y-0`}>
                <button onClick={onSettingsClick} className={`group relative w-14 h-14 transition-all duration-200 ease-out flex items-center justify-center active:scale-95`}>
                    <div className="absolute inset-0 rounded-full bg-[#1c1917] shadow-[0_5px_15px_black] border-2 border-[#b45309] group-hover:border-[#fcd34d] transition-colors"></div>
                    <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent)] pointer-events-none"></div>
                    <Settings size={26} className="relative z-10 text-[#fcd34d] drop-shadow-md group-hover:rotate-90 transition-all duration-700 ease-in-out" />
                </button>
            </div>
        )}

        <div className={`fixed bottom-[23%] left-1/2 -translate-x-1/2 z-30 ease-out flex items-center justify-center ${isRelocated ? 'opacity-0 translate-y-20 pointer-events-none scale-50 transition-all duration-[1200ms]' : 'opacity-100 translate-y-0 scale-100'}`}>
            <button onClick={handleWakeUp} disabled={isPlaying} className={`group relative w-20 h-20 md:w-24 md:h-24 transition-all duration-200 ease-out flex items-center justify-center ${isPlaying ? 'scale-95' : 'active:scale-95'}`}>
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#1a120e] to-[#0c0a08] shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-[3px] border-[#2a1a0f]`}></div>
                <div className={`absolute inset-1 rounded-full bg-[#0a0503] shadow-[inset_0_2px_5px_black] flex items-center justify-center`}>
                    <div className={`relative w-full h-full rounded-full border-2 transition-all duration-500 flex items-center justify-center overflow-hidden ${isPlaying ? 'bg-gradient-to-t from-[#064e3b] to-[#22c55e] border-[#16a34a] shadow-[0_0_25px_rgba(34,197,94,0.6)]' : 'bg-gradient-to-t from-[#451a03] to-[#d97706] border-[#78350f] group-hover:brightness-110 shadow-[inset_0_2px_10px_rgba(255,255,255,0.2)]'}`}>
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full pointer-events-none"></div>
                        {isPlaying ? <Power size={36} className="text-white animate-pulse drop-shadow-md relative z-10" /> : <Phone size={36} className="text-[#fef3c7] drop-shadow-md relative z-10" />}
                    </div>
                </div>
            </button>
        </div>

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