import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Play, Pause, AlertCircle, CheckCircle, Loader2, UserCheck, XCircle, RotateCcw, FileText, UploadCloud, Lock, Compass, Eye, Sparkles, Filter, Save, ChevronRight, List, Cpu, Zap, Repeat, ShieldCheck, DownloadCloud, Layers, FilterX, BrainCircuit, FileSearch, CheckSquare, Award, Send, MousePointerClick } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentStatus } from '../../types';
import { AgentState, UserSearchPrefsV1, SearchFieldDefinition, SearchApplyStep, ControlVerificationResult, VacancyCardV1, VacancyDecision, VacancyExtractV1, LLMVacancyEvalResult, ApplyQueueItem } from '../../core/domain/entities';

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
  onProbeApplyEntrypoint
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
      case AgentStatus.COMPLETED: return 'text-green-500';
      case AgentStatus.FAILED: return 'text-red-500';
      default: return 'text-gray-100';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    if (status === AgentStatus.NAVIGATING || status === AgentStatus.EXTRACTING || status === AgentStatus.STARTING || status === AgentStatus.TARGETING_PENDING || status === AgentStatus.NAVIGATING_TO_SEARCH || status === AgentStatus.EXTRACTING_SEARCH_UI || status === AgentStatus.ANALYZING_SEARCH_UI || status === AgentStatus.APPLYING_FILTERS || status === AgentStatus.EXTRACTING_VACANCIES || status === AgentStatus.FINDING_APPLY_BUTTON) return <Loader2 className="animate-spin" />;
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
    if (status === AgentStatus.COMPLETED) return <CheckCircle />;
    return <Terminal />;
  };

  const isRunning = state.status !== AgentStatus.IDLE && state.status !== AgentStatus.COMPLETED && state.status !== AgentStatus.FAILED && state.status !== AgentStatus.PROFILE_CAPTURED && state.status !== AgentStatus.TARGETING_READY && state.status !== AgentStatus.SEARCH_PAGE_READY && state.status !== AgentStatus.SEARCH_DOM_READY && state.status !== AgentStatus.WAITING_FOR_SEARCH_PREFS && state.status !== AgentStatus.SEARCH_PREFS_SAVED && state.status !== AgentStatus.APPLY_PLAN_READY && state.status !== AgentStatus.APPLY_STEP_DONE && state.status !== AgentStatus.APPLY_STEP_FAILED && state.status !== AgentStatus.SEARCH_READY && state.status !== AgentStatus.VACANCIES_CAPTURED && state.status !== AgentStatus.VACANCIES_DEDUPED && state.status !== AgentStatus.PREFILTER_DONE && state.status !== AgentStatus.LLM_SCREENING_DONE && state.status !== AgentStatus.VACANCIES_EXTRACTED && state.status !== AgentStatus.EVALUATION_DONE && state.status !== AgentStatus.APPLY_QUEUE_READY && state.status !== AgentStatus.APPLY_BUTTON_FOUND;
  const isFinished = state.status === AgentStatus.COMPLETED || state.status === AgentStatus.FAILED;
  // Can reset profile if captured OR targeting ready OR dom ready OR waiting prefs OR plan ready
  const isProfileDone = state.status === AgentStatus.PROFILE_CAPTURED || state.status === AgentStatus.TARGETING_READY || state.status === AgentStatus.TARGETING_ERROR || state.status === AgentStatus.SEARCH_DOM_READY || state.status === AgentStatus.SEARCH_PAGE_READY || state.status === AgentStatus.WAITING_FOR_SEARCH_PREFS || state.status === AgentStatus.SEARCH_PREFS_SAVED || state.status === AgentStatus.APPLY_PLAN_READY || state.status === AgentStatus.APPLY_STEP_DONE || state.status === AgentStatus.SEARCH_READY || state.status === AgentStatus.VACANCIES_CAPTURED || state.status === AgentStatus.VACANCIES_DEDUPED || state.status === AgentStatus.PREFILTER_DONE || state.status === AgentStatus.LLM_SCREENING_DONE || state.status === AgentStatus.VACANCIES_EXTRACTED || state.status === AgentStatus.EVALUATION_DONE || state.status === AgentStatus.APPLY_QUEUE_READY || state.status === AgentStatus.APPLY_BUTTON_FOUND;

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

  const renderVacancyCard = (card: VacancyCardV1, decision?: string, extraData?: {score?: number, reasons?: string[], confidence?: number}) => {
     let borderClass = 'border-gray-700';
     let statusBadge = null;

     // DEDUP logic
     if (decision === VacancyDecision.SELECTED) {
         borderClass = 'border-l-4 border-l-green-500 border-t border-r border-b border-gray-700';
         statusBadge = <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">Selected</span>;
     } else if (decision === VacancyDecision.DUPLICATE) {
         borderClass = 'border-l-4 border-l-yellow-600 border-t border-r border-b border-gray-700 opacity-60';
         statusBadge = <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wide">Duplicate</span>;
     } else if (decision === VacancyDecision.SKIP_SEEN) {
         borderClass = 'border-l-4 border-l-gray-600 border-t border-r border-b border-gray-700 opacity-40';
         statusBadge = <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Already Seen</span>;
     }
     
     // PREFILTER logic
     if (extraData?.score !== undefined) {
         if (decision === 'READ_CANDIDATE') {
             borderClass = 'border-l-4 border-l-emerald-500 border-t border-r border-b border-gray-700 bg-emerald-900/10';
             statusBadge = <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">CANDIDATE ({(extraData.score).toFixed(1)})</span>;
         } else if (decision === 'DEFER') {
             borderClass = 'border-l-4 border-l-blue-500 border-t border-r border-b border-gray-700';
             statusBadge = <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">DEFER ({(extraData.score).toFixed(1)})</span>;
         } else if (decision === 'REJECT') {
             borderClass = 'border-l-4 border-l-red-500 border-t border-r border-b border-gray-700 opacity-50';
             statusBadge = <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">REJECT ({(extraData.score).toFixed(1)})</span>;
         }
     }

     // LLM logic (Phase C2)
     if (extraData?.confidence !== undefined) {
        if (decision === 'READ') {
            borderClass = 'border-l-4 border-l-purple-500 border-t border-r border-b border-gray-700 bg-purple-900/20';
            statusBadge = <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">AI READ ({(extraData.confidence).toFixed(2)})</span>;
        } else if (decision === 'DEFER') {
             borderClass = 'border-l-4 border-l-indigo-500 border-t border-r border-b border-gray-700';
             statusBadge = <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">AI DEFER ({(extraData.confidence).toFixed(2)})</span>;
        } else if (decision === 'IGNORE') {
             borderClass = 'border-l-4 border-l-gray-600 border-t border-r border-b border-gray-700 opacity-40';
             statusBadge = <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">AI IGNORE ({(extraData.confidence).toFixed(2)})</span>;
        }
     }

     return (
         <div key={card.id} className={`p-3 bg-gray-800 ${borderClass} mb-1 flex justify-between items-start hover:bg-gray-750 transition-colors`}>
            <div>
               <div className="flex items-center gap-2">
                   {statusBadge}
                   <div className="font-bold text-white text-sm">{card.title}</div>
               </div>
               <div className="text-xs text-blue-300">{card.company || 'Unknown'}</div>
               <div className="text-xs text-gray-500 mt-1">
                 {card.city || 'Anywhere'} &bull; {card.workMode}
               </div>
               {extraData?.reasons && (
                   <div className="mt-1 flex flex-wrap gap-1">
                       {extraData.reasons.map(r => (
                           <span key={r} className="text-[9px] bg-gray-700 text-gray-300 px-1 rounded">{r}</span>
                       ))}
                   </div>
               )}
            </div>
            <div className="text-right">
               <div className="text-sm font-mono text-emerald-400">
                  {card.salary ? `${card.salary.min || ''} - ${card.salary.max || ''} ${card.salary.currency}` : 'No salary'}
               </div>
               <div className="text-[10px] text-gray-600 mt-1">
                 {card.publishedAt || 'recently'}
               </div>
            </div>
         </div>
     );
  };

  const renderExtractedCard = (extract: VacancyExtractV1) => {
      const card = state.activeVacancyBatch?.cards.find(c => c.id === extract.vacancyId);
      const isFailed = extract.extractionStatus === 'FAILED';
      
      return (
          <div key={extract.vacancyId} className={`p-3 mb-2 rounded border ${isFailed ? 'border-red-800 bg-red-900/10' : 'border-gray-700 bg-gray-800'}`}>
              <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-sm text-white">{card?.title || 'Unknown Vacancy'}</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded font-bold ${isFailed ? 'bg-red-900 text-red-400' : 'bg-green-900 text-green-400'}`}>
                      {extract.extractionStatus}
                  </div>
              </div>
              
              {!isFailed && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-900/50 p-2 rounded">
                          <div className="text-gray-500 uppercase text-[9px]">Requirements</div>
                          <div className="text-gray-300 font-mono">{extract.sections.requirements.length} items</div>
                      </div>
                      <div className="bg-gray-900/50 p-2 rounded">
                          <div className="text-gray-500 uppercase text-[9px]">Responsibilities</div>
                          <div className="text-gray-300 font-mono">{extract.sections.responsibilities.length} items</div>
                      </div>
                      <div className="bg-gray-900/50 p-2 rounded">
                           <div className="text-gray-500 uppercase text-[9px]">Conditions</div>
                           <div className="text-gray-300 font-mono">{extract.sections.conditions.length} items</div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderEvaluatedCard = (result: LLMVacancyEvalResult) => {
      const card = state.activeVacancyBatch?.cards.find(c => c.id === result.vacancyId);
      let borderColor = 'border-gray-700';
      let bgColor = 'bg-gray-800';
      let statusColor = 'text-gray-400';

      if (result.decision === 'APPLY') {
          borderColor = 'border-green-500';
          bgColor = 'bg-green-900/20';
          statusColor = 'text-green-400';
      } else if (result.decision === 'SKIP') {
          borderColor = 'border-red-900';
          bgColor = 'bg-gray-800/50 opacity-60';
          statusColor = 'text-red-400';
      } else if (result.decision === 'NEEDS_HUMAN') {
          borderColor = 'border-yellow-600';
          bgColor = 'bg-yellow-900/10';
          statusColor = 'text-yellow-500';
      }

      return (
          <div key={result.vacancyId} className={`p-4 mb-2 rounded border-l-4 ${borderColor} ${bgColor} shadow-sm`}>
               <div className="flex justify-between items-start">
                   <div>
                       <div className="font-bold text-sm text-white">{card?.title}</div>
                       <div className="text-xs text-gray-400">{card?.company}</div>
                   </div>
                   <div className="text-right">
                       <div className={`text-xs font-bold ${statusColor} uppercase tracking-wider`}>
                           {result.decision} ({(result.confidence * 100).toFixed(0)}%)
                       </div>
                   </div>
               </div>

               {/* Reasons */}
               <div className="mt-2 flex flex-wrap gap-1">
                   {result.reasons.map(r => (
                       <span key={r} className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-300 border border-gray-600">
                           {r}
                       </span>
                   ))}
               </div>

               {/* Risks */}
               {result.risks.length > 0 && (
                   <div className="mt-2 text-[10px] text-red-300 flex flex-wrap gap-1">
                       <span className="font-bold">RISKS:</span>
                       {result.risks.map(r => (
                           <span key={r} className="underline decoration-red-500/50">{r}</span>
                       ))}
                   </div>
               )}
          </div>
      );
  };

  const renderQueueItem = (item: ApplyQueueItem) => {
      const card = state.activeVacancyBatch?.cards.find(c => c.id === item.vacancyId);
      
      return (
          <div key={item.vacancyId} className="p-3 mb-2 rounded bg-gray-800 border border-gray-700 flex justify-between items-center hover:border-blue-500 transition-all">
              <div>
                  <div className="font-bold text-sm text-white">{card?.title}</div>
                  <div className="text-xs text-gray-400">{card?.company}</div>
              </div>
              <div className="flex items-center gap-3">
                  <div className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 uppercase font-mono">
                      {item.status}
                  </div>
                  {item.status === 'PENDING' && (
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  )}
              </div>
          </div>
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

                {/* VERIFICATION REPORT (Persistent until replaced) */}
                {state.activeVerification && !state.activeVacancyBatch && (
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

                {/* VACANCY BATCH VIEW (RAW) */}
                {state.activeVacancyBatch && !state.activeDedupedBatch && (
                     <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                         <div className="mb-6 border-b border-gray-800 pb-4">
                             <div className="flex items-center text-teal-400 mb-2">
                                <DownloadCloud size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Collected Batch</h3>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Captured {state.activeVacancyBatch.cards.length} cards. Next cursor: {state.activeVacancyBatch.pageCursor || 'None'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            {state.activeVacancyBatch.cards.map(c => renderVacancyCard(c))}
                        </div>
                     </div>
                )}

                {/* DEDUPED BATCH VIEW */}
                {state.activeDedupedBatch && !state.activePrefilterBatch && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-cyan-400 mb-2">
                                <Layers size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Deduplication Results</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-center mt-2">
                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-xs text-gray-500">TOTAL</div>
                                    <div className="text-lg font-bold text-white">{state.activeDedupedBatch.summary.total}</div>
                                </div>
                                <div className="bg-green-900/30 p-2 rounded">
                                    <div className="text-xs text-green-500">SELECTED</div>
                                    <div className="text-lg font-bold text-green-400">{state.activeDedupedBatch.summary.selected}</div>
                                </div>
                                <div className="bg-yellow-900/30 p-2 rounded">
                                    <div className="text-xs text-yellow-500">DUPLICATES</div>
                                    <div className="text-lg font-bold text-yellow-400">{state.activeDedupedBatch.summary.duplicates}</div>
                                </div>
                                <div className="bg-gray-700/30 p-2 rounded">
                                    <div className="text-xs text-gray-400">SEEN BEFORE</div>
                                    <div className="text-lg font-bold text-gray-300">{state.activeDedupedBatch.summary.seen}</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {state.activeDedupedBatch.results.map(r => {
                                const card = state.activeVacancyBatch!.cards.find(c => c.id === r.cardId);
                                if (!card) return null;
                                return renderVacancyCard(card, r.decision);
                            })}
                        </div>
                    </div>
                )}
                
                {/* PREFILTER BATCH VIEW */}
                {state.activePrefilterBatch && !state.activeLLMBatch && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-orange-400 mb-2">
                                <FilterX size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Prefilter Results</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center mt-2">
                                <div className="bg-emerald-900/30 p-2 rounded">
                                    <div className="text-xs text-emerald-500">READ</div>
                                    <div className="text-lg font-bold text-emerald-400">{state.activePrefilterBatch.summary.read}</div>
                                </div>
                                <div className="bg-blue-900/30 p-2 rounded">
                                    <div className="text-xs text-blue-500">DEFER</div>
                                    <div className="text-lg font-bold text-blue-400">{state.activePrefilterBatch.summary.defer}</div>
                                </div>
                                <div className="bg-red-900/30 p-2 rounded">
                                    <div className="text-xs text-red-500">REJECT</div>
                                    <div className="text-lg font-bold text-red-400">{state.activePrefilterBatch.summary.reject}</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                             {/* Show CANDIDATES First */}
                            {state.activePrefilterBatch.results
                              .filter(r => r.decision === 'READ_CANDIDATE')
                              .map(r => {
                                const card = state.activeVacancyBatch!.cards.find(c => c.id === r.cardId);
                                if (!card) return null;
                                return renderVacancyCard(card, r.decision, {score: r.score, reasons: r.reasons});
                            })}
                            
                            {/* Then DEFER */}
                             {state.activePrefilterBatch.results
                              .filter(r => r.decision === 'DEFER')
                              .map(r => {
                                const card = state.activeVacancyBatch!.cards.find(c => c.id === r.cardId);
                                if (!card) return null;
                                return renderVacancyCard(card, r.decision, {score: r.score, reasons: r.reasons});
                            })}
                            
                            {/* Then REJECT */}
                            {state.activePrefilterBatch.results
                              .filter(r => r.decision === 'REJECT')
                              .map(r => {
                                const card = state.activeVacancyBatch!.cards.find(c => c.id === r.cardId);
                                if (!card) return null;
                                return renderVacancyCard(card, r.decision, {score: r.score, reasons: r.reasons});
                            })}
                        </div>
                    </div>
                )}

                {/* LLM BATCH VIEW */}
                {state.activeLLMBatch && !state.activeExtractionBatch && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-purple-400 mb-2">
                                <BrainCircuit size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">LLM Batch Screening</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-center mt-2">
                                <div className="bg-purple-900/30 p-2 rounded">
                                    <div className="text-xs text-purple-500">READ</div>
                                    <div className="text-lg font-bold text-purple-400">{state.activeLLMBatch.summary.read}</div>
                                </div>
                                <div className="bg-indigo-900/30 p-2 rounded">
                                    <div className="text-xs text-indigo-500">DEFER</div>
                                    <div className="text-lg font-bold text-indigo-400">{state.activeLLMBatch.summary.defer}</div>
                                </div>
                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-xs text-gray-500">IGNORE</div>
                                    <div className="text-lg font-bold text-gray-400">{state.activeLLMBatch.summary.ignore}</div>
                                </div>
                                <div className="bg-gray-800 p-2 rounded flex flex-col justify-center">
                                    <div className="text-xs text-gray-500">TOKENS</div>
                                    <div className="text-xs font-mono text-gray-300">
                                      IN: {state.activeLLMBatch.tokenUsage.input}<br/>
                                      OUT: {state.activeLLMBatch.tokenUsage.output}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                             {/* Show READ First */}
                            {state.activeLLMBatch.decisions
                              .filter(d => d.decision === 'READ')
                              .map(d => {
                                const card = state.activeVacancyBatch!.cards.find(c => c.id === d.cardId);
                                if (!card) return null;
                                return renderVacancyCard(card, d.decision, {confidence: d.confidence, reasons: d.reasons});
                            })}
                            
                            {/* Then DEFER */}
                             {state.activeLLMBatch.decisions
                              .filter(d => d.decision === 'DEFER')
                              .map(d => {
                                const card = state.activeVacancyBatch!.cards.find(c => c.id === d.cardId);
                                if (!card) return null;
                                return renderVacancyCard(card, d.decision, {confidence: d.confidence, reasons: d.reasons});
                            })}
                            
                            {/* Then IGNORE */}
                            {state.activeLLMBatch.decisions
                              .filter(d => d.decision === 'IGNORE')
                              .map(d => {
                                const card = state.activeVacancyBatch!.cards.find(c => c.id === d.cardId);
                                if (!card) return null;
                                return renderVacancyCard(card, d.decision, {confidence: d.confidence, reasons: d.reasons});
                            })}
                        </div>
                    </div>
                )}

                {/* EXTRACTION BATCH VIEW */}
                {state.activeExtractionBatch && !state.activeEvalBatch && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                         <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-pink-500 mb-2">
                                <FileSearch size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Extracted Details</h3>
                            </div>
                            <div className="flex gap-4 mt-2">
                                <div className="text-sm text-gray-400">
                                    Processed: <span className="text-white font-bold">{state.activeExtractionBatch.summary.total}</span>
                                </div>
                                <div className="text-sm text-green-400">
                                    Success: <span className="font-bold">{state.activeExtractionBatch.summary.success}</span>
                                </div>
                                <div className="text-sm text-red-400">
                                    Failed: <span className="font-bold">{state.activeExtractionBatch.summary.failed}</span>
                                </div>
                            </div>
                         </div>
                         <div className="space-y-1">
                             {state.activeExtractionBatch.results.map(renderExtractedCard)}
                         </div>
                    </div>
                )}

                {/* EVALUATION BATCH VIEW (KEPT VISIBLE) */}
                {state.activeEvalBatch && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-yellow-300 mb-2">
                                <Award size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Evaluation Results</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center mt-2">
                                <div className="bg-green-900/30 p-2 rounded">
                                    <div className="text-xs text-green-500">APPLY</div>
                                    <div className="text-lg font-bold text-green-400">{state.activeEvalBatch.summary.apply}</div>
                                </div>
                                <div className="bg-red-900/30 p-2 rounded">
                                    <div className="text-xs text-red-500">SKIP</div>
                                    <div className="text-lg font-bold text-red-400">{state.activeEvalBatch.summary.skip}</div>
                                </div>
                                <div className="bg-yellow-900/30 p-2 rounded">
                                    <div className="text-xs text-yellow-500">NEEDS HUMAN</div>
                                    <div className="text-lg font-bold text-yellow-400">{state.activeEvalBatch.summary.needsHuman}</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                             {/* Prioritize APPLY */}
                             {state.activeEvalBatch.results
                              .filter(r => r.decision === 'APPLY')
                              .map(renderEvaluatedCard)}
                             
                             {/* Then NEEDS HUMAN */}
                             {state.activeEvalBatch.results
                              .filter(r => r.decision === 'NEEDS_HUMAN')
                              .map(renderEvaluatedCard)}

                             {/* Then SKIP */}
                             {state.activeEvalBatch.results
                              .filter(r => r.decision === 'SKIP')
                              .map(renderEvaluatedCard)}
                        </div>
                    </div>
                )}

                {/* APPLY QUEUE VIEW */}
                {state.activeApplyQueue && !state.activeApplyProbe && (
                    <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-green-300 mb-2">
                                <Send size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Apply Queue</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center mt-2">
                                <div className="bg-blue-900/30 p-2 rounded">
                                    <div className="text-xs text-blue-500">PENDING</div>
                                    <div className="text-lg font-bold text-blue-400">{state.activeApplyQueue.summary.pending}</div>
                                </div>
                                <div className="bg-green-900/30 p-2 rounded">
                                    <div className="text-xs text-green-500">APPLIED</div>
                                    <div className="text-lg font-bold text-green-400">{state.activeApplyQueue.summary.applied}</div>
                                </div>
                                <div className="bg-red-900/30 p-2 rounded">
                                    <div className="text-xs text-red-500">FAILED</div>
                                    <div className="text-lg font-bold text-red-400">{state.activeApplyQueue.summary.failed}</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                             {state.activeApplyQueue.items.map(renderQueueItem)}
                        </div>
                    </div>
                )}
                
                {/* PROBE VIEW (Transient) */}
                {state.activeApplyProbe && (
                     <div className="w-full h-full p-6 text-left overflow-auto bg-gray-900">
                        <div className="mb-6 border-b border-gray-800 pb-4">
                            <div className="flex items-center text-green-400 mb-2">
                                <MousePointerClick size={24} className="mr-3" />
                                <h3 className="font-bold text-xl text-white">Apply Entrypoint Probe</h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-2 truncate">URL: {state.activeApplyProbe.vacancyUrl}</p>
                            <div className="flex gap-2 text-xs">
                                <span className={`px-2 py-1 rounded ${state.activeApplyProbe.foundControls.length > 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                    {state.activeApplyProbe.foundControls.length} Controls Found
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {state.activeApplyProbe.foundControls.map((ctrl, i) => (
                                <div key={i} className="bg-gray-800 p-3 rounded border border-gray-700">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-white">{ctrl.label}</span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{ctrl.type}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono truncate">{ctrl.selector}</div>
                                </div>
                            ))}
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

                {/* SEARCH_READY (Verified) -> COLLECT BATCH */}
                {(state.status === AgentStatus.SEARCH_READY || state.status === AgentStatus.VACANCIES_CAPTURED) && state.activeVerification && onCollectBatch && !state.activeVacancyBatch && (
                     <button onClick={onCollectBatch} className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 border border-blue-400">
                        <DownloadCloud size={18} />
                        <span>COLLECT BATCH</span>
                    </button>
                )}

                {/* VACANCIES_CAPTURED -> DEDUP */}
                {state.status === AgentStatus.VACANCIES_CAPTURED && onDedupBatch && (
                    <button onClick={onDedupBatch} className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-cyan-900/20">
                        <Layers size={18} />
                        <span>DEDUP & PROCESS</span>
                    </button>
                )}
                
                {/* VACANCIES_DEDUPED -> PREFILTER */}
                {state.status === AgentStatus.VACANCIES_DEDUPED && onRunPrefilter && (
                    <button onClick={onRunPrefilter} className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-orange-900/20">
                        <FilterX size={18} />
                        <span>RUN SCRIPT FILTER</span>
                    </button>
                )}

                {/* PREFILTER_DONE -> LLM SCREENING */}
                {state.status === AgentStatus.PREFILTER_DONE && onRunLLMScreening && (
                    <button onClick={onRunLLMScreening} className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-purple-900/20">
                        <BrainCircuit size={18} />
                        <span>RUN LLM SCREENING</span>
                    </button>
                )}
                
                {/* LLM_SCREENING_DONE -> EXTRACT VACANCIES (D1) */}
                {state.status === AgentStatus.LLM_SCREENING_DONE && onRunExtraction && (
                    <button onClick={onRunExtraction} className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-pink-900/20">
                        <FileSearch size={18} />
                        <span>EXTRACT DETAILS</span>
                    </button>
                )}

                {/* VACANCIES_EXTRACTED -> RUN LLM EVAL (D2) */}
                {state.status === AgentStatus.VACANCIES_EXTRACTED && onRunLLMEvalBatch && (
                    <button onClick={onRunLLMEvalBatch} className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-yellow-900/20">
                        <Award size={18} />
                        <span>RUN LLM EVALUATION</span>
                    </button>
                )}

                {/* EVALUATION_DONE -> BUILD APPLY QUEUE (D2.2) */}
                {state.status === AgentStatus.EVALUATION_DONE && onBuildApplyQueue && (
                    <button onClick={onBuildApplyQueue} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-green-900/20">
                        <List size={18} />
                        <span>PREPARE APPLY QUEUE</span>
                    </button>
                )}

                {/* APPLY_QUEUE_READY -> PROBE NEXT ENTRYPOINT (E1.1) */}
                {(state.status === AgentStatus.APPLY_QUEUE_READY || state.status === AgentStatus.APPLY_BUTTON_FOUND) && onProbeApplyEntrypoint && (
                    <button onClick={onProbeApplyEntrypoint} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20">
                        <MousePointerClick size={18} />
                        <span>PROBE APPLY ENTRYPOINT</span>
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