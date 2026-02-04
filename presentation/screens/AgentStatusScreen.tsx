import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Play, Pause, AlertCircle, CheckCircle, Loader2, UserCheck, XCircle, RotateCcw, FileText, UploadCloud, Lock } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentStatus } from '../../types';
import { AgentState } from '../../core/domain/entities';

interface Props {
  state: AgentState;
  onRun: () => void;
  onStop: () => void;
  onConfirmLogin: () => void;
  onConfirmProfile?: () => void;
  onResetProfile?: () => void;
  onReset: () => void;
}

export const AgentStatusScreen: React.FC<Props> = ({ 
  state, 
  onRun, 
  onStop, 
  onConfirmLogin, 
  onConfirmProfile,
  onResetProfile,
  onReset 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs]);

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'text-gray-400';
      case AgentStatus.STARTING: return 'text-blue-400';
      case AgentStatus.NAVIGATING: return 'text-yellow-400';
      case AgentStatus.WAITING_FOR_HUMAN: return 'text-orange-500';
      case AgentStatus.LOGGED_IN_CONFIRMED: return 'text-green-400';
      case AgentStatus.WAITING_FOR_PROFILE_PAGE: return 'text-pink-500';
      case AgentStatus.EXTRACTING: return 'text-purple-400';
      case AgentStatus.PROFILE_CAPTURED: return 'text-emerald-400';
      case AgentStatus.TARGETING_PENDING: return 'text-cyan-400';
      case AgentStatus.TARGETING_READY: return 'text-cyan-400';
      case AgentStatus.TARGETING_ERROR: return 'text-red-500';
      case AgentStatus.COMPLETED: return 'text-green-500';
      case AgentStatus.FAILED: return 'text-red-500';
      default: return 'text-gray-100';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    if (status === AgentStatus.NAVIGATING || status === AgentStatus.EXTRACTING || status === AgentStatus.STARTING || status === AgentStatus.TARGETING_PENDING) return <Loader2 className="animate-spin" />;
    if (status === AgentStatus.WAITING_FOR_HUMAN) return <AlertCircle />;
    if (status === AgentStatus.WAITING_FOR_PROFILE_PAGE) return <FileText />;
    if (status === AgentStatus.LOGGED_IN_CONFIRMED) return <UserCheck />;
    if (status === AgentStatus.PROFILE_CAPTURED) return <CheckCircle />;
    if (status === AgentStatus.TARGETING_READY) return <Lock />;
    if (status === AgentStatus.COMPLETED) return <CheckCircle />;
    return <Terminal />;
  };

  const isRunning = state.status !== AgentStatus.IDLE && state.status !== AgentStatus.COMPLETED && state.status !== AgentStatus.FAILED && state.status !== AgentStatus.PROFILE_CAPTURED && state.status !== AgentStatus.TARGETING_READY;
  const isFinished = state.status === AgentStatus.COMPLETED || state.status === AgentStatus.FAILED;
  // Can reset profile if captured OR targeting ready
  const isProfileDone = state.status === AgentStatus.PROFILE_CAPTURED || state.status === AgentStatus.TARGETING_READY || state.status === AgentStatus.TARGETING_ERROR;

  return (
    <Layout title="Live Agent Monitor" currentStep={2}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        
        {/* Left Col: Visual Status */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          {/* Main Monitor */}
          <div className="flex-1 bg-black rounded-xl border border-gray-800 p-1 flex flex-col relative overflow-hidden">
             <div className="absolute top-4 left-4 z-10 flex space-x-2">
                <span className={`px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-xs font-mono flex items-center gap-2 ${getStatusColor(state.status)}`}>
                  {getStatusIcon(state.status)}
                  {state.status}
                </span>
                {state.currentUrl && (
                  <span className="px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-xs font-mono text-gray-400 max-w-xs truncate">
                    {state.currentUrl}
                  </span>
                )}
             </div>

             {/* Mock Viewport / DOM Visualization Placeholder */}
             <div className="flex-1 bg-gray-900/50 m-1 rounded-lg flex items-center justify-center border border-gray-800/50 border-dashed relative overflow-auto">
                {state.status === AgentStatus.IDLE && (
                  <div className="text-center">
                    <Terminal size={48} className="mx-auto text-gray-700 mb-4" />
                    <p className="text-gray-600 font-mono">Waiting for initialization sequence...</p>
                  </div>
                )}
                
                {state.status === AgentStatus.WAITING_FOR_HUMAN && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-20 backdrop-blur-sm">
                    <AlertCircle size={48} className="text-orange-500 mb-4 animate-bounce" />
                    <h3 className="text-xl font-bold text-white mb-2">Human Interaction Required</h3>
                    <p className="text-gray-400 max-w-md mb-6">
                      The agent has paused execution. Please complete the login process or captcha challenge in the browser window, then confirm below.
                    </p>
                    <div className="flex space-x-4">
                      <button 
                        onClick={onStop}
                        className="flex items-center space-x-2 px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        <XCircle size={20} />
                        <span>Cancel</span>
                      </button>
                      <button 
                        onClick={onConfirmLogin}
                        className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-lg shadow-green-900/20"
                      >
                        <UserCheck size={20} />
                        <span>I Have Logged In</span>
                      </button>
                    </div>
                  </div>
                )}

                {state.status === AgentStatus.WAITING_FOR_PROFILE_PAGE && (
                   <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-20 backdrop-blur-sm">
                    <FileText size={48} className="text-pink-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Profile Navigation Required</h3>
                    <p className="text-gray-400 max-w-md mb-6">
                      We need to scan your resume details. Please navigate to your <b>My Resume</b> page in the browser window.
                    </p>
                    <div className="flex space-x-4">
                       <button 
                        onClick={onStop}
                        className="flex items-center space-x-2 px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        <XCircle size={20} />
                        <span>Cancel</span>
                      </button>
                      <button 
                        onClick={onConfirmProfile}
                        className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all shadow-lg shadow-pink-900/20"
                      >
                        <UploadCloud size={20} />
                        <span>I'm on Profile Page</span>
                      </button>
                    </div>
                  </div>
                )}

                {(state.status === AgentStatus.NAVIGATING || state.status === AgentStatus.EXTRACTING || state.status === AgentStatus.TARGETING_PENDING) && (
                  <div className="text-center animate-pulse">
                     <p className="text-gray-500 font-mono text-sm">[ BROWSER VIEWPORT SIMULATION ]</p>
                     <p className="text-gray-700 text-xs mt-2">Remote Browser Active</p>
                  </div>
                )}

                {state.status === AgentStatus.TARGETING_READY && state.activeTargetingSpec && (
                   <div className="w-full h-full p-8 text-left overflow-auto">
                      <div className="flex items-center mb-4 text-cyan-400">
                        <Lock size={20} className="mr-2" />
                        <h3 className="font-bold text-lg">Targeting Rules (Immutable)</h3>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 border border-gray-800 shadow-inner">
                        <pre>{JSON.stringify(state.activeTargetingSpec, null, 2)}</pre>
                      </div>
                   </div>
                )}

                {(state.status === AgentStatus.LOGGED_IN_CONFIRMED || state.status === AgentStatus.PROFILE_CAPTURED || state.status === AgentStatus.COMPLETED) && (
                   <div className="text-center">
                    <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
                    <p className="text-green-500 font-mono">Session & Profile Ready</p>
                    <p className="text-gray-500 text-sm mt-2">Waiting for next phase...</p>
                  </div>
                )}
             </div>
          </div>
          
          {/* Controls */}
          <div className="h-20 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-between px-6">
             <div>
                <h4 className="text-sm font-semibold text-white">Control Deck</h4>
                <p className="text-xs text-gray-400">Manage agent lifecycle</p>
             </div>
             <div className="flex space-x-3">
                {/* IDLE -> PLAY */}
                {state.status === AgentStatus.IDLE && (
                   <button onClick={onRun} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                    <Play size={18} fill="currentColor" />
                    <span>INITIATE LOGIN</span>
                  </button>
                )}

                {/* RUNNING -> STOP */}
                {isRunning && state.status !== AgentStatus.WAITING_FOR_HUMAN && state.status !== AgentStatus.WAITING_FOR_PROFILE_PAGE && (
                   <button onClick={onStop} className="flex items-center space-x-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/50 px-6 py-2 rounded-lg font-bold transition-all">
                    <Pause size={18} fill="currentColor" />
                    <span>ABORT</span>
                  </button>
                )}

                {/* PROFILE CAPTURED -> RE-CAPTURE */}
                {isProfileDone && (
                   <button onClick={onResetProfile} className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold transition-all border border-gray-600">
                    <RotateCcw size={18} />
                    <span>RESET & RE-SCAN</span>
                  </button>
                )}
                
                {/* FINISHED -> RESET */}
                {(isFinished) && (
                  <button onClick={onReset} className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold transition-all border border-gray-600">
                    <RotateCcw size={18} />
                    <span>RESET SESSION</span>
                  </button>
                )}
             </div>
          </div>
        </div>

        {/* Right Col: Logs */}
        <div className="bg-gray-950 rounded-xl border border-gray-800 flex flex-col font-mono text-sm">
          <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
            <span className="text-gray-400 text-xs">SYSTEM LOGS</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-2" ref={scrollRef}>
            {state.logs.length === 0 && <span className="text-gray-700 italic">No activity recorded.</span>}
            {state.logs.map((log, i) => (
              <div key={i} className="flex space-x-2 text-xs">
                <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                <span className={`${log.includes('Error') ? 'text-red-400' : 'text-green-400/80'}`}>{log}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};