import React from 'react';
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
  
  const handleCall = () => {
      // Logic preserved: Defaults to Job Search flow
      if (onNavigate) {
          onNavigate('JOB_PREFERENCES');
      } else {
          onSelect('JOB_SEARCH');
      }
  };

  return (
    <Layout title="" hideSidebar={true} onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="flex flex-col items-center justify-center h-full w-full relative pt-24 pb-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
        
        {/* --- CENTRAL COMPONENT: THE VIDEOPHONE ORB --- */}
        {/* Added mt-4 to ensure clearance from the centered title */}
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
                    {/* Brass Ring */}
                    <div className="absolute inset-0 border-[4px] md:border-[8px] border-[#b45309] rounded-full opacity-80 pointer-events-none z-10 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]"></div>
                    
                    {/* THE BLACK SCREEN (OFF STATE) */}
                    <div className="absolute inset-4 md:inset-6 rounded-full bg-black shadow-[inset_0_10px_40px_rgba(255,255,255,0.05)] overflow-hidden flex items-center justify-center">
                        
                        {/* Layer 1: Static / Noise (Background) */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse pointer-events-none z-0"></div>
                        
                        {/* Layer 2: FISHEYE TEXT CONTENT */}
                        {/* Scaled down to look deep inside. Flex centered. */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 md:p-20 animate-[pulse_6s_ease-in-out_infinite] transform scale-90">
                            
                            {/* Text Container with Monospace Font */}
                            <p className="font-mono text-[#fbbf24] text-xs md:text-sm leading-relaxed tracking-widest drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] opacity-90 uppercase">
                                В случае крайнего упадка сил от бесплодных поисков работы позвонить мне
                            </p>
                            
                            <div className="w-12 h-px bg-[#fbbf24]/30 my-3 shadow-[0_0_5px_rgba(251,191,36,0.5)]"></div>
                            
                            <p className="font-mono text-[9px] md:text-[10px] text-[#d97706] uppercase tracking-[0.2em] font-bold opacity-70">
                                Симфоний Барабашкин<br/>оператор машинариума
                            </p>
                        </div>

                        {/* Layer 3: Fisheye Vignette (Strong edges) */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.8)_90%,black_100%)] pointer-events-none z-15 mix-blend-multiply"></div>

                        {/* Layer 4: Reflections (Foreground) */}
                        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-white/5 to-transparent rounded-full blur-2xl pointer-events-none z-20"></div>
                        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-900/10 rounded-full blur-3xl z-20"></div>
                        
                        {/* Layer 5: CRT Scanlines Overlay (Optional detail for machine look) */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-20 opacity-20"></div>

                        {/* Center Point (The Lens) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-[#111] rounded-full shadow-[0_0_20px_black] border border-[#222] z-30 opacity-50"></div>
                    </div>

                </div>
            </Atropos>
        </div>

        {/* --- THE SHABBY BUTTON (Worn Out) --- */}
        {/* Increased top margin since sticker is gone */}
        <div className="relative z-30 shrink-0 mt-16 pb-10">
            <button 
                onClick={handleCall}
                className="group relative w-20 h-20 md:w-24 md:h-24 active:scale-95 transition-transform duration-200 ease-out flex items-center justify-center"
            >
                {/* 1. Deep Socket/Shadow (Hole) */}
                <div className="absolute inset-0 rounded-full bg-[#0c0a08] shadow-[inset_0_5px_10px_black,0_0_0_1px_rgba(255,255,255,0.05)]"></div>
                
                {/* 2. The Button Body (Worn Metal) */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#57534e] via-[#44403c] to-[#292524] shadow-[0_5px_15px_rgba(0,0,0,0.5)] group-active:translate-y-1 transition-all">
                     {/* Scratches/Noise */}
                     <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-40 mix-blend-overlay"></div>
                </div>
                
                {/* 3. The Top Surface (Oxidized / Dirty) */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-t from-[#292524] to-[#57534e] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),inset_0_-1px_2px_rgba(255,255,255,0.1)] group-active:inset-2.5 transition-all flex items-center justify-center border border-[#1c1917]">
                    
                    {/* 4. The Icon (Dull/Old Glow) */}
                    <div className="relative z-10 p-3 rounded-full border border-[#44403c] bg-[#1c1917] shadow-lg">
                        <Phone size={28} className="text-[#a8a29e] group-hover:text-[#d6d3d1] transition-colors opacity-80" />
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