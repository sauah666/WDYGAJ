import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Play, Pause, AlertCircle, CheckCircle, Loader2, UserCheck, XCircle, RotateCcw, FileText, UploadCloud, Lock, Compass, Eye, Sparkles, Filter, Save, ChevronRight, List, Cpu, Zap, Repeat, ShieldCheck } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentStatus } from '../../types';
import { AgentState, UserSearchPrefsV1, SearchFieldDefinition, SearchApplyStep, ControlVerificationResult } from '../../core/domain/entities';

interface Props {
  state: AgentState;
  onRun: () => void;
  onStop: () => void;
  onConfirmLogin: () => void;
  onConfirmProfile?: () => void;
  onResetProfile?: () => void;
  onReset: () => void;
  // New props for Stage 5
  onContinueToSearch?: () => void;
  onScanSearchUI?: () => void;
  onAnalyzeSearchUI?: () => void;
  onSubmitSearchPrefs?: (prefs: UserSearchPrefsV1) => void;
  onBuildPlan?: () => void;
  onExecuteStep?: () => void;
  onExecuteCycle?: () => void;
  onVerifyFilters?: () => void;
}

export const AgentStatusScreen: React.FC<Props> = ({ 
  state, 
  onRun, 
  onStop, 
  onConfirmLogin, 
  onConfirmProfile,
  onResetProfile,
  onReset,
  onContinueToSearch,
  onScanSearchUI,
  onAnalyzeSearchUI,
  onSubmitSearchPrefs,
  onBuildPlan,
  onExecuteStep,
  onExecuteCycle,
  onVerifyFilters
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [localPrefs, setLocalPrefs] = useState<UserSearchPrefsV1 | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs]);

  // Sync state prefs to local prefs for editing
  useEffect(() => {
    if (state.status === AgentStatus.WAITING_FOR_SEARCH_PREFS && state.activeSearchPrefs && !localPrefs) {
      setLocalPrefs(state.activeSearchPrefs);
    }
  }, [state.status, state.activeSearchPrefs]);

  const handlePrefChange = (key: string, value: any) => {
    if (!localPrefs) return;
    setLocalPrefs({
      ...localPrefs,
      additionalFilters: {
        ...localPrefs.additionalFilters,
        [key]: value
      }
    });
  };

  const handleSubmitPrefs = () => {
    if (localPrefs && onSubmitSearchPrefs) {
      onSubmitSearchPrefs(localPrefs);
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'text-gray-400';
      case AgentStatus.STARTING: return 'text-blue-400';
      case AgentStatus.NAVIGATING: return 'text-yellow-400';
      case AgentStatus.NAVIGATING_TO_SEARCH: return 'text-yellow-400';
      case AgentStatus.WAITING_FOR_HUMAN: return 'text-orange-500';
      case AgentStatus.LOGGED_IN_CONFIRMED: return 'text-green-400';
      case AgentStatus.WAITING_FOR_PROFILE_PAGE: return 'text-pink-500';
      case AgentStatus.EXTRACTING: return 'text-purple-400';
      case AgentStatus.EXTRACTING_SEARCH_UI: return 'text-purple-400';
      case AgentStatus.PROFILE_CAPTURED: return 'text-emerald-400';
      case AgentStatus.TARGETING_PENDING: return 'text-cyan-400';
      case AgentStatus.TARGETING_READY: return 'text-cyan-400';
      case AgentStatus.TARGETING_ERROR: return 'text-red-500';
      case AgentStatus.SEARCH_PAGE_READY: return 'text-indigo-400';
      case AgentStatus.SEARCH_DOM_READY: return 'text-indigo-500';
      case AgentStatus.ANALYZING_SEARCH_UI: return 'text-purple-500';
      case AgentStatus.WAITING_FOR_SEARCH_PREFS: return 'text-emerald-500';
      case AgentStatus.SEARCH_PREFS_SAVED: return 'text-green-500';
      case AgentStatus.APPLY_PLAN_READY: return 'text-blue-300';
      case AgentStatus.APPLYING_FILTERS: return 'text-blue-400';
      case AgentStatus.APPLY_STEP_DONE: return 'text-blue-500';
      case AgentStatus.APPLY_STEP_FAILED: return 'text-red-400';
      case AgentStatus.SEARCH_READY: return 'text-indigo-400';
      case AgentStatus.COMPLETED: return 'text-green-500';
      case AgentStatus.FAILED: return 'text-red-500';
      default: return 'text-gray-100';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    if (status === AgentStatus.NAVIGATING || status === AgentStatus.EXTRACTING || status === AgentStatus.STARTING || status === AgentStatus.TARGETING_PENDING || status === AgentStatus.NAVIGATING_TO_SEARCH || status === AgentStatus.EXTRACTING_SEARCH_UI || status === AgentStatus.ANALYZING_SEARCH_UI || status === AgentStatus.APPLYING_FILTERS) return <Loader2 className="animate-spin" />;
    if (status === AgentStatus.WAITING_FOR_HUMAN) return <AlertCircle />;
    if (status === AgentStatus.WAITING_FOR_PROFILE_PAGE) return <FileText />;
    if (status === AgentStatus.LOGGED_IN_CONFIRMED) return <UserCheck />;
    if (status === AgentStatus.PROFILE_CAPTURED) return <CheckCircle />;
    if (status === AgentStatus.TARGETING_READY) return <Lock />;
    if (status === AgentStatus.SEARCH_PAGE_READY) return <Compass />;
    if (status === AgentStatus.SEARCH_DOM_READY) return <Eye />;
    if (status === AgentStatus.WAITING_FOR_SEARCH_PREFS) return <Filter />;
    if (status === AgentStatus.SEARCH_PREFS_SAVED) return <CheckCircle />;
    if (status === AgentStatus.APPLY_PLAN_READY) return <List />;
    if (status === AgentStatus.APPLY_STEP_DONE) return <CheckCircle />;
    if (status === AgentStatus.APPLY_STEP_FAILED) return <AlertCircle />;
    if (status === AgentStatus.SEARCH_READY) return <ShieldCheck />;
    if (status === AgentStatus.COMPLETED) return <CheckCircle />;
    return <Terminal />;
  };

  const isRunning = state.status !== AgentStatus.IDLE && state.status !== AgentStatus.COMPLETED && state.status !== AgentStatus.FAILED && state.status !== AgentStatus.PROFILE_CAPTURED && state.status !== AgentStatus.TARGETING_READY && state.status !== AgentStatus.SEARCH_PAGE_READY && state.status !== AgentStatus.SEARCH_DOM_READY && state.status !== AgentStatus.WAITING_FOR_SEARCH_PREFS && state.status !== AgentStatus.SEARCH_PREFS_SAVED && state.status !== AgentStatus.APPLY_PLAN_READY && state.status !== AgentStatus.APPLY_STEP_DONE && state.status !== AgentStatus.APPLY_STEP_FAILED && state.status !== AgentStatus.SEARCH_READY;
  const isFinished = state.status === AgentStatus.COMPLETED || state.status === AgentStatus.FAILED;
  // Can reset profile if captured OR targeting ready OR dom ready OR waiting prefs OR plan ready
  const isProfileDone = state.status === AgentStatus.PROFILE_CAPTURED || state.status === AgentStatus.TARGETING_READY || state.status === AgentStatus.TARGETING_ERROR || state.status === AgentStatus.SEARCH_DOM_READY || state.status === AgentStatus.SEARCH_PAGE_READY || state.status === AgentStatus.WAITING_FOR_SEARCH_PREFS || state.status === AgentStatus.SEARCH_PREFS_SAVED || state.status === AgentStatus.APPLY_PLAN_READY || state.status === AgentStatus.APPLY_STEP_DONE || state.status === AgentStatus.SEARCH_READY;

  // Helper to render form fields
  const renderFieldInput = (field: SearchFieldDefinition) => {
    const value = localPrefs?.additionalFilters[field.key] ?? '';
    return (
        <div key={field.key} className="flex flex-col space-y-1">
             <label className="text-xs text-gray-400 uppercase font-bold flex justify-between">
                <span>{field.label}</span>
                <span className="text-gray-600 font-normal">{field.semanticType}</span>
            </label>
            <div className="p-2 bg-gray-800 rounded text-sm text-gray-300 border border-gray-700">
                {String(value)}
            </div>
        </div>
    );
  };

  const renderPlanStep = (step: SearchApplyStep, idx: number) => {
      const isDone = state.activeAppliedFilters?.results.some(r => r.stepId === step.stepId && r.success);
      const isFailed = state.activeAppliedFilters?.results.some(r => r.stepId === step.stepId && !r.success);

      let statusColor = "bg-blue-900/20 text-blue-400";
      let statusIcon = idx + 1;
      
      if (isDone) {
          statusColor = "bg-green-900/50 text-green-400";
      } else if (isFailed) {
          statusColor = "bg-red-900/50 text-red-400";
      }

      return (
          <div key={step.stepId} className={`flex items-center p-3 bg-gray-800 border-b border-gray-700 last:border-0 ${isDone ? 'opacity-50' : ''}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs mr-4 ${statusColor}`}>
                 {isDone ? <CheckCircle size={14} /> : statusIcon}
             </div>
             <div className="flex-1">
                 <div className="flex justify-between">
                     <span className="font-bold text-white text-sm">{step.actionType}</span>
                     <span className="text-xs text-gray-500">{step.fieldKey}</span>
                 </div>
                 <div className="text-gray-400 text-xs mt-1">
                     Value: <span className="text-blue-300">{String(step.value)}</span>
                 </div>
                 <div className="text-gray-600 text-[10px] uppercase mt-1">
                     {step.rationale}
                 </div>
             </div>
          </div>
      );
  };

  const renderVerificationRow = (res: ControlVerificationResult) => {
      let color = 'text-gray-400';
      if (res.status === 'MATCH') color = 'text-green-400';
      if (res.status === 'MISMATCH') color = 'text-red-400';
      if (res.status === 'UNKNOWN') color = 'text-yellow-500';

      return (
          <tr key={res.fieldKey} className="border-b border-gray-800 last:border-0 text-sm">
             <td className="p-2 font-mono text-gray-300">{res.fieldKey}</td>
             <td className="p-2 text-gray-400">{String(res.expectedValue)}</td>
             <td className="p-2 text-gray-400">{String(res.actualValue)}</td>
             <td className={`p-2 font-bold ${color}`}>{res.status}</td>
          </tr>
      );
  };

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
             </div>

             {/* Mock Viewport */}
             <div className="flex-1 bg-gray-900/50 m-1 rounded-lg flex items-center justify-center border border-gray-800/50 border-dashed relative overflow-auto">
                {state.status === AgentStatus.IDLE && (
                   <div className="text-center"><Terminal size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-gray-600 font-mono">Waiting for initialization...</p></div>
                )}

                {/* PLAN VIEW */}
                {(state.status === AgentStatus.APPLY_PLAN_READY || state.status === AgentStatus.APPLYING_FILTERS || state.status === AgentStatus.APPLY_STEP_DONE || state.status === AgentStatus.APPLY_STEP_FAILED) && state.activeSearchApplyPlan && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                         <div className="mb-6 border-b border-gray-800 pb-4">
                             <div className="flex items-center text-blue-400 mb-2">
                                <List size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Execution Plan</h3>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Progress: {state.activeAppliedFilters?.results.filter(r=>r.success).length || 0} / {state.activeSearchApplyPlan.steps.length} steps completed.
                            </p>
                        </div>
                        <div className="max-w-2xl mx-auto space-y-2 bg-gray-900 rounded border border-gray-800">
                             {state.activeSearchApplyPlan.steps.map((step, idx) => renderPlanStep(step, idx))}
                        </div>
                    </div>
                )}

                {/* VERIFICATION REPORT */}
                {state.status === AgentStatus.SEARCH_READY && state.activeVerification && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                         <div className="mb-6 border-b border-gray-800 pb-4">
                             <div className="flex items-center text-green-400 mb-2">
                                <ShieldCheck size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Verification Report</h3>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Verified {state.activeVerification.results.length} controls. 
                                {state.activeVerification.verified ? <span className="text-green-500 ml-2 font-bold">ALL PASS</span> : <span className="text-red-500 ml-2 font-bold">{state.activeVerification.mismatches.length} MISMATCHES</span>}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-gray-500 border-b border-gray-700">
                                        <th className="p-2">Field</th>
                                        <th className="p-2">Expected</th>
                                        <th className="p-2">Actual</th>
                                        <th className="p-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {state.activeVerification.results.map(renderVerificationRow)}
                                </tbody>
                            </table>
                        </div>
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

                {/* TARGETING_READY -> NAVIGATE TO SEARCH */}
                {state.status === AgentStatus.TARGETING_READY && onContinueToSearch && (
                  <button onClick={onContinueToSearch} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-indigo-900/20">
                    <Compass size={18} />
                    <span>OPEN SEARCH PAGE</span>
                  </button>
                )}

                {/* SEARCH_PAGE_READY -> SCAN DOM */}
                {state.status === AgentStatus.SEARCH_PAGE_READY && onScanSearchUI && (
                  <button onClick={onScanSearchUI} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-indigo-900/20">
                    <Eye size={18} />
                    <span>SCAN FORM UI</span>
                  </button>
                )}

                {/* SEARCH_DOM_READY -> ANALYZE UI (LLM) */}
                {state.status === AgentStatus.SEARCH_DOM_READY && onAnalyzeSearchUI && (
                  <button onClick={onAnalyzeSearchUI} className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-purple-900/20">
                    <Sparkles size={18} />
                    <span>ANALYZE UI (LLM)</span>
                  </button>
                )}

                {/* SEARCH_PREFS_SAVED -> PLAN ACTIONS */}
                {state.status === AgentStatus.SEARCH_PREFS_SAVED && onBuildPlan && (
                   <button onClick={onBuildPlan} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20">
                    <Cpu size={18} />
                    <span>PLAN ACTIONS</span>
                  </button>
                )}

                {/* APPLY_PLAN_READY | STEP DONE -> EXECUTE NEXT STEP */}
                {(state.status === AgentStatus.APPLY_PLAN_READY || state.status === AgentStatus.APPLY_STEP_DONE || state.status === AgentStatus.APPLY_STEP_FAILED) && onExecuteStep && onExecuteCycle && (
                   <div className="flex space-x-2">
                       <button onClick={onExecuteStep} className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-bold transition-all">
                        <Zap size={18} fill="currentColor" />
                        <span>STEP</span>
                      </button>
                      <button onClick={onExecuteCycle} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20">
                        <Repeat size={18} />
                        <span>AUTO-EXECUTE PLAN</span>
                      </button>
                   </div>
                )}
                
                {/* SEARCH_READY -> VERIFY */}
                {state.status === AgentStatus.SEARCH_READY && onVerifyFilters && (
                    <button onClick={onVerifyFilters} className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-teal-900/20">
                        <ShieldCheck size={18} />
                        <span>VERIFY FILTERS</span>
                    </button>
                )}

                {/* RUNNING -> STOP */}
                {isRunning && state.status !== AgentStatus.WAITING_FOR_HUMAN && state.status !== AgentStatus.WAITING_FOR_PROFILE_PAGE && state.status !== AgentStatus.WAITING_FOR_SEARCH_PREFS && state.status !== AgentStatus.APPLY_PLAN_READY && state.status !== AgentStatus.APPLY_STEP_DONE && (
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