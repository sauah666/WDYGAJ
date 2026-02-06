import React, { useState, useRef, useEffect } from 'react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';
import { Phone, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { AgentConfig, WorkMode } from '../../types';

interface Props {
  config: Partial<AgentConfig>;
  activeSite?: string;
  onSiteSelect?: (site: string) => void;
  onConfigChange: (key: keyof AgentConfig, value: any) => void;
  onRun: () => void;
  onSelect: (mode: string) => void;
  onSettingsClick?: () => void;
  onNavigate?: (route: string) => void;
}

const INTRO_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/9adbbc991fa9b9c12d54d6d435407de65c428635/valera_merged.mp4";
const LOOP_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/98771fc49589081d334b431a618452b72c0c450e/valera_idle_merged.mp4";

type VideoPhase = 'IDLE' | 'INTRO' | 'LOOP';

export const ModeSelectionScreen: React.FC<Props> = ({ 
    config, 
    activeSite, 
    onSiteSelect, 
    onConfigChange, 
    onRun,
    onSelect, 
    onSettingsClick, 
    onNavigate 
}) => {
  const [videoPhase, setVideoPhase] = useState<VideoPhase>('IDLE');
  const [isRelocated, setIsRelocated] = useState(false);
  const [loopStarted, setLoopStarted] = useState(false);
  
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize defaults if missing
  useEffect(() => {
    if (!config.targetWorkModes || config.targetWorkModes.length === 0) {
        onConfigChange('targetWorkModes', [WorkMode.REMOTE]);
    }
  }, []);

  const handleCall = () => {
      if (videoPhase !== 'IDLE') return;
      
      // Reset state for new call
      setIsRelocated(false);
      setLoopStarted(false);
      setVideoPhase('INTRO');

      // Play Intro
      if (introVideoRef.current) {
          introVideoRef.current.currentTime = 0;
          introVideoRef.current.play().catch(console.error);
      }
      // Reset Loop (Ready for swap)
      if (loopVideoRef.current) {
          loopVideoRef.current.currentTime = 0;
          loopVideoRef.current.pause();
      }
  };

  const handleIntroEnd = () => {
      // Switch phase, start loop immediately
      setVideoPhase('LOOP');
      if (loopVideoRef.current) {
          loopVideoRef.current.play().catch(console.error);
      }
  };

  const handleLoopPlaying = () => {
      setLoopStarted(true);
  };

  const handleIntroTimeUpdate = () => {
      const video = introVideoRef.current;
      // Trigger movement logic during the INTRO phase
      if (videoPhase === 'INTRO' && video && video.duration) {
          if (video.currentTime > video.duration / 2 && !isRelocated) {
              setIsRelocated(true);
          }
      }
  };

  const isPlaying = videoPhase !== 'IDLE';
  const currentModes = config.targetWorkModes || [];
  const toggleMode = (mode: WorkMode) => {
      if (currentModes.includes(mode)) {
          if (currentModes.length > 1) {
              onConfigChange('targetWorkModes', currentModes.filter(m => m !== mode));
          }
      } else {
          onConfigChange('targetWorkModes', [...currentModes, mode]);
      }
  };
  const isCityRequired = currentModes.some(m => m === WorkMode.OFFICE || m === WorkMode.HYBRID || m === WorkMode.ANY);

  return (
    <Layout title="" hideSidebar={true} onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="flex flex-col items-center justify-center h-full w-full relative pt-0 pb-0 overflow-hidden">
        
        {/* --- SPACER (Holds layout space when Orb goes fixed) --- */}
        {/* Removed or minimized as per new fluid design requirements */}
        
        {/* --- SETTINGS UI PANEL (Fades In when Orb moves) --- */}
        <div 
            className={`absolute top-0 right-0 bottom-0 w-full md:w-2/3 lg:w-1/2 p-8 md:p-12 z-20 flex flex-col justify-center transition-all duration-[2000ms] ease-out ${
                isRelocated ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20 pointer-events-none'
            }`}
        >
            <div className="bg-[#1c1917]/90 border-2 border-[#44403c] p-8 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-sm relative overflow-hidden">
                {/* Panel Decals */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d97706] to-transparent opacity-50"></div>
                <div className="absolute bottom-0 right-0 p-2 text-[10px] font-mono text-[#57534e] uppercase">Sys.Config.V2</div>

                <h2 className="text-3xl font-serif font-bold text-[#e7e5e4] mb-8 uppercase tracking-widest flex items-center gap-4">
                    <div className="w-2 h-8 bg-[#d97706]"></div>
                    Параметры Охоты
                </h2>

                <div className="space-y-8">
                    {/* 1. Reward & Currency */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-[#a8a29e] mb-2 uppercase font-serif tracking-wide">Вознаграждение (Min)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-[#d97706] font-serif font-bold text-lg">
                                    {config.currency === 'USD' ? '$' : config.currency === 'EUR' ? '€' : '₽'}
                                </span>
                                <input 
                                    type="number" 
                                    value={config.minSalary || ''}
                                    onChange={(e) => onConfigChange('minSalary', parseInt(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-[#0c0a08] border border-[#57534e] text-[#e7e5e4] pl-8 pr-4 py-3 font-mono text-xl focus:border-[#d97706] outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#a8a29e] mb-2 uppercase font-serif tracking-wide">Валюта</label>
                            <div className="flex gap-1 h-[54px]">
                                {['RUB', 'USD', 'EUR'].map(curr => (
                                    <button 
                                        key={curr}
                                        onClick={() => onConfigChange('currency', curr)}
                                        className={`flex-1 font-bold font-serif border transition-all ${config.currency === curr ? 'bg-[#d97706] text-[#0c0a08] border-[#d97706]' : 'bg-[#0c0a08] text-[#78716c] border-[#292524] hover:text-[#d6d3d1]'}`}
                                    >
                                        {curr}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 2. City */}
                    <div>
                        <label className="block text-xs font-bold text-[#a8a29e] mb-2 uppercase font-serif tracking-wide">Территория</label>
                        <input 
                            type="text" 
                            value={config.city || ''}
                            onChange={(e) => onConfigChange('city', e.target.value)}
                            placeholder={isCityRequired ? "Укажите Город" : "Весь Мир (Global)"}
                            className={`w-full bg-[#0c0a08] border p-3 font-cursive text-xl text-[#e7e5e4] outline-none focus:border-[#d97706] placeholder-[#44403c] transition-colors ${!isCityRequired && !config.city ? 'border-[#15803d]/50 text-[#15803d]' : 'border-[#57534e]'}`}
                        />
                    </div>

                    {/* 3. Work Modes */}
                    <div>
                        <label className="block text-xs font-bold text-[#a8a29e] mb-2 uppercase font-serif tracking-wide">Режим</label>
                        <div className="flex gap-4">
                            {[WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.OFFICE].map((mode) => {
                                const active = currentModes.includes(mode);
                                return (
                                    <button 
                                        key={mode}
                                        onClick={() => toggleMode(mode)}
                                        className={`flex-1 flex flex-col items-center justify-center py-3 border transition-all ${active ? 'bg-[#292524] border-[#d97706] text-[#d97706]' : 'bg-[#0c0a08] border-[#292524] text-[#57534e] hover:border-[#57534e]'}`}
                                    >
                                        <div className="mb-1">{active ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                                        <span className="text-xs font-bold uppercase">{mode}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <button 
                        onClick={onRun}
                        className="w-full mt-4 bg-[#78350f] hover:bg-[#92400e] text-[#f5f5f4] py-4 uppercase tracking-[0.2em] font-black font-serif text-xl shadow-[0_5px_0_#451a03] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center group"
                    >
                        <span className="group-hover:mr-4 transition-all">Начать Охоту</span>
                        <ArrowRight className="opacity-0 group-hover:opacity-100 transition-all -ml-6 group-hover:ml-0" />
                    </button>
                </div>
            </div>
        </div>


        {/* --- CENTRAL COMPONENT: THE VIDEOPHONE ORB (Animated Wrapper) --- */}
        <div 
            className={`fixed z-50 transition-all duration-[2000ms] ease-in-out ${
                isRelocated 
                    ? "top-8 left-8 w-[160px] h-[160px] translate-x-0 translate-y-0" 
                    : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[310px] h-[310px] sm:w-[380px] sm:h-[380px] md:w-[540px] md:h-[540px] lg:w-[600px] lg:h-[600px]"
            }`}
        >
            <Atropos
                activeOffset={20}
                shadowScale={0.8}
                className="w-full h-full rounded-full"
            >
                {/* The Housing */}
                <div 
                    className={`relative w-full h-full rounded-full bg-[#1a120e] shadow-[0_50px_100px_rgba(0,0,0,1),inset_0_0_50px_black] flex items-center justify-center overflow-hidden border-[#2e1d15] transition-all duration-[2000ms] ease-in-out ${
                        isRelocated ? "border-[4px]" : "border-[20px] md:border-[30px]"
                    }`}
                >
                    {/* Brass Ring (Top Layer z-50) */}
                    <div className={`absolute inset-0 border-[#b45309] rounded-full opacity-80 pointer-events-none z-50 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] transition-all duration-[2000ms] ${
                        isRelocated ? "border-[2px]" : "border-[4px] md:border-[8px]"
                    }`}></div>
                    
                    {/* THE SCREEN AREA (Middle Layer z-10) */}
                    <div className={`absolute rounded-full bg-black shadow-[inset_0_10px_40px_rgba(255,255,255,0.05)] overflow-hidden isolate z-10 transition-all duration-[2000ms] ${
                        isRelocated ? "inset-1" : "inset-4 md:inset-6"
                    }`}>
                        
                        {/* Layer 1: DEFAULT IMAGE (Valera) - IDLE state */}
                        <img 
                            src="https://raw.githubusercontent.com/sauah666/WDYGAJ/678f874bb628e15ef6eea7b2ed1c4b2228d204b6/valera.png"
                            alt="Valera"
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-10 ${videoPhase === 'IDLE' ? 'opacity-100' : 'opacity-0'}`}
                        />

                        {/* Layer 2: LOOP VIDEO (Valera Idle) - Z-20 (Middle) */}
                        {/* Always present but hidden until needed. Preloaded. */}
                        <video 
                            ref={loopVideoRef}
                            src={LOOP_VIDEO}
                            className={`absolute inset-0 w-full h-full object-cover z-20 ${videoPhase === 'LOOP' ? 'opacity-100' : 'opacity-0'}`}
                            playsInline
                            muted // Helper to ensure autoplay works seamlessly if user hasn't interacted enough (though they clicked Call)
                            loop
                            preload="auto"
                            onPlaying={handleLoopPlaying}
                        />

                        {/* Layer 3: INTRO VIDEO (Valera Talking) - Z-30 (Top) */}
                        {/* Stays visible if PHASE is INTRO *OR* if PHASE is LOOP but the loop hasn't actually rendered a frame yet (masking the cut) */}
                        <video 
                            ref={introVideoRef}
                            src={INTRO_VIDEO}
                            className={`absolute inset-0 w-full h-full object-cover z-30 ${(videoPhase === 'INTRO' || (videoPhase === 'LOOP' && !loopStarted)) ? 'opacity-100' : 'opacity-0'}`}
                            playsInline
                            muted // Helper
                            preload="auto"
                            onEnded={handleIntroEnd}
                            onTimeUpdate={handleIntroTimeUpdate}
                        />

                        {/* Layer 4: Screen Effects (Overlays) */}
                        
                        {/* Static Noise */}
                        <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none z-30 transition-opacity duration-500 ${videoPhase !== 'IDLE' ? 'opacity-10' : 'opacity-30 animate-pulse'}`}></div>

                        {/* Vignette */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-30 mix-blend-multiply"></div>

                        {/* Glass Reflections */}
                        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-2xl pointer-events-none z-40"></div>
                        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-900/10 rounded-full blur-3xl z-40"></div>
                        
                        {/* CRT Scanlines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none z-40 opacity-30"></div>

                        {/* Center Point (The Lens) */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#111] rounded-full shadow-[0_0_20px_black] border border-[#222] z-50 opacity-50 transition-all duration-[2000ms] ${
                            isRelocated ? "w-1 h-1" : "w-3 h-3 md:w-4 md:h-4"
                        }`}></div>
                    </div>

                </div>
            </Atropos>
        </div>

        {/* --- THE SHABBY BUTTON (Worn Out) --- */}
        <div 
            className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-30 transition-all duration-[2000ms] ease-out ${
                isRelocated ? 'opacity-0 translate-y-20 pointer-events-none scale-50' : 'opacity-100 translate-y-0 scale-100'
            }`}
        >
            <button 
                onClick={handleCall}
                disabled={isPlaying}
                className={`group relative w-20 h-20 md:w-24 md:h-24 transition-all duration-200 ease-out flex items-center justify-center ${isPlaying ? 'scale-95 cursor-wait' : 'active:scale-95'}`}
            >
                {/* 1. Deep Socket/Shadow (Hole) */}
                <div className="absolute inset-0 rounded-full bg-[#0c0a08] shadow-[inset_0_5px_10px_black,0_0_0_1px_rgba(255,255,255,0.05)]"></div>
                
                {/* 2. The Button Body (Worn Metal) */}
                <div className={`absolute inset-1 rounded-full bg-gradient-to-br from-[#57534e] via-[#44403c] to-[#292524] shadow-[0_5px_15px_rgba(0,0,0,0.5)] transition-all ${isPlaying ? 'translate-y-1' : 'group-active:translate-y-1'}`}>
                     {/* Scratches/Noise */}
                     <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-40 mix-blend-overlay"></div>
                </div>
                
                {/* 3. The Top Surface (Oxidized / Dirty) */}
                <div className={`absolute inset-2 rounded-full bg-gradient-to-t from-[#292524] to-[#57534e] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),inset_0_-1px_2px_rgba(255,255,255,0.1)] transition-all flex items-center justify-center border border-[#1c1917] ${isPlaying ? 'inset-2.5' : 'group-active:inset-2.5'}`}>
                    
                    {/* 4. The Icon (Dull/Old Glow) */}
                    <div className={`relative z-10 p-3 rounded-full border border-[#44403c] bg-[#1c1917] shadow-lg transition-all duration-500 ${isPlaying ? 'bg-[#291810] border-[#b45309]/50 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : ''}`}>
                        <Phone size={28} className={`transition-colors opacity-80 ${isPlaying ? 'text-red-500' : 'text-[#a8a29e] group-hover:text-[#d6d3d1]'}`} />
                    </div>
                </div>

                {/* 5. Minimal Highlight (Matte finish, barely visible) */}
                <div className="absolute top-2 left-4 right-4 h-4 bg-white/5 rounded-full pointer-events-none blur-sm"></div>
            </button>
        </div>

      </div>
    </Layout>
  );
};