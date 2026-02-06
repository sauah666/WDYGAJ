import React from 'react';
import { Briefcase, Binary, Cog, PlayCircle, Zap } from 'lucide-react';
import Atropos from 'atropos/react';
import { Layout } from '../components/Layout';

interface Props {
  onSelect: (mode: string) => void;
  onSettingsClick?: () => void;
  onNavigate?: (route: string) => void;
}

export const ModeSelectionScreen: React.FC<Props> = ({ onSelect, onSettingsClick, onNavigate }) => {
  return (
    <Layout title="Protocol Selection" onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="flex flex-col items-center justify-center h-full min-h-[600px]">
        
        {/* Massive Centerpiece: THE AGENT PORTHOLE */}
        <div className="relative group perspective-1000 transform transition-transform duration-500">
            
            {/* Background Gears Spin */}
            <div className="absolute -top-32 -left-32 text-[#2e1d15] animate-spin-slow duration-[30s] opacity-80 pointer-events-none">
                <Cog size={280} />
            </div>
            <div className="absolute -bottom-32 -right-32 text-[#2e1d15] animate-spin-slow duration-[25s] direction-reverse opacity-80 pointer-events-none">
                <Cog size={340} />
            </div>

            <Atropos
                activeOffset={60}
                shadowScale={1.1}
                className="rounded-full w-[400px] h-[400px] md:w-[500px] md:h-[500px]"
                rotateTouch="scroll-y"
            >
                <button 
                    onClick={() => onSelect('JOB_SEARCH')}
                    className="relative w-full h-full rounded-full border-[20px] border-[#5c3a21] bg-black shadow-[0_0_80px_rgba(0,0,0,1),inset_0_0_50px_black] flex items-center justify-center overflow-hidden group active:scale-95 transition-transform duration-200"
                    title="Engage Job Search Protocol"
                >
                    {/* Metal Texture on Bezel */}
                    <div className="absolute inset-0 border-[20px] border-transparent rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none z-50"></div>
                    
                    {/* The Agent Portrait Image */}
                    <img 
                        src="https://image.pollinations.ai/prompt/steampunk%20dwarf%20gnome%20engineer%20goggles%20grinning%20dirty%20face%20leather%20hat%20oil%20stains%20portrait%20detailed%20artstation?width=512&height=512&nologo=true&seed=42" 
                        alt="Agent Holden"
                        className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700 ease-in-out filter sepia-[0.3] contrast-125 brightness-90 group-hover:brightness-110" 
                        data-atropos-offset="-5"
                    />

                    {/* HUD Overlay (The Glass) */}
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-20"></div>
                    <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 pointer-events-none z-20 mix-blend-overlay"></div>
                    
                    {/* Glare */}
                    <div className="absolute top-10 right-20 w-32 h-16 bg-white/10 rounded-full rotate-[-45deg] blur-xl pointer-events-none z-30"></div>

                    {/* Interactive UI Elements Floating INSIDE the Porthole */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-40" data-atropos-offset="10">
                        
                        <div className="bg-black/60 backdrop-blur-sm p-4 rounded-2xl border border-[#d97706]/50 shadow-2xl flex flex-col items-center transform translate-y-32 group-hover:translate-y-24 transition-transform duration-500">
                            <h2 className="text-3xl font-serif font-bold text-[#fbbf24] tracking-widest uppercase text-shadow-lg mb-1">
                                JOB SEEKER
                            </h2>
                            <div className="flex items-center gap-2 text-[#e7e5e4] font-mono text-xs uppercase tracking-[0.2em]">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                                <span>Holden McGroin</span>
                            </div>
                        </div>

                        {/* Hover Action Indicator */}
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-150 text-[#d97706] drop-shadow-[0_0_10px_black]">
                             <PlayCircle size={80} strokeWidth={1} />
                        </div>
                    </div>
                </button>
            </Atropos>
        </div>

        {/* Footer Warning */}
        <div className="mt-16 text-[#5c3a21] font-mono text-xs uppercase tracking-[0.5em] flex flex-col items-center gap-3 opacity-80">
            <div className="flex items-center gap-2">
                <Zap size={14} className="text-[#d97706] animate-pulse" />
                <span>High Voltage System</span>
                <Zap size={14} className="text-[#d97706] animate-pulse" />
            </div>
            <span className="text-[10px] text-[#44403c]">Touch glass to initialize</span>
        </div>

      </div>
    </Layout>
  );
};