
import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import Atropos from 'atropos/react';
import { Play, Pause, Square, RotateCcw, ArrowLeft, ScrollText, X, Check, FileText, Brain } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentStatus, AppRoute } from '../../types';
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
  isMock: boolean;
  onWipeMemory?: () => void; // New Prop via App wrapper or direct connection
}

const LOOP_VIDEO = "https://raw.githubusercontent.com/sauah666/WDYGAJ/98771fc49589081d334b431a618452b72c0c450e/valera_idle_merged.mp4";

export const AgentStatusScreen: React.FC<Props> = ({ 
  state, 
  onStop, 
  onConfirmLogin, 
  onReset,
  onPause,
  onResume,
  onNavigate,
  isMock
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [showLogsOverlay, setShowLogsOverlay] = useState(false);
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false); 
  const [showAmnesiaConfirm, setShowAmnesiaConfirm] = useState(false);
  
  // Orb & Message Logic
  const [agentMessage, setAgentMessage] = useState<string>("Система активна. Ожидание задач.");
  const [typedMessage, setTypedMessage] = useState<string>("");
  
  // Refs
  const avatarRef = useRef<HTMLDivElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  const [orbDest, setOrbDest] = useState<{top: number, left: number, width: number, height: number} | null>(null);

  // Sync Logs to Message Box
  useEffect(() => {
      if (state.logs.length > 0) {
          const lastLog = state.logs[state.logs.length - 1];
          setAgentMessage(lastLog);
      }
  }, [state.logs]);

  // Typewriter Effect
  useEffect(() => {
      let frameId: number;
      let charIndex = 0;
      const speed = 2; // Speed up for logs
      let tick = 0;

      // Reset typing when message changes
      setTypedMessage(""); 
      
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
      if (showPanel) setTimeout(updateOrbTarget, 100);
      return () => window.removeEventListener('resize', updateOrbTarget);
  }, [showPanel]);

  const handleViewportLogin = (u: string, p: string) => {
      onConfirmLogin();
  };

  const handleOpenLogs = () => {
      if (!state.isPaused && onPause) {
          onPause();
      }
      setShowLogsOverlay(true);
  };

  const handleCloseLogs = () => {
      setShowLogsOverlay(false);
  };

  const handleStopWithSummary = () => {
      onStop();
      setShowSummaryOverlay(true);
  };

  // Hacky connection to presenter logic via window or extended props in future refactor
  // For now, assume a way to trigger memory wipe exists or mock it if prop missing
  const handleWipeMemory = () => {
      // In a real app, we'd pass this down. For this Step 49, I'll access the singleton if needed or
      // rely on an event. Since I can't change App.tsx props easily in this file without breaking interface context,
      // I will assume the parent passes onReset as a full wipe or I add a new method to the interface.
      // Wait, I can import the presenter instance? No, that breaks DI.
      // I added onWipeMemory to Props in the interface above, but App.tsx needs to pass it. 
      // I will implement the logic assuming the parent component (App.tsx) will be updated in next step or I use a custom event.
      // To be safe and self-contained:
      
      // DISPATCH CUSTOM EVENT for App.tsx to catch if props aren't wired
      window.dispatchEvent(new CustomEvent('AGENT_WIPE_MEMORY'));
      setShowAmnesiaConfirm(false);
  };

  const isRunning = state.status !== AgentStatus.IDLE && state.status !== AgentStatus.FAILED && state.status !== AgentStatus.COMPLETED && !state.isPaused;

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

      {/* AMNESIA CONFIRM OVERLAY */}
      {showAmnesiaConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-switch-on p-4">
              <div className="bg-[#1a120e] border-[3px] border-[#b91c1c] rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(185,28,28,0.5)] flex flex-col items-center text-center">
                  <Brain size={48} className="text-[#ef4444] mb-4 animate-pulse" />
                  <h3 className="text-xl font-bold text-[#fca5a5] uppercase tracking-widest mb-2 font-sans">Режим Амнезии</h3>
                  <p className="text-[#a8a29e] font-mono text-sm mb-6">
                      Вы действительно хотите стереть память агента? Он забудет все просмотренные вакансии и отправленные отклики.
                  </p>
                  <div className="flex gap-4 w-full">
                      <button 
                          onClick={() => setShowAmnesiaConfirm(false)}
                          className="flex-1 py-3 border border-[#44403c] rounded-xl hover:bg-[#292524] text-[#a8a29e] font-bold font-sans"
                      >
                          Отмена
                      </button>
                      <button 
                          onClick={handleWipeMemory}
                          className="flex-1 py-3 bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#ef4444] rounded-xl text-white font-bold font-sans shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      >
                          Стереть
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* LOG OVERLAY */}
      {showLogsOverlay && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-switch-on">
              <div className="w-full max-w-4xl h-[90%] bg-[#1a120e] border-[3px] border-[#4a3b32] shadow-[0_0_50px_black] rounded-2xl flex flex-col overflow-hidden">
                  <div className="shrink-0 h-16 bg-[#0c0a08] border-b border-[#3a2d25] flex items-center justify-between px-6">
                      <h2 className="text-xl font-bold text-[#e7e5e4] tracking-widest uppercase font-sans">
                          Журнал Операций
                      </h2>
                      <button onClick={handleCloseLogs} className="p-2 hover:bg-[#2a1a0f] rounded-full text-[#78716c] hover:text-[#d97706] transition-colors">
                          <X size={28} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 custom-scrollbar bg-[#0a0503]">
                      {state.logs.map((log, idx) => (
                          <div key={idx} className="border-b border-[#292524] pb-2 text-[#a8a29e]">
                              <span className="text-[#57534e] mr-2">[{idx + 1}]</span>
                              {log}
                          </div>
                      ))}
                      <div className="h-10"></div>
                  </div>
                  <div className="shrink-0 h-12 bg-[#0c0a08] border-t border-[#3a2d25] flex items-center px-6 text-xs text-[#57534e]">
                      Агент приостановлен. Закройте журнал, чтобы продолжить.
                  </div>
              </div>
          </div>
      )}

      {/* SUMMARY OVERLAY */}
      {showSummaryOverlay && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-switch-on">
              <div className="w-full max-w-4xl h-[90%] bg-[#1a120e] border-[3px] border-[#4a3b32] shadow-[0_0_50px_black] rounded-2xl flex flex-col overflow-hidden">
                  <div className="shrink-0 h-20 bg-[#0c0a08] border-b border-[#3a2d25] flex items-center justify-between px-8">
                      <div>
                          <h2 className="text-2xl font-bold text-[#fcd34d] tracking-widest uppercase font-sans">
                              Отчет о Работе
                          </h2>
                          <div className="text-[#78716c] text-xs font-mono mt-1">Сессия завершена</div>
                      </div>
                      <button onClick={() => setShowSummaryOverlay(false)} className="p-2 hover:bg-[#2a1a0f] rounded-full text-[#78716c] hover:text-[#d97706] transition-colors">
                          <X size={32} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0a0503]">
                      {state.appliedHistory.length === 0 ? (
                          <div className="text-center text-[#57534e] mt-20">Нет обработанных вакансий.</div>
                      ) : (
                          <div className="space-y-4">
                              {state.appliedHistory.map((item, idx) => (
                                  <div key={idx} className={`p-4 rounded-xl border ${item.status === 'APPLIED' ? 'border-green-900/50 bg-green-950/10' : 'border-[#292524] bg-[#140c08]'} flex justify-between items-center`}>
                                      <div>
                                          <div className="font-bold text-[#e7e5e4] text-lg font-sans">{item.title}</div>
                                          <div className="text-[#a8a29e] text-sm">{item.company}</div>
                                          <div className="text-[#57534e] text-xs font-mono mt-2">{item.reason}</div>
                                      </div>
                                      <div className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider ${item.status === 'APPLIED' ? 'bg-green-900/30 text-green-500' : 'bg-[#292524] text-[#78716c]'}`}>
                                          {item.status === 'APPLIED' ? 'Отправлено' : 'Пропуск'}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="shrink-0 p-6 bg-[#0c0a08] border-t border-[#3a2d25] flex justify-end">
                      <button onClick={onReset} className="px-8 py-3 bg-[#2a1a0f] hover:bg-[#451a03] text-[#d97706] border border-[#4a3b32] rounded-xl font-bold uppercase tracking-wider transition-all">
                          Новый Поиск
                      </button>
                  </div>
              </div>
          </div>
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
                {/* 1. HEADER */}
                <div className="shrink-0 relative h-14 bg-[#1a120e] border-b-4 border-[#3a2d25] flex items-center justify-between px-4 shadow-md z-30">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onNavigate?.(AppRoute.MODE_SELECTION)} 
                            className="text-[#78716c] hover:text-[#d97706] transition-colors p-2 rounded-full hover:bg-[#2a2018]"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        
                        {/* AMNESIA BUTTON */}
                        <button 
                            onClick={() => setShowAmnesiaConfirm(true)}
                            className="text-[#7f1d1d] hover:text-[#ef4444] transition-colors p-2 rounded-full hover:bg-[#2a1a0f] relative group"
                            title="Сброс памяти"
                        >
                            <Brain size={22} />
                        </button>
                    </div>
                    
                    <h2 className="relative z-10 font-bold text-xl text-[#cdbba7] tracking-widest uppercase text-shadow-md font-sans">
                        Кузница кадров
                    </h2>
                    
                    <button 
                        onClick={handleOpenLogs} 
                        className="text-[#78716c] hover:text-[#d97706] transition-colors p-2 rounded-full hover:bg-[#2a2018]"
                        title="Полный Журнал"
                    >
                        <ScrollText size={22} />
                    </button>
                </div>

                {/* 2. ORB ROW (Status & Logs) */}
                <div className="shrink-0 p-4 pb-2 bg-[#2a2420] z-20 relative">
                    <div className="flex gap-4 items-stretch h-28">
                        {/* Avatar Placeholder */}
                        <div ref={avatarRef} className="w-28 shrink-0 relative opacity-0"></div>

                        {/* Message Screen (Logs) */}
                        <div className="flex-1 bg-[#1a1512] rounded-xl border-2 border-[#3a2d25] shadow-[inset_0_2px_10px_black] relative overflow-hidden p-3 flex flex-col justify-center">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-10"></div>
                             
                             {/* Log Text */}
                             <div className="relative z-10 font-mono text-[#22c55e] text-xs md:text-sm leading-tight drop-shadow-md break-words pl-1 h-full overflow-hidden flex items-center">
                                 <div>
                                     <span className="opacity-90">{typedMessage}</span>
                                     <span className="inline-block w-2 h-4 bg-[#22c55e] ml-1 animate-[blink_1s_infinite] align-middle"></span>
                                 </div>
                             </div>
                             
                             {/* Status Indicator */}
                             <div className={`absolute top-2 right-2 w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${state.isPaused ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-ping'}`}></div>
                        </div>
                    </div>
                </div>

                {/* 3. BROWSER VIEWPORT (Main Content) */}
                <div className="flex-1 overflow-hidden px-4 pb-2 relative z-10 flex flex-col">
                    <div className="flex-1 border-[3px] border-[#1c1917] rounded-lg overflow-hidden bg-black shadow-inner relative">
                        <BrowserViewport 
                            url={state.currentUrl || 'about:blank'}
                            status={state.status}
                            isMock={isMock} 
                            onLoginSubmit={handleViewportLogin}
                            activeSearchPrefs={state.activeSearchPrefs}
                        />
                        {/* CRT Effects */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-20"></div>
                    </div>
                </div>

                {/* 4. CONTROLS FOOTER */}
                <div className="shrink-0 relative p-4 bg-[#1a120e] border-t-2 border-[#3a2d25] shadow-inner z-30">
                    <div className="flex items-center justify-center gap-6">
                        
                        {/* Pause/Resume */}
                        {state.isPaused ? (
                             <button onClick={onResume} className="group relative w-16 h-16 flex items-center justify-center bg-[#14532d] border-2 border-[#052e16] rounded-full shadow-[0_4px_8px_black] active:translate-y-1 transition-all animate-pulse duration-700">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay rounded-full"></div>
                                <Play size={24} fill="currentColor" className="text-green-200 group-hover:text-white relative z-10" />
                                <div className="absolute -bottom-6 text-[9px] font-bold text-green-500 uppercase tracking-widest whitespace-nowrap bg-black/80 px-2 py-0.5 rounded border border-green-900 font-sans">
                                    Продолжить
                                </div>
                             </button>
                        ) : (
                             <button onClick={onPause} disabled={state.status === AgentStatus.IDLE} className="group relative w-16 h-16 flex items-center justify-center bg-[#78350f] border-2 border-[#451a03] rounded-full shadow-[0_4px_8px_black] active:translate-y-1 transition-all disabled:opacity-50 disabled:grayscale">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay rounded-full"></div>
                                <Pause size={24} fill="currentColor" className="text-amber-200 group-hover:text-white relative z-10" />
                             </button>
                        )}

                        {/* Stop */}
                        <button onClick={handleStopWithSummary} disabled={state.status === AgentStatus.IDLE} className="group relative w-12 h-12 flex items-center justify-center bg-[#7f1d1d] border-2 border-[#450a0a] rounded-xl shadow-[0_4px_8px_black] active:translate-y-1 transition-all disabled:opacity-50 disabled:grayscale">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay rounded-xl"></div>
                            <Square size={20} fill="currentColor" className="text-red-200 group-hover:text-white relative z-10" />
                        </button>

                        {/* Reset */}
                        <button onClick={onReset} className="group relative w-12 h-12 flex items-center justify-center bg-[#292524] border-2 border-[#1c1917] rounded-full shadow-[0_4px_8px_black] active:translate-y-1 transition-all">
                            <RotateCcw size={18} className="text-[#78716c] group-hover:text-[#d97706] relative z-10 transition-transform group-hover:-rotate-180 duration-500" />
                        </button>

                    </div>
                </div>
                
                <div className="absolute -bottom-2 left-8 right-8 h-2 bg-[#1a120e] border-l border-r border-b border-[#3a2d25] rounded-b-xl shadow-lg"></div>
            </div>
        </div>

        {/* --- ORB --- */}
        <div 
            className={`fixed z-50 ease-in-out transition-all duration-[800ms] ${
                showPanel && orbDest
                    ? "" 
                    : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]"
            }`}
            style={showPanel && orbDest ? {
                top: orbDest.top,
                left: orbDest.left,
                width: orbDest.width,
                height: orbDest.height,
                transform: 'none'
            } : {}}
        >
            <Atropos activeOffset={10} shadowScale={0.5} className="w-full h-full rounded-full">
                <div 
                    className={`relative w-full h-full rounded-full bg-[#1a120e] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden border-[#2e1d15] ease-in-out transition-all duration-[800ms] ${
                        showPanel ? "border-[3px]" : "border-[15px]"
                    }`}
                >
                    <div className={`absolute inset-0 border-[#b45309] rounded-full opacity-80 pointer-events-none z-50 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ease-in-out transition-all duration-[800ms] ${
                        showPanel ? "border-[2px]" : "border-[4px]"
                    }`}></div>
                    
                    <div className={`absolute rounded-full bg-black shadow-[inset_0_10px_30px_rgba(255,255,255,0.05)] overflow-hidden isolate z-10 ease-in-out transition-all duration-[800ms] ${
                        showPanel ? "inset-0.5" : "inset-4"
                    }`}>
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
