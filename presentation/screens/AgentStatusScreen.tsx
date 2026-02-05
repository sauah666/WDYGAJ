import React from 'react';
import { 
  Loader2, AlertCircle, CheckCircle, FileText, UserCheck, 
  Lock, Compass, Eye, Filter, List, ShieldCheck, 
  DownloadCloud, Layers, FilterX, BrainCircuit, FileSearch, 
  Award, Send, MousePointerClick, FormInput, PenTool, Terminal 
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentState, UserSearchPrefsV1 } from '../../core/domain/entities';
import { AgentStatus } from '../../types';

interface Props {
  state: AgentState;
  onRun: () => void;
  onStop: () => void;
  onConfirmLogin: () => void;
  onConfirmProfile: () => void;
  onResetProfile: () => void;
  onReset: () => void;
  
  // Stage 5
  onContinueToSearch: () => void;
  onScanSearchUI: () => void;
  onAnalyzeSearchUI: () => void;
  onSubmitSearchPrefs: (prefs: UserSearchPrefsV1) => void;
  onBuildPlan: () => void;
  
  // Phase A
  onExecuteStep: () => void;
  onExecuteCycle: () => void;
  onVerifyFilters: () => void;

  // Phase B
  onCollectBatch: () => void;
  onDedupBatch: () => void;

  // Phase C
  onRunPrefilter: () => void;
  onRunLLMScreening: () => void;

  // Phase D
  onRunExtraction: () => void;
  onRunLLMEvalBatch: () => void;
  onBuildApplyQueue: () => void;

  // Phase E
  onProbeApplyEntrypoint: () => void;
  onOpenApplyForm: () => void;
  onFillApplyDraft: () => void;
}

export const AgentStatusScreen: React.FC<Props> = ({ 
    state, onRun, onStop, onConfirmLogin, onConfirmProfile, onResetProfile, onReset,
    onContinueToSearch, onScanSearchUI, onAnalyzeSearchUI, onSubmitSearchPrefs, onBuildPlan,
    onExecuteStep, onExecuteCycle, onVerifyFilters,
    onCollectBatch, onDedupBatch,
    onRunPrefilter, onRunLLMScreening,
    onRunExtraction, onRunLLMEvalBatch, onBuildApplyQueue,
    onProbeApplyEntrypoint, onOpenApplyForm, onFillApplyDraft
}) => {

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
      case AgentStatus.VACANCIES_CAPTURED: return 'text-teal-400';
      case AgentStatus.VACANCIES_DEDUPED: return 'text-cyan-500';
      case AgentStatus.PREFILTER_DONE: return 'text-orange-400';
      case AgentStatus.LLM_SCREENING_DONE: return 'text-purple-400';
      case AgentStatus.EXTRACTING_VACANCIES: return 'text-pink-400';
      case AgentStatus.VACANCIES_EXTRACTED: return 'text-pink-500';
      case AgentStatus.EVALUATION_DONE: return 'text-yellow-300';
      case AgentStatus.APPLY_QUEUE_READY: return 'text-green-300';
      case AgentStatus.FINDING_APPLY_BUTTON: return 'text-blue-300';
      case AgentStatus.APPLY_BUTTON_FOUND: return 'text-green-400';
      case AgentStatus.APPLY_FORM_OPENED: return 'text-emerald-300';
      case AgentStatus.APPLY_DRAFT_FILLED: return 'text-emerald-400';
      case AgentStatus.SUBMITTING_APPLICATION: return 'text-orange-300';
      case AgentStatus.APPLICATION_SUBMITTED: return 'text-green-500';
      case AgentStatus.APPLICATION_FAILED: return 'text-red-500';
      case AgentStatus.APPLY_QUEUE_COMPLETED: return 'text-green-400 font-bold';
      case AgentStatus.COMPLETED: return 'text-green-500';
      case AgentStatus.FAILED: return 'text-red-500';
      default: return 'text-gray-100';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    if (status === AgentStatus.NAVIGATING || status === AgentStatus.EXTRACTING || status === AgentStatus.STARTING || status === AgentStatus.TARGETING_PENDING || status === AgentStatus.NAVIGATING_TO_SEARCH || status === AgentStatus.EXTRACTING_SEARCH_UI || status === AgentStatus.ANALYZING_SEARCH_UI || status === AgentStatus.APPLYING_FILTERS || status === AgentStatus.EXTRACTING_VACANCIES || status === AgentStatus.FINDING_APPLY_BUTTON || status === AgentStatus.SUBMITTING_APPLICATION) return <Loader2 className="animate-spin" />;
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
    if (status === AgentStatus.VACANCIES_CAPTURED) return <DownloadCloud />;
    if (status === AgentStatus.VACANCIES_DEDUPED) return <Layers />;
    if (status === AgentStatus.PREFILTER_DONE) return <FilterX />;
    if (status === AgentStatus.LLM_SCREENING_DONE) return <BrainCircuit />;
    if (status === AgentStatus.VACANCIES_EXTRACTED) return <FileSearch />;
    if (status === AgentStatus.EVALUATION_DONE) return <Award />;
    if (status === AgentStatus.APPLY_QUEUE_READY) return <Send />;
    if (status === AgentStatus.FINDING_APPLY_BUTTON) return <Loader2 className="animate-spin" />;
    if (status === AgentStatus.APPLY_BUTTON_FOUND) return <MousePointerClick />;
    if (status === AgentStatus.APPLY_FORM_OPENED) return <FormInput />;
    if (status === AgentStatus.APPLY_DRAFT_FILLED) return <PenTool />;
    if (status === AgentStatus.APPLICATION_SUBMITTED) return <CheckCircle />;
    if (status === AgentStatus.APPLICATION_FAILED) return <AlertCircle />;
    if (status === AgentStatus.APPLY_QUEUE_COMPLETED) return <CheckCircle />;
    if (status === AgentStatus.COMPLETED) return <CheckCircle />;
    return <Terminal />;
  };

  const isRunning = state.status !== AgentStatus.IDLE && state.status !== AgentStatus.COMPLETED && state.status !== AgentStatus.FAILED && state.status !== AgentStatus.PROFILE_CAPTURED && state.status !== AgentStatus.TARGETING_READY && state.status !== AgentStatus.SEARCH_PAGE_READY && state.status !== AgentStatus.SEARCH_DOM_READY && state.status !== AgentStatus.WAITING_FOR_SEARCH_PREFS && state.status !== AgentStatus.SEARCH_PREFS_SAVED && state.status !== AgentStatus.APPLY_PLAN_READY && state.status !== AgentStatus.APPLY_STEP_DONE && state.status !== AgentStatus.APPLY_STEP_FAILED && state.status !== AgentStatus.SEARCH_READY && state.status !== AgentStatus.VACANCIES_CAPTURED && state.status !== AgentStatus.VACANCIES_DEDUPED && state.status !== AgentStatus.PREFILTER_DONE && state.status !== AgentStatus.LLM_SCREENING_DONE && state.status !== AgentStatus.VACANCIES_EXTRACTED && state.status !== AgentStatus.EVALUATION_DONE && state.status !== AgentStatus.APPLY_QUEUE_READY && state.status !== AgentStatus.APPLY_BUTTON_FOUND && state.status !== AgentStatus.APPLY_FORM_OPENED && state.status !== AgentStatus.APPLY_DRAFT_FILLED && state.status !== AgentStatus.SUBMITTING_APPLICATION && state.status !== AgentStatus.APPLICATION_SUBMITTED && state.status !== AgentStatus.APPLICATION_FAILED && state.status !== AgentStatus.APPLY_QUEUE_COMPLETED;

  const isProfileDone = state.status === AgentStatus.PROFILE_CAPTURED || state.status === AgentStatus.TARGETING_READY || state.status === AgentStatus.TARGETING_ERROR || state.status === AgentStatus.SEARCH_DOM_READY || state.status === AgentStatus.SEARCH_PAGE_READY || state.status === AgentStatus.WAITING_FOR_SEARCH_PREFS || state.status === AgentStatus.SEARCH_PREFS_SAVED || state.status === AgentStatus.APPLY_PLAN_READY || state.status === AgentStatus.APPLY_STEP_DONE || state.status === AgentStatus.SEARCH_READY || state.status === AgentStatus.VACANCIES_CAPTURED || state.status === AgentStatus.VACANCIES_DEDUPED || state.status === AgentStatus.PREFILTER_DONE || state.status === AgentStatus.LLM_SCREENING_DONE || state.status === AgentStatus.VACANCIES_EXTRACTED || state.status === AgentStatus.EVALUATION_DONE || state.status === AgentStatus.APPLY_QUEUE_READY || state.status === AgentStatus.APPLY_BUTTON_FOUND || state.status === AgentStatus.APPLY_FORM_OPENED || state.status === AgentStatus.APPLY_DRAFT_FILLED || state.status === AgentStatus.SUBMITTING_APPLICATION || state.status === AgentStatus.APPLICATION_SUBMITTED || state.status === AgentStatus.APPLICATION_FAILED || state.status === AgentStatus.APPLY_QUEUE_COMPLETED;

  return (
    <Layout title="Agent Runner" currentStep={2}>
        <div className="flex flex-col h-full space-y-6">
            
            {/* Status Header */}
            <div className="flex items-center justify-between bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full bg-gray-900 border border-gray-700 ${getStatusColor(state.status)}`}>
                        {getStatusIcon(state.status)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">{state.status.replace(/_/g, ' ')}</h2>
                        <p className="text-sm text-gray-400 font-mono mt-1">
                            {state.currentUrl ? state.currentUrl.substring(0, 50) + '...' : 'No active page'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {state.status === AgentStatus.IDLE && (
                        <button onClick={onRun} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20">
                            <Terminal size={18} />
                            <span>LAUNCH SEQUENCE</span>
                        </button>
                    )}
                    
                    {isRunning && (
                        <button onClick={onStop} className="flex items-center space-x-2 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 px-6 py-3 rounded-lg font-bold transition-all">
                            <span>ABORT</span>
                        </button>
                    )}

                    {/* GATE: WAITING FOR HUMAN */}
                    {state.status === AgentStatus.WAITING_FOR_HUMAN && (
                        <button onClick={onConfirmLogin} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition-all animate-pulse">
                            <CheckCircle size={18} />
                            <span>I AM LOGGED IN</span>
                        </button>
                    )}

                    {/* GATE: WAITING FOR PROFILE */}
                    {state.status === AgentStatus.WAITING_FOR_PROFILE_PAGE && (
                        <button onClick={onConfirmProfile} className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <FileText size={18} />
                            <span>CAPTURE PROFILE</span>
                        </button>
                    )}
                    
                    {/* TARGETING READY -> GO TO SEARCH */}
                    {(state.status === AgentStatus.TARGETING_READY || state.status === AgentStatus.PROFILE_CAPTURED) && (
                        <button onClick={onContinueToSearch} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <Compass size={18} />
                            <span>NAVIGATE TO SEARCH</span>
                        </button>
                    )}
                    
                    {/* SEARCH PAGE READY -> SCAN DOM */}
                    {state.status === AgentStatus.SEARCH_PAGE_READY && (
                        <button onClick={onScanSearchUI} className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <Eye size={18} />
                            <span>SCAN UI</span>
                        </button>
                    )}

                    {/* DOM READY -> ANALYZE */}
                    {state.status === AgentStatus.SEARCH_DOM_READY && (
                        <button onClick={onAnalyzeSearchUI} className="flex items-center space-x-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <BrainCircuit size={18} />
                            <span>ANALYZE UI</span>
                        </button>
                    )}

                    {/* WAITING PREFS -> SUBMIT (Mock button for now) */}
                    {state.status === AgentStatus.WAITING_FOR_SEARCH_PREFS && (
                         <button onClick={() => onSubmitSearchPrefs({
                             siteId: 'hh.ru',
                             updatedAt: Date.now(),
                             minSalary: 200000,
                             workMode: 'REMOTE' as any,
                             additionalFilters: {}
                         })} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <CheckCircle size={18} />
                            <span>CONFIRM PREFS (MOCK)</span>
                        </button>
                    )}
                    
                    {/* PREFS SAVED -> BUILD PLAN */}
                    {state.status === AgentStatus.SEARCH_PREFS_SAVED && (
                        <button onClick={onBuildPlan} className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <List size={18} />
                            <span>BUILD PLAN</span>
                        </button>
                    )}

                    {/* PLAN READY -> EXECUTE */}
                    {(state.status === AgentStatus.APPLY_PLAN_READY || state.status === AgentStatus.APPLY_STEP_DONE) && (
                        <div className="flex space-x-2">
                            <button onClick={onExecuteStep} className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-bold transition-all">
                                <span>STEP &gt;</span>
                            </button>
                            <button onClick={onExecuteCycle} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-all">
                                <span>AUTO &gt;&gt;</span>
                            </button>
                        </div>
                    )}
                    
                    {/* SEARCH READY -> VERIFY or COLLECT */}
                    {state.status === AgentStatus.SEARCH_READY && (
                        <div className="flex space-x-2">
                            <button onClick={onVerifyFilters} className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold transition-all">
                                <ShieldCheck size={18} />
                                <span>VERIFY</span>
                            </button>
                            <button onClick={onCollectBatch} className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg font-bold transition-all">
                                <DownloadCloud size={18} />
                                <span>SCAN VACANCIES</span>
                            </button>
                        </div>
                    )}

                    {/* VACANCIES CAPTURED -> DEDUP */}
                    {state.status === AgentStatus.VACANCIES_CAPTURED && (
                         <button onClick={onDedupBatch} className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <Layers size={18} />
                            <span>DEDUP & FILTER</span>
                        </button>
                    )}

                    {/* DEDUP DONE -> PREFILTER */}
                    {state.status === AgentStatus.VACANCIES_DEDUPED && (
                         <button onClick={onRunPrefilter} className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <FilterX size={18} />
                            <span>RUN SCRIPT PREFILTER</span>
                        </button>
                    )}

                    {/* PREFILTER DONE -> LLM SCREEN */}
                    {state.status === AgentStatus.PREFILTER_DONE && (
                         <button onClick={onRunLLMScreening} className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <BrainCircuit size={18} />
                            <span>LLM SCREENING</span>
                        </button>
                    )}

                    {/* LLM SCREEN DONE -> EXTRACT */}
                    {state.status === AgentStatus.LLM_SCREENING_DONE && (
                         <button onClick={onRunExtraction} className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <FileSearch size={18} />
                            <span>FULL EXTRACTION</span>
                        </button>
                    )}
                    
                    {/* EXTRACT DONE -> EVALUATE */}
                    {state.status === AgentStatus.VACANCIES_EXTRACTED && (
                         <button onClick={onRunLLMEvalBatch} className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <Award size={18} />
                            <span>LLM EVALUATION</span>
                        </button>
                    )}

                    {/* EVAL DONE -> BUILD QUEUE */}
                    {state.status === AgentStatus.EVALUATION_DONE && (
                         <button onClick={onBuildApplyQueue} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <Send size={18} />
                            <span>BUILD APPLY QUEUE</span>
                        </button>
                    )}

                    {/* APPLY_QUEUE_READY -> PROBE NEXT ENTRYPOINT (E1.1) */}
                    {(state.status === AgentStatus.APPLY_QUEUE_READY || state.status === AgentStatus.APPLY_BUTTON_FOUND || state.status === AgentStatus.APPLICATION_SUBMITTED || state.status === AgentStatus.APPLICATION_FAILED) && onProbeApplyEntrypoint && (
                        <button onClick={onProbeApplyEntrypoint} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20">
                            <MousePointerClick size={18} />
                            <span>{state.status === AgentStatus.APPLY_QUEUE_READY ? "START QUEUE PROCESSING" : "PROCESS NEXT VACANCY"}</span>
                        </button>
                    )}
                    
                    {/* BUTTON FOUND -> OPEN FORM (E1.2) */}
                    {state.status === AgentStatus.APPLY_BUTTON_FOUND && (
                         <button onClick={onOpenApplyForm} className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <FormInput size={18} />
                            <span>OPEN FORM</span>
                        </button>
                    )}
                    
                    {/* FORM OPENED -> FILL DRAFT (E1.3) */}
                    {state.status === AgentStatus.APPLY_FORM_OPENED && (
                         <button onClick={onFillApplyDraft} className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-lg font-bold transition-all">
                            <PenTool size={18} />
                            <span>FILL DRAFT</span>
                        </button>
                    )}

                    {/* Profile Reset Option */}
                    {isProfileDone && (
                        <button onClick={onResetProfile} className="text-xs text-gray-500 underline hover:text-white ml-4">
                            Reset Profile
                        </button>
                    )}
                    
                    {(state.status === AgentStatus.COMPLETED || state.status === AgentStatus.FAILED) && (
                        <button onClick={onReset} className="text-gray-400 hover:text-white underline">
                            Reset Session
                        </button>
                    )}
                </div>
            </div>

            {/* Main Log Area */}
            <div className="flex-1 bg-black rounded-xl border border-gray-800 p-4 font-mono text-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2 border-b border-gray-900 pb-2">
                    <span className="text-gray-500">SESSION LOGS</span>
                    <span className="text-xs text-gray-700">LIVE FEED</span>
                </div>
                <div className="flex-1 overflow-auto space-y-1">
                    {state.logs.length === 0 && (
                        <div className="text-gray-700 italic">Ready to start...</div>
                    )}
                    {state.logs.map((log, i) => (
                        <div key={i} className="flex">
                            <span className="text-gray-600 mr-3">[{String(i).padStart(3, '0')}]</span>
                            <span className={log.includes('ERROR') ? 'text-red-400' : 'text-gray-300'}>
                                {log}
                            </span>
                        </div>
                    ))}
                    <div className="h-4" /> {/* spacer */}
                </div>
            </div>

             {/* Inspector Panel (Optional visualization of state) */}
             <div className="grid grid-cols-3 gap-4 h-48">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 overflow-auto">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Targeting Spec</h4>
                    {state.activeTargetingSpec ? (
                        <pre className="text-xs text-green-400 whitespace-pre-wrap">
                            {JSON.stringify(state.activeTargetingSpec, null, 2)}
                        </pre>
                    ) : (
                        <span className="text-xs text-gray-600">Pending...</span>
                    )}
                </div>
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 overflow-auto">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Vacancy Queue</h4>
                    {state.activeVacancyBatch ? (
                        <div className="space-y-1">
                            <div className="text-xs text-gray-400">Total: {state.activeVacancyBatch.cards.length}</div>
                            {state.activeDedupedBatch && <div className="text-xs text-cyan-400">Deduped: {state.activeDedupedBatch.summary.selected}</div>}
                            {state.activeLLMBatch && <div className="text-xs text-purple-400">To Read: {state.activeLLMBatch.summary.read}</div>}
                            {state.activeEvalBatch && <div className="text-xs text-yellow-400">To Apply: {state.activeEvalBatch.summary.apply}</div>}
                            {state.activeApplyQueue && <div className="text-xs text-green-400 font-bold">Queue: {state.activeApplyQueue.summary.pending} / {state.activeApplyQueue.summary.total}</div>}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-600">Empty</span>
                    )}
                </div>
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 overflow-auto">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Active Task</h4>
                    {state.activeApplyProbe ? (
                        <div className="text-xs space-y-2">
                             <div className="text-blue-300">Probing: {state.activeApplyProbe.taskId}</div>
                             <div className="text-gray-400">Controls: {state.activeApplyProbe.foundControls.length}</div>
                             {state.activeApplyDraft && <div className="text-emerald-400">Draft: {state.activeApplyDraft.formStateSummary}</div>}
                             {state.activeSubmitReceipt && <div className={state.activeSubmitReceipt.successConfirmed ? "text-green-500" : "text-red-500"}>
                                 Result: {state.activeSubmitReceipt.successConfirmed ? "SENT" : "FAIL"}
                             </div>}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-600">Idle</span>
                    )}
                </div>
             </div>

        </div>
    </Layout>
  );
};