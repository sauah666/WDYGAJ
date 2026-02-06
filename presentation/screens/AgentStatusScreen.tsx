
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Play, Pause, RotateCcw, AlertTriangle, ArrowLeft, Square, Maximize2, Zap, Gauge, Radio } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentStatus } from '../../types';
import { AgentState } from '../../core/domain/entities';
import { BrowserViewport } from '../components/BrowserViewport';

interface Props {
  state: AgentState;
  onRun: () => void;
  onStop: () => void;
  onConfirmLogin: () => void;
  onReset: () => void;
  onBackToSettings?: () => void; 
  onSettingsClick?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onNavigate?: (route: string) => void;
}

export const AgentStatusScreen: React.FC<Props> = ({ 
  state, 
  onStop, 
  onConfirmLogin, 
  onReset,
  onSettingsClick,
  onPause,
  onResume,
  onNavigate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs]);

  const handleViewportLogin = (u: string, p: string) => {
      onConfirmLogin();
  };

  const getStatusColor = (status: AgentStatus) => {
      if (status === AgentStatus.FAILED || status === AgentStatus.LLM_CONFIG_ERROR) return 'text-red-500 border-red-900 bg-red-900/20';
      if (status === AgentStatus.COMPLETED) return 'text-green-500 border-green-900 bg-green-900/20';
      if (status === AgentStatus.WAITING_FOR_HUMAN) return 'text-yellow-500 border-yellow-900 bg-yellow-900/20';
      return 'text-amber-500 border-amber-900 bg-amber-900/20';
  };

  return (
    <Layout title="Engine Room" activeProductName="JobSearch Agent" onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
        
        {/* Left Col: Visual Browser Monitor */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          {/* Main Viewport Frame - Heavy Metal */}
          <div className="flex-1 bg-[#1c1917] p-4 flex flex-col relative shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-4 border-[#292524] rounded-sm">
             
             {/* Status Gauge */}
             <div className="absolute -top-5 left-10 z-20">
                <div className={`px-6 py-2 border-2 text-xs font-mono font-bold flex items-center gap-3 shadow-lg bg-[#0c0a08] uppercase tracking-widest ${getStatusColor(state.status)}`}>
                   <div className={`w-3 h-3 rounded-full border border-black ${state.isPaused ? 'bg-yellow-600' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`}></div>
                   <span>{state.status.replace(/_/g, ' ')}</span>
                </div>
                {/* Screws */}
                <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-1.5 h-1.5 bg-[#44403c] rounded-full"></div>
                <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-1.5 h-1.5 bg-[#44403c] rounded-full"></div>
             </div>

             <div className="w-full h-full border-2 border-[#0c0a08] bg-black relative overflow-hidden">
                 <BrowserViewport 
                    url={state.currentUrl || 'about:blank'}
                    status={state.status}
                    isMock={false} 
                    onLoginSubmit={handleViewportLogin}
                 />
                 {/* Dirty Glass Overlay */}
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dirty-old-shirt.png')] opacity-10 pointer-events-none"></div>
                 {/* Vignette */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
             </div>
          </div>
          
          {/* Control Deck */}
          <div className="h-28 bg-[#1c1917] border-t-4 border-[#44403c] flex items-center justify-between px-8 shadow-inner relative bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
             {/* Rivets */}
             <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#292524] shadow-inner"></div>
             <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#292524] shadow-inner"></div>
             <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#292524] shadow-inner"></div>
             <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#292524] shadow-inner"></div>

             <div className="flex items-center gap-6 relative z-10">
                 {/* Industrial Buttons */}
                 {state.isPaused ? (
                     <button onClick={onResume} className="flex flex-col items-center justify-center w-20 h-20 bg-[#14532d] border-b-4 border-[#052e16] rounded-full active:border-b-0 active:translate-y-1 transition-all shadow-xl group">
                        <Play size={24} fill="currentColor" className="text-green-200 group-hover:text-white" />
                        <span className="text-[10px] font-bold text-green-300 mt-1">RESUME</span>
                     </button>
                 ) : (
                     <button onClick={onPause} disabled={state.status === AgentStatus.IDLE} className="flex flex-col items-center justify-center w-20 h-20 bg-[#78350f] border-b-4 border-[#451a03] rounded-full active:border-b-0 active:translate-y-1 transition-all shadow-xl disabled:opacity-50 disabled:grayscale group">
                        <Pause size={24} fill="currentColor" className="text-amber-200 group-hover:text-white" />
                        <span className="text-[10px] font-bold text-amber-300 mt-1">HALT</span>
                     </button>
                 )}

                 <button onClick={onStop} disabled={state.status === AgentStatus.IDLE} className="w-14 h-14 bg-[#7f1d1d] border-2 border-[#450a0a] rounded flex items-center justify-center text-red-200 hover:text-white hover:bg-[#991b1b] shadow-[0_0_10px_rgba(220,38,38,0.3)] disabled:opacity-50 transition-all active:scale-95">
                    <Square size={20} fill="currentColor" />
                 </button>
             </div>
             
             {/* Meters */}
             <div className="flex items-center gap-6 relative z-10">
                <div className="text-right hidden xl:block bg-black/40 p-2 border border-[#44403c] rounded">
                    <div className="text-[9px] text-amber-700 uppercase tracking-widest font-mono mb-1">Runtime Clock</div>
                    <div className="text-2xl font-mono text-amber-500 text-shadow-glow">00:12:45</div>
                </div>
                
                {/* Reset Lever */}
                <button onClick={onReset} className="flex flex-col items-center group">
                    <div className="w-1 h-8 bg-[#44403c] mb-1 group-hover:bg-amber-600 transition-colors"></div>
                    <div className="w-12 h-12 rounded-full border-2 border-[#44403c] flex items-center justify-center text-[#78716c] group-hover:text-amber-500 group-hover:border-amber-500 transition-all bg-[#0c0a08]">
                        <RotateCcw size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-[#57534e] mt-1 uppercase">Reset</span>
                </button>
             </div>
          </div>
        </div>

        {/* Right Col: Logs (Ticker Tape Style) */}
        <div className="bg-[#0c0a08] border-4 border-[#292524] flex flex-col font-mono text-sm shadow-2xl relative">
           {/* Header */}
           <div className="p-4 border-b-2 border-[#292524] bg-[#1c1917] flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Terminal size={14} className="text-green-600" />
                <span className="text-green-700 text-xs font-bold tracking-widest uppercase">Telemetry Feed</span>
             </div>
             <div className="w-2 h-2 bg-green-900 rounded-full animate-ping"></div>
           </div>
           
           <div className="flex-1 overflow-auto p-6 space-y-2 custom-scrollbar bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,#111_2px)]" ref={scrollRef}>
            {state.logs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[#292524] space-y-2">
                    <Radio size={32} className="opacity-20 animate-pulse" />
                    <span className="text-xs uppercase tracking-widest opacity-50">Awaiting Data Stream...</span>
                </div>
            )}
            {state.logs.map((log, i) => (
              <div key={i} className="flex gap-3 text-xs leading-relaxed border-b border-[#1c1917] pb-1">
                <span className="text-amber-900 font-bold shrink-0 select-none opacity-50">{(i+1).toString().padStart(3, '0')}</span>
                <span className="text-green-500/80 font-mono break-words shadow-black text-shadow-sm">{log}</span>
              </div>
            ))}
            {/* Blinking Cursor */}
            <div className="w-2 h-4 bg-green-700 animate-pulse mt-2"></div>
           </div>
           
           {/* Bottom Bolt */}
           <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#292524] border border-[#44403c]"></div>
        </div>
      </div>
    </Layout>
  );
};
