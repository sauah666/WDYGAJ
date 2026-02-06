import React, { useEffect } from 'react';
import { DollarSign, MapPin, Briefcase, PenTool, ArrowLeft, Globe, CheckCircle2, Circle } from 'lucide-react';
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
  
  useEffect(() => {
      if (!config.targetWorkModes || config.targetWorkModes.length === 0) {
          onChange('targetWorkModes', [WorkMode.REMOTE]);
      }
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

  const isCityRequired = currentModes.some(m => m === WorkMode.OFFICE || m === WorkMode.HYBRID || m === WorkMode.ANY);

  // Translation Helper
  const getModeLabel = (mode: WorkMode) => {
      switch(mode) {
          case WorkMode.REMOTE: return 'Удаленно';
          case WorkMode.HYBRID: return 'Гибрид';
          case WorkMode.OFFICE: return 'Офис';
          case WorkMode.ANY: return 'Любой';
          default: return mode;
      }
  };

  return (
    <Layout title="Ордер на Поиск" onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="max-w-5xl mx-auto pb-20 pt-4">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-6 px-4">
            <button onClick={onBack} className="text-lg font-cursive text-[#a8a29e] hover:text-[#d97706] flex items-center transition-colors group">
                <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={24} />
                <span className="border-b border-transparent group-hover:border-[#d97706]">Отмена</span>
            </button>
            <div className="text-[#57534e] font-mono text-xs uppercase tracking-widest">
                Ордер № {Math.floor(Math.random() * 9000) + 1000}-RU
            </div>
        </div>

        {/* POSTER CONTAINER */}
        <div className="relative w-full bg-[#e8e0cc] shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden rounded-sm border border-[#a8a29e] transform rotate-1 transition-transform duration-700 hover:rotate-0">
            
            {/* Texture Overlays */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-80 pointer-events-none mix-blend-multiply z-0"></div>
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(69,26,3,0.15)] pointer-events-none z-10"></div>
            
            {/* Content Wrapper */}
            <div className="relative z-20 flex flex-col">
                
                {/* --- HEADER: WANTED --- */}
                <div className="pt-12 pb-8 text-center border-b-[4px] border-double border-[#451a03] mx-6 md:mx-12">
                    <h1 className="font-serif font-black text-7xl md:text-9xl text-[#451a03] tracking-widest leading-[0.8] mb-4 scale-y-110 drop-shadow-sm font-ruslan">
                        WANTED
                    </h1>
                    <div className="flex items-center justify-center gap-4 md:gap-8">
                        <div className="h-[2px] flex-1 max-w-[100px] bg-[#78350f]"></div>
                        <span className="font-serif text-2xl md:text-4xl text-[#b91c1c] font-bold tracking-[0.2em] uppercase transform -rotate-1">
                            Вакансия Века
                        </span>
                        <div className="h-[2px] flex-1 max-w-[100px] bg-[#78350f]"></div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row">
                    
                    {/* --- LEFT COLUMN: CRITICAL SPECS --- */}
                    <div className="w-full md:w-1/2 p-8 md:p-12 border-b md:border-b-0 md:border-r border-[#a8a29e] bg-[#dfd7c3]/30">
                        
                        {/* 1. REWARD */}
                        <div className="mb-12">
                             <label className="block text-center font-serif text-[#451a03] text-xl font-bold uppercase tracking-widest mb-6 border-b border-[#451a03]/30 pb-2">
                                Вознаграждение
                            </label>
                            
                            <div className="relative flex justify-center items-baseline gap-1">
                                <span className="text-4xl md:text-5xl font-serif text-[#78350f] font-bold mr-2">
                                    {config.currency === 'USD' ? '$' : config.currency === 'EUR' ? '€' : '₽'}
                                </span>
                                <input 
                                    type="number" 
                                    value={config.minSalary || ''}
                                    onChange={(e) => onChange('minSalary', parseInt(e.target.value))}
                                    placeholder="0"
                                    className="bg-transparent text-center text-6xl md:text-7xl font-serif font-bold text-[#451a03] w-full outline-none placeholder-[#cbbfa5] drop-shadow-sm"
                                    style={{ fontFamily: 'Ruslan Display' }}
                                />
                            </div>
                            
                            {/* Currency Toggles */}
                            <div className="flex justify-center gap-4 mt-4">
                                {['RUB', 'USD', 'EUR'].map(curr => (
                                    <button 
                                        key={curr}
                                        onClick={() => onChange('currency', curr)}
                                        className={`text-xs font-bold font-serif px-3 py-1 border ${config.currency === curr ? 'bg-[#451a03] text-[#fbbf24] border-[#451a03]' : 'text-[#78350f] border-[#78350f] hover:bg-[#78350f]/10'}`}
                                    >
                                        {curr}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. MODES */}
                        <div>
                            <label className="block text-center font-serif text-[#451a03] text-xl font-bold uppercase tracking-widest mb-6 border-b border-[#451a03]/30 pb-2">
                                Режим Работы
                            </label>
                            <div className="flex flex-col gap-3">
                                {[WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.OFFICE].map((mode) => {
                                    const active = currentModes.includes(mode);
                                    return (
                                        <button 
                                            key={mode}
                                            onClick={() => toggleMode(mode)}
                                            className={`relative w-full flex items-center justify-between px-6 py-4 border-2 transition-all duration-200 group
                                            ${active 
                                                ? 'bg-[#451a03] border-[#451a03] shadow-[4px_4px_0px_rgba(0,0,0,0.2)] transform -translate-y-1' 
                                                : 'bg-transparent border-[#78350f] hover:bg-[#78350f]/5'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {active 
                                                    ? <CheckCircle2 className="text-[#fbbf24]" size={24} />
                                                    : <Circle className="text-[#78350f]" size={24} />
                                                }
                                                <span className={`text-xl font-serif font-bold tracking-wide ${active ? 'text-[#e7e5e4]' : 'text-[#451a03]'}`}>
                                                    {getModeLabel(mode)}
                                                </span>
                                            </div>
                                            
                                            {/* Decorative rivets */}
                                            <div className={`w-2 h-2 rounded-full ${active ? 'bg-[#fbbf24]' : 'bg-[#78350f]'}`}></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* --- RIGHT COLUMN: LOCATION & DETAILS --- */}
                    <div className="w-full md:w-1/2 p-8 md:p-12">
                        
                        {/* 3. CITY */}
                        <div className="mb-12 relative">
                            <label className="block text-center font-serif text-[#451a03] text-xl font-bold uppercase tracking-widest mb-6 border-b border-[#451a03]/30 pb-2">
                                Территория
                            </label>
                            
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={config.city || ''}
                                    onChange={(e) => onChange('city', e.target.value)}
                                    placeholder={isCityRequired ? "Укажите Город" : "Весь Мир"}
                                    disabled={!isCityRequired && !config.city} 
                                    className={`w-full bg-[#f0eadd] border-2 p-4 text-center text-2xl font-cursive font-bold text-[#451a03] outline-none transition-all placeholder-[#a8a29e] shadow-inner
                                    ${!isCityRequired ? 'border-[#a8a29e] opacity-80' : 'border-[#b91c1c] bg-white'}`}
                                />
                                
                                {!isCityRequired && !config.city && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-12 border-4 border-[#15803d] text-[#15803d] px-4 py-1 text-2xl font-black font-serif uppercase tracking-widest opacity-80 pointer-events-none mix-blend-multiply">
                                        GLOBAL
                                    </div>
                                )}
                            </div>
                            <div className="text-center mt-2 text-xs font-mono text-[#78716c]">
                                {isCityRequired ? "* Присутствие обязательно" : "* Локация не критична"}
                            </div>
                        </div>

                        {/* 4. COVER LETTER */}
                        <div className="h-full flex flex-col">
                            <label className="block text-center font-serif text-[#451a03] text-xl font-bold uppercase tracking-widest mb-4 border-b border-[#451a03]/30 pb-2">
                                Особые Приметы
                            </label>
                            
                            <div className="flex-1 bg-[#fffaf0] border border-[#d6d3d1] p-6 shadow-sm relative rotate-1">
                                {/* Lines */}
                                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_29px,#a8a29e_30px)] opacity-20 pointer-events-none top-6"></div>
                                
                                <textarea 
                                    value={config.coverLetterTemplate || ''}
                                    onChange={(e) => onChange('coverLetterTemplate', e.target.value)}
                                    className="w-full h-48 md:h-full bg-transparent text-xl font-cursive text-[#292524] leading-[30px] outline-none resize-none"
                                    placeholder="Текст сопроводительного письма..."
                                />
                                {/* Pin */}
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#b91c1c] rounded-full shadow-md border border-black/20"></div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- FOOTER: ACTION --- */}
                <button 
                    onClick={onRun}
                    className="w-full bg-[#451a03] hover:bg-[#5c2405] text-[#fbbf24] py-8 text-center relative overflow-hidden group transition-colors border-t-4 border-[#78350f]"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                    <div className="relative z-10 flex flex-col items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                        <span className="font-serif font-black text-4xl md:text-5xl uppercase tracking-[0.2em] mb-2 drop-shadow-md">
                            Начать Охоту
                        </span>
                        <span className="font-mono text-xs text-[#d6cbb4] tracking-[0.5em] uppercase">
                            Инициализировать Агента
                        </span>
                    </div>
                </button>

            </div>

            {/* Corner Bolts */}
            <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-md z-30 flex items-center justify-center"><div className="w-3 h-0.5 bg-black/30 rotate-45"></div></div>
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-md z-30 flex items-center justify-center"><div className="w-3 h-0.5 bg-black/30 rotate-45"></div></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-md z-30 flex items-center justify-center"><div className="w-3 h-0.5 bg-black/30 rotate-45"></div></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#5c3a21] to-[#291810] shadow-md z-30 flex items-center justify-center"><div className="w-3 h-0.5 bg-black/30 rotate-45"></div></div>

        </div>
      </div>
    </Layout>
  );
};