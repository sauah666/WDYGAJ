import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentConfig, WorkMode } from '../../types';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (key: keyof AgentConfig, value: any) => void;
  onRun: () => void;
  onBack?: () => void;
  onSettingsClick: () => void;
  onNavigate?: (route: string) => void;
}

export const JobPreferencesScreen: React.FC<Props> = ({ config, onChange, onRun, onBack, onSettingsClick, onNavigate }) => {
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
      const timer = setTimeout(() => setShowPanel(true), 100);
      if (!config.targetWorkModes || config.targetWorkModes.length === 0) {
          onChange('targetWorkModes', [WorkMode.REMOTE]);
      }
      return () => clearTimeout(timer);
  }, []);

  const currentModes = config.targetWorkModes || [];

  const toggleMode = (mode: WorkMode) => {
      if (currentModes.includes(mode)) {
          if (currentModes.length > 1) {
              onChange('targetWorkModes', currentModes.filter(m => m !== mode));
          }
      } else {
          onChange('targetWorkModes', [...currentModes, mode]);
      }
  };

  const getModeLabel = (mode: WorkMode) => {
      switch(mode) {
          case WorkMode.REMOTE: return 'Удаленно';
          case WorkMode.HYBRID: return 'Гибрид';
          case WorkMode.OFFICE: return 'Офис';
          default: return mode;
      }
  };

  return (
    <Layout title="" hideSidebar={true} onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <style>{`
        @keyframes switchOn {
            0% { opacity: 0; filter: brightness(0) blur(2px); }
            100% { opacity: 1; filter: brightness(1); }
        }
        .animate-switch-on {
            animation: switchOn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="flex flex-col items-center justify-center h-full w-full relative pt-0 pb-0 overflow-hidden bg-[#0a0503]">
        
        {/* --- MAIN PANEL --- */}
        <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none`}>
            <div 
                className={`relative w-[98%] h-[98%] md:w-[600px] md:h-auto md:max-h-[95vh] bg-[#2a2420] border-[3px] border-[#4a3b32] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-xl md:rounded-3xl overflow-hidden flex flex-col font-serif ${showPanel ? 'pointer-events-auto animate-switch-on' : 'opacity-0'}`}
                style={{ 
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-leather.png')`,
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,1)'
                }}
            >
                {/* 1. HEADER */}
                <div className="shrink-0 relative h-14 bg-[#1a120e] border-b-4 border-[#3a2d25] flex items-center justify-between px-4 shadow-md z-30">
                    <button onClick={onBack} className="text-[#78716c] hover:text-[#d97706] transition-colors p-2 rounded-full hover:bg-[#2a2018]">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="relative z-10 font-serif font-bold text-xl text-[#cdbba7] tracking-widest uppercase text-shadow-md">
                        Параметры
                    </h2>
                    <div className="w-8"></div>
                </div>

                {/* 2. CONTENT */}
                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar relative z-10 flex flex-col gap-6">
                    
                    {/* Salary & Currency */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Вознаграждение</label>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                value={config.minSalary || ''}
                                onChange={(e) => onChange('minSalary', parseInt(e.target.value))}
                                placeholder="0"
                                className="flex-1 h-14 bg-[#140c08] border-2 border-[#3e2f26] rounded-2xl px-4 text-[#e7e5e4] font-mono text-xl outline-none focus:border-[#d97706] shadow-inner"
                            />
                            <div className="flex bg-[#140c08] rounded-2xl border-2 border-[#3e2f26] overflow-hidden shrink-0">
                                {['RUB', 'USD', 'EUR'].map(curr => (
                                    <button 
                                        key={curr}
                                        onClick={() => onChange('currency', curr)}
                                        className={`px-3 font-bold font-serif text-sm transition-colors ${config.currency === curr ? 'bg-[#d97706] text-[#1a0f0a]' : 'text-[#78716c] hover:bg-[#2a1a0f]'}`}
                                    >
                                        {curr}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Локация</label>
                        <input 
                            type="text" 
                            value={config.city || ''}
                            onChange={(e) => onChange('city', e.target.value)}
                            placeholder="Весь Мир (Global)"
                            className="w-full h-14 bg-[#140c08] border-2 border-[#3e2f26] rounded-2xl px-4 text-[#e7e5e4] font-mono text-base outline-none focus:border-[#d97706] shadow-inner placeholder-[#44403c]"
                        />
                    </div>

                    {/* Work Mode */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Режим</label>
                        <div className="flex flex-col gap-2">
                            {[WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.OFFICE].map((mode) => {
                                const active = currentModes.includes(mode);
                                return (
                                    <button 
                                        key={mode}
                                        onClick={() => toggleMode(mode)}
                                        className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl transition-all ${active ? 'bg-[#2a1a0f] border-[#d97706]' : 'bg-[#140c08] border-[#3e2f26]'}`}
                                    >
                                        <span className={`font-serif font-bold tracking-wide ${active ? 'text-[#d97706]' : 'text-[#57534e]'}`}>
                                            {getModeLabel(mode)}
                                        </span>
                                        {active ? <CheckCircle2 size={20} className="text-[#d97706]" /> : <Circle size={20} className="text-[#3e2f26]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cover Letter */}
                    <div className="flex flex-col gap-2 flex-1 min-h-[150px]">
                        <label className="text-xs text-[#78685f] font-bold uppercase tracking-wider font-serif ml-1">Сопроводительное Письмо</label>
                        <textarea 
                            value={config.coverLetterTemplate || ''}
                            onChange={(e) => onChange('coverLetterTemplate', e.target.value)}
                            className="w-full h-full min-h-[150px] bg-[#140c08] border-2 border-[#3e2f26] rounded-2xl p-4 text-[#e7e5e4] font-mono text-sm outline-none focus:border-[#d97706] shadow-inner resize-none custom-scrollbar"
                            placeholder="Здравствуйте! Меня заинтересовала вакансия..."
                        />
                    </div>

                </div>

                {/* 3. FOOTER */}
                <div className="shrink-0 relative p-6 bg-[#1a120e] border-t-2 border-[#3a2d25] shadow-inner z-30">
                    <button 
                        onClick={onRun}
                        className="w-full relative h-16 bg-gradient-to-b from-[#6b350f] to-[#451a03] border border-[#78350f] shadow-[0_5px_10px_black] active:shadow-none active:translate-y-1 transition-all group overflow-hidden rounded-2xl flex items-center justify-center gap-3"
                    >
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay"></div>
                         <span className="relative z-10 font-serif font-black text-xl text-[#fcd34d] tracking-[0.15em] uppercase drop-shadow-md">
                             Подтвердить
                         </span>
                         <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20"></div>
                    </button>
                </div>

                <div className="absolute -bottom-2 left-8 right-8 h-2 bg-[#1a120e] border-l border-r border-b border-[#3a2d25] rounded-b-xl shadow-lg"></div>
            </div>
        </div>
      </div>
    </Layout>
  );
};