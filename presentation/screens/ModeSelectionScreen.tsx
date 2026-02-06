import React, { useState, useRef } from 'react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';
import { Phone } from 'lucide-react';

interface Props {
  activeSite?: string;
  onSiteSelect?: (site: string) => void;
  onSelect: (mode: string) => void;
  onSettingsClick?: () => void;
  onNavigate?: (route: string) => void;
}

export const ModeSelectionScreen: React.FC<Props> = ({ activeSite, onSiteSelect, onSelect, onSettingsClick, onNavigate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleCall = () => {
      if (isPlaying) return;
      
      const video = videoRef.current;
      if (video) {
          setIsPlaying(true);
          video.currentTime = 0;
          video.play().catch(err => {
              console.error("Video playback failed:", err);
              setIsPlaying(false);
          });
      }
  };

  const handleVideoEnd = () => {
      // Sequence: Idle (Img) -> Click -> Video Play -> End -> Idle (Img)
      setIsPlaying(false);
  };

  return (
    <Layout title="" hideSidebar={true} onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="flex flex-col items-center justify-center h-full w-full relative pt-24 pb-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
        
        {/* --- CENTRAL COMPONENT: THE VIDEOPHONE ORB --- */}
        <div className="relative group z-20 shrink-0 mt-4">
            <Atropos
                activeOffset={20}
                shadowScale={0.8}
                className="rounded-full w-[310px] h-[310px] sm:w-[380px] sm:h-[380px] md:w-[540px] md:h-[540px] lg:w-[600px] lg:h-[600px]"
            >
                {/* The Housing */}
                <div 
                    className="relative w-full h-full rounded-full border-[20px] md:border-[30px] border-[#2e1d15] bg-[#1a120e] shadow-[0_50px_100px_rgba(0,0,0,1),inset_0_0_50px_black] flex items-center justify-center overflow-hidden"
                >
                    {/* Brass Ring (Top Layer z-50) */}
                    <div className="absolute inset-0 border-[4px] md:border-[8px] border-[#b45309] rounded-full opacity-80 pointer-events-none z-50 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]"></div>
                    
                    {/* THE SCREEN AREA (Middle Layer z-10) */}
                    <div className="absolute inset-4 md:inset-6 rounded-full bg-black shadow-[inset_0_10px_40px_rgba(255,255,255,0.05)] overflow-hidden isolate z-10">
                        
                        {/* Layer 1: DEFAULT IMAGE (Valera) */}
                        {/* Visible when NOT playing (isPlaying=false) */}
                        <img 
                            src="https://raw.githubusercontent.com/sauah666/WDYGAJ/678f874bb628e15ef6eea7b2ed1c4b2228d204b6/valera.png"
                            alt="Valera"
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-10 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
                        />

                        {/* Layer 2: VIDEO PLAYBACK (Valera) */}
                        {/* Visible when playing (isPlaying=true). */}
                        <video 
                            ref={videoRef}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-20 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
                            src="https://raw.githubusercontent.com/sauah666/WDYGAJ/9adbbc991fa9b9c12d54d6d435407de65c428635/valera_merged.mp4"
                            playsInline
                            preload="auto"
                            onEnded={handleVideoEnd}
                        />

                        {/* Layer 3: Screen Effects (Overlays) */}
                        
                        {/* Static Noise (Reduced when playing video for clarity) */}
                        <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none z-30 transition-opacity duration-500 ${isPlaying ? 'opacity-10' : 'opacity-30 animate-pulse'}`}></div>

                        {/* Vignette */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-30 mix-blend-multiply"></div>

                        {/* Glass Reflections */}
                        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-2xl pointer-events-none z-40"></div>
                        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-900/10 rounded-full blur-3xl z-40"></div>
                        
                        {/* CRT Scanlines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none z-40 opacity-30"></div>

                        {/* Center Point (The Lens) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-[#111] rounded-full shadow-[0_0_20px_black] border border-[#222] z-50 opacity-50"></div>
                    </div>

                </div>
            </Atropos>
        </div>

        {/* --- THE SHABBY BUTTON (Worn Out) --- */}
        <div className="relative z-30 shrink-0 mt-16 pb-10">
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