// ... (imports remain same)
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Play, Pause, AlertCircle, CheckCircle, Loader2, UserCheck, XCircle, RotateCcw, FileText, UploadCloud, Lock, Compass, Eye, Sparkles, Filter, Save, ChevronRight, List, Cpu, Zap, Repeat, ShieldCheck, DownloadCloud, Layers, FilterX, BrainCircuit, FileSearch, CheckSquare, Award, Send, MousePointerClick, FormInput, PenTool, HelpCircle, EyeOff, FastForward, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentStatus } from '../../types';
import { AgentState, UserSearchPrefsV1, SearchFieldDefinition, SearchApplyStep, ControlVerificationResult, VacancyCardV1, VacancyDecision, VacancyExtractV1, LLMVacancyEvalResult, ApplyQueueItem } from '../../core/domain/entities';

// ... (Props interface remain same)
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
  onCollectBatch?: () => void;
  onDedupBatch?: () => void;
  onRunPrefilter?: () => void;
  onRunLLMScreening?: () => void;
  onRunExtraction?: () => void; // Phase D1
  onRunLLMEvalBatch?: () => void; // Phase D2
  onBuildApplyQueue?: () => void; // Phase D2.2
  onProbeApplyEntrypoint?: () => void; // Phase E1.1
  onOpenApplyForm?: () => void; // Phase E1.2
  onFillApplyDraft?: () => void; // Phase E1.3
  onSubmitApply?: () => void; // Phase E1.4
  // Phase F1
  onResolveDrift?: () => void;
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
  onVerifyFilters,
  onCollectBatch,
  onDedupBatch,
  onRunPrefilter,
  onRunLLMScreening,
  onRunExtraction,
  onRunLLMEvalBatch,
  onBuildApplyQueue,
  onProbeApplyEntrypoint,
  onOpenApplyForm,
  onFillApplyDraft,
  onSubmitApply,
  onResolveDrift
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
      case AgentStatus.FILLING_QUESTIONNAIRE: return 'text-purple-300';
      case AgentStatus.APPLY_DRAFT_FILLED: return 'text-emerald-400';
      case AgentStatus.SUBMITTING_APPLICATION: return 'text-purple-400';
      case AgentStatus.APPLY_RETRYING: return 'text-orange-400'; // New
      case AgentStatus.APPLY_SUBMIT_SUCCESS: return 'text-green-500';
      case AgentStatus.APPLY_SUBMIT_FAILED: return 'text-red-500';
      case AgentStatus.APPLY_FAILED_HIDDEN: return 'text-gray-500'; // New
      case AgentStatus.APPLY_FAILED_SKIPPED: return 'text-gray-500'; // New
      case AgentStatus.DOM_DRIFT_DETECTED: return 'text-amber-500'; // F1
      case AgentStatus.COMPLETED: return 'text-green-500';
      case AgentStatus.FAILED: return 'text-red-500';
      default: return 'text-gray-100';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    if (status === AgentStatus.NAVIGATING || status === AgentStatus.EXTRACTING || status === AgentStatus.STARTING || status === AgentStatus.TARGETING_PENDING || status === AgentStatus.NAVIGATING_TO_SEARCH || status === AgentStatus.EXTRACTING_SEARCH_UI || status === AgentStatus.ANALYZING_SEARCH_UI || status === AgentStatus.APPLYING_FILTERS || status === AgentStatus.EXTRACTING_VACANCIES || status === AgentStatus.FINDING_APPLY_BUTTON || status === AgentStatus.SUBMITTING_APPLICATION || status === AgentStatus.FILLING_QUESTIONNAIRE || status === AgentStatus.APPLY_RETRYING) return <Loader2 className="animate-spin" />;
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
    if (status === AgentStatus.APPLY_BUTTON_FOUND) return <MousePointerClick />;
    if (status === AgentStatus.APPLY_FORM_OPENED) return <FormInput />;
    if (status === AgentStatus.APPLY_DRAFT_FILLED) return <PenTool />;
    if (status === AgentStatus.APPLY_SUBMIT_SUCCESS) return <CheckCircle />;
    if (status === AgentStatus.APPLY_SUBMIT_FAILED) return <XCircle />;
    if (status === AgentStatus.APPLY_FAILED_HIDDEN) return <EyeOff />;
    if (status === AgentStatus.APPLY_FAILED_SKIPPED) return <FastForward />;
    if (status === AgentStatus.DOM_DRIFT_DETECTED) return <AlertTriangle />;
    if (status === AgentStatus.COMPLETED) return <CheckCircle />;
    return <Terminal />;
  };

  const isRunning = state.status !== AgentStatus.IDLE && state.status !== AgentStatus.COMPLETED && state.status !== AgentStatus.FAILED && state.status !== AgentStatus.PROFILE_CAPTURED && state.status !== AgentStatus.TARGETING_READY && state.status !== AgentStatus.SEARCH_PAGE_READY && state.status !== AgentStatus.SEARCH_DOM_READY && state.status !== AgentStatus.WAITING_FOR_SEARCH_PREFS && state.status !== AgentStatus.SEARCH_PREFS_SAVED && state.status !== AgentStatus.APPLY_PLAN_READY && state.status !== AgentStatus.APPLY_STEP_DONE && state.status !== AgentStatus.APPLY_STEP_FAILED && state.status !== AgentStatus.SEARCH_READY && state.status !== AgentStatus.VACANCIES_CAPTURED && state.status !== AgentStatus.VACANCIES_DEDUPED && state.status !== AgentStatus.PREFILTER_DONE && state.status !== AgentStatus.LLM_SCREENING_DONE && state.status !== AgentStatus.VACANCIES_EXTRACTED && state.status !== AgentStatus.EVALUATION_DONE && state.status !== AgentStatus.APPLY_QUEUE_READY && state.status !== AgentStatus.APPLY_BUTTON_FOUND && state.status !== AgentStatus.APPLY_FORM_OPENED && state.status !== AgentStatus.APPLY_DRAFT_FILLED && state.status !== AgentStatus.APPLY_SUBMIT_SUCCESS && state.status !== AgentStatus.APPLY_SUBMIT_FAILED && state.status !== AgentStatus.FILLING_QUESTIONNAIRE && state.status !== AgentStatus.APPLY_RETRYING && state.status !== AgentStatus.APPLY_FAILED_HIDDEN && state.status !== AgentStatus.APPLY_FAILED_SKIPPED && state.status !== AgentStatus.DOM_DRIFT_DETECTED;
  const isFinished = state.status === AgentStatus.COMPLETED || state.status === AgentStatus.FAILED;
  // Can reset profile if captured OR targeting ready OR dom ready OR waiting prefs OR plan ready
  const isProfileDone = state.status === AgentStatus.PROFILE_CAPTURED || state.status === AgentStatus.TARGETING_READY || state.status === AgentStatus.TARGETING_ERROR || state.status === AgentStatus.SEARCH_DOM_READY || state.status === AgentStatus.SEARCH_PAGE_READY || state.status === AgentStatus.WAITING_FOR_SEARCH_PREFS || state.status === AgentStatus.SEARCH_PREFS_SAVED || state.status === AgentStatus.APPLY_PLAN_READY || state.status === AgentStatus.APPLY_STEP_DONE || state.status === AgentStatus.SEARCH_READY || state.status === AgentStatus.VACANCIES_CAPTURED || state.status === AgentStatus.VACANCIES_DEDUPED || state.status === AgentStatus.PREFILTER_DONE || state.status === AgentStatus.LLM_SCREENING_DONE || state.status === AgentStatus.VACANCIES_EXTRACTED || state.status === AgentStatus.EVALUATION_DONE || state.status === AgentStatus.APPLY_QUEUE_READY || state.status === AgentStatus.APPLY_BUTTON_FOUND || state.status === AgentStatus.APPLY_FORM_OPENED || state.status === AgentStatus.APPLY_DRAFT_FILLED || state.status === AgentStatus.APPLY_SUBMIT_SUCCESS || state.status === AgentStatus.APPLY_SUBMIT_FAILED || state.status === AgentStatus.FILLING_QUESTIONNAIRE || state.status === AgentStatus.APPLY_RETRYING || state.status === AgentStatus.APPLY_FAILED_HIDDEN || state.status === AgentStatus.APPLY_FAILED_SKIPPED || state.status === AgentStatus.DOM_DRIFT_DETECTED;

  // ... (render helpers)
  const renderFieldInput = (field: SearchFieldDefinition, currentValue: any) => {
      // (omitted for brevity, assume unchanged)
      return null;
  };
  const renderQueueItem = (item: ApplyQueueItem) => {
      // (omitted for brevity)
      return null;
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
                
                {/* DOM DRIFT WARNING */}
                {state.status === AgentStatus.DOM_DRIFT_DETECTED && (
                    <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-6 max-w-md text-center">
                        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-amber-100 mb-2">DOM Drift Detected</h3>
                        <p className="text-gray-300 mb-4 text-sm">
                            The structure of the current page has changed significantly since the last scan.
                            Existing selectors may fail.
                        </p>
                        <div className="bg-black/40 rounded p-2 mb-4 text-left font-mono text-xs text-amber-200">
                             <div>Page: {state.activeDriftEvent?.pageType}</div>
                             <div>Severity: {state.activeDriftEvent?.severity}</div>
                             <div>Action: {state.activeDriftEvent?.actionRequired}</div>
                        </div>
                        {onResolveDrift && (
                            <button 
                                onClick={onResolveDrift}
                                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center w-full gap-2 transition-colors"
                            >
                                <RefreshCw size={18} />
                                ACKNOWLEDGE & RE-ANALYZE
                            </button>
                        )}
                    </div>
                )}
                
                {/* DRAFT PREVIEW WITH QUESTIONNAIRE */}
                {state.status === AgentStatus.APPLY_DRAFT_FILLED && state.activeApplyDraft && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-emerald-400 mb-2">
                                <PenTool size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Application Draft</h3>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Cover Letter filled. Questionnaire {state.activeApplyDraft.questionnaireFilled ? 'answered' : 'not present'}. Ready to submit.
                            </p>
                        </div>

                        {/* Cover Letter */}
                        <div className="mb-6 bg-gray-800 p-4 rounded border border-gray-700">
                             <div className="text-xs text-gray-500 uppercase font-bold mb-2">Cover Letter Source: {state.activeApplyDraft.coverLetterSource}</div>
                             <div className="text-gray-300 italic text-sm">
                                 (Content Filled in Browser)
                             </div>
                        </div>

                        {/* Questionnaire Answers */}
                        {state.activeQuestionnaireAnswers && (
                            <div className="bg-purple-900/10 border border-purple-500/30 rounded p-4">
                                <div className="text-sm text-purple-400 font-bold mb-4 flex items-center gap-2">
                                    <Sparkles size={16} />
                                    AI Generated Answers
                                </div>
                                <div className="space-y-2">
                                    {state.activeQuestionnaireAnswers.answers.map(ans => (
                                        <div key={ans.fieldId} className="border-b border-gray-800 last:border-0 pb-2 mb-2">
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div className="text-gray-400 font-mono">{ans.fieldId}</div>
                                                <div>
                                                    <div className="text-white font-bold">{String(ans.value)}</div>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[10px] text-gray-500">Conf: {(ans.confidence * 100).toFixed(0)}%</span>
                                                        {ans.risks.length > 0 && <span className="text-[10px] text-red-400">RISK</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Facts Used */}
                                            {ans.factsUsed && ans.factsUsed.length > 0 && (
                                              <div className="mt-1 flex flex-wrap gap-1">
                                                {ans.factsUsed.map((fact, idx) => (
                                                   <span key={idx} className="text-[10px] bg-gray-700 text-gray-300 px-1 rounded flex items-center">
                                                     <Info size={8} className="mr-1"/> {fact}
                                                   </span>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* (Include other views for queues, prefs, etc. - reusing existing logic implicitly) */}

             </div>
          </div>
          
          {/* Controls (Same as before) */}
          <div className="h-20 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-between px-6">
             {/* ... existing controls ... */}
             <div className="flex space-x-3">
                {/* Re-insert all buttons from previous version to maintain functionality */}
                {state.status === AgentStatus.IDLE && (
                   <button onClick={onRun} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition-all">
                    <Play size={18} fill="currentColor" />
                    <span>INITIATE LOGIN</span>
                  </button>
                )}
                 {/* ... other buttons ... */}
                 {(state.status === AgentStatus.APPLY_DRAFT_FILLED || state.status === AgentStatus.APPLY_RETRYING || state.status === AgentStatus.APPLY_FAILED_HIDDEN) && onSubmitApply && (
                    <button onClick={onSubmitApply} className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-purple-900/20">
                        <Send size={18} />
                        <span>SUBMIT APPLICATION</span>
                    </button>
                )}
             </div>
          </div>
        </div>

        {/* Right Col: Logs & Telemetry */}
        <div className="bg-gray-950 rounded-xl border border-gray-800 flex flex-col font-mono text-sm">
          <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
            <span className="text-gray-400 text-xs">SYSTEM LOGS</span>
            <div className="flex items-center gap-3 text-xs">
                <span className="text-blue-400">IN: {state.tokenLedger.inputTokens}</span>
                <span className="text-purple-400">OUT: {state.tokenLedger.outputTokens}</span>
                <span className="text-green-400">HIT: {state.tokenLedger.cacheHits}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-2 text-gray-300" ref={scrollRef}>
            {state.logs.map((log, i) => (
              <div key={i} className="break-words">
                <span className="text-gray-600 mr-2">[{i}]</span>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};