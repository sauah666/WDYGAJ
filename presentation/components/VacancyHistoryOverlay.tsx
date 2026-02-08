
import React, { useState } from 'react';
import { X, ExternalLink, ChevronDown, Trash2, BatteryWarning, Cpu } from 'lucide-react';
import { AppliedVacancyRecord, TokenLedger } from '../../core/domain/entities';

interface Props {
    title: string;
    items: AppliedVacancyRecord[];
    onClose: () => void;
    onClear?: () => void;
    onReset?: () => void; // Reset Agent context
    onVisit?: (url: string) => void;
    mode: 'RUN_SUMMARY' | 'ARCHIVE';
    tokenLedger?: TokenLedger;
}

export const VacancyHistoryOverlay: React.FC<Props> = ({ 
    title, 
    items, 
    onClose, 
    onClear, 
    onReset, 
    onVisit,
    mode,
    tokenLedger
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-switch-on">
            <div className="w-full max-w-4xl h-[90%] bg-[#1a120e] border-[3px] border-[#4a3b32] shadow-[0_0_50px_black] rounded-2xl flex flex-col overflow-hidden relative">
                
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#d97706] rounded-tl-xl pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#d97706] rounded-tr-xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#d97706] rounded-bl-xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#d97706] rounded-br-xl pointer-events-none"></div>

                {/* Header */}
                <div className="shrink-0 h-20 bg-[#0c0a08] border-b border-[#3a2d25] flex items-center justify-between px-8">
                    <div>
                        <h2 className="text-2xl font-bold text-[#fcd34d] tracking-widest uppercase font-sans">
                            {title}
                        </h2>
                        <div className="text-[#78716c] text-xs font-mono mt-1">
                            {items.length} записей
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {onClear && items.length > 0 && (
                            <button 
                                onClick={onClear}
                                className="p-2 text-red-900 hover:text-red-500 transition-colors rounded-full hover:bg-[#291810]"
                                title="Очистить архив"
                            >
                                <Trash2 size={24} />
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-[#2a1a0f] rounded-full text-[#78716c] hover:text-[#d97706] transition-colors"
                        >
                            <X size={32} />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0a0503]">
                    {items.length === 0 ? (
                        <div className="text-center text-[#57534e] mt-20 font-mono">
                            {mode === 'ARCHIVE' ? 'Архив пуст.' : 'Нет обработанных вакансий.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item, idx) => {
                                const isExpanded = expandedId === item.id;
                                const isApplied = item.status === 'APPLIED';
                                
                                return (
                                    <div 
                                        key={item.id + idx} 
                                        className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                                            isApplied 
                                                ? 'border-green-900/50 bg-green-950/10 hover:border-green-700' 
                                                : 'border-[#292524] bg-[#140c08] hover:border-[#44403c]'
                                        }`}
                                    >
                                        {/* Row Header */}
                                        <div 
                                            onClick={() => toggleExpand(item.id)}
                                            className="p-4 flex justify-between items-center cursor-pointer"
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <span 
                                                        className="font-bold text-[#e7e5e4] text-lg font-sans truncate hover:text-[#fbbf24] hover:underline transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Don't collapse
                                                            if(onVisit) onVisit(item.url || '');
                                                        }}
                                                        title="Перейти к вакансии"
                                                    >
                                                        {item.title}
                                                    </span>
                                                    {onVisit && (
                                                        <ExternalLink size={14} className="text-[#57534e]" />
                                                    )}
                                                </div>
                                                <div className="text-[#a8a29e] text-sm truncate">{item.company}</div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider ${
                                                    isApplied ? 'bg-green-900/30 text-green-500' : 'bg-[#292524] text-[#78716c]'
                                                }`}>
                                                    {isApplied ? 'Отправлено' : 'Пропуск'}
                                                </div>
                                                <ChevronDown 
                                                    size={20} 
                                                    className={`text-[#57534e] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                                                />
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 animate-switch-on">
                                                <div className="pt-4 border-t border-[#ffffff10]">
                                                    <div className="text-[10px] font-bold text-[#57534e] uppercase tracking-widest mb-2">
                                                        Комментарий Агента
                                                    </div>
                                                    <p className="text-[#a8a29e] font-mono text-sm leading-relaxed">
                                                        {item.reason}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RESOURCE REPORT */}
                {mode === 'RUN_SUMMARY' && tokenLedger && (
                    <div className="shrink-0 p-4 bg-[#140c08] border-t border-[#3a2d25] text-xs font-mono text-[#78716c] grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                            <span className="uppercase text-[#57534e] mb-1">Токены (Вход)</span>
                            <span className="text-[#d97706] font-bold text-lg">{tokenLedger.inputTokens}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="uppercase text-[#57534e] mb-1">Токены (Выход)</span>
                            <span className="text-[#d97706] font-bold text-lg">{tokenLedger.outputTokens}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="uppercase text-[#57534e] mb-1">Вызовы LLM</span>
                            <span className="text-[#e7e5e4] font-bold text-lg">{tokenLedger.calls}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="uppercase text-[#57534e] mb-1">Кеш (Hit/Miss)</span>
                            <span className="text-[#e7e5e4] font-bold text-lg">{tokenLedger.cacheHits} / {tokenLedger.cacheMisses}</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {mode === 'RUN_SUMMARY' && onReset && (
                    <div className="shrink-0 p-6 bg-[#0c0a08] border-t border-[#3a2d25] flex justify-between items-center">
                        <div className="text-[#78350f] text-xs font-mono flex items-center gap-2 animate-pulse">
                            <BatteryWarning size={16} />
                            <span>ENERGY CRITICAL. REBOOT REQUIRED.</span>
                        </div>
                        <button 
                            onClick={onReset} 
                            className="px-8 py-3 bg-[#2a1a0f] hover:bg-[#451a03] text-[#d97706] border border-[#4a3b32] rounded-xl font-bold uppercase tracking-wider transition-all shadow-[0_5px_15px_rgba(0,0,0,0.5)] active:translate-y-1"
                        >
                            Сбросить Систему
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
