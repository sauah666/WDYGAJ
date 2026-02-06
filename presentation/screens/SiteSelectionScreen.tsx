import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, Lock, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AppRoute } from '../../types';

interface Props {
  onSelect: (site: string) => void;
  onBack: () => void;
  onSettingsClick?: () => void;
  onNavigate?: (route: string) => void;
}

export const SiteSelectionScreen: React.FC<Props> = ({ onSelect, onBack, onSettingsClick, onNavigate }) => {
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPanel(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
                        Выбор Цели
                    </h2>
                    <div className="w-8"></div>
                </div>

                {/* 2. CONTENT */}
                <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar relative z-10 flex flex-col gap-6">
                    
                    <div className="text-center mb-4">
                        <p className="text-[#8c7b70] font-mono text-sm">Выберите платформу для сканирования вакансий.</p>
                    </div>

                    {/* hh.ru */}
                    <button 
                        onClick={() => onSelect('hh.ru')}
                        className="relative group w-full bg-[#140c08] border-2 border-[#3e2f26] hover:border-[#d97706] rounded-2xl p-6 transition-all duration-300 shadow-[inset_0_2px_5px_black] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-[#2a1a0f] border border-[#d97706]/30 flex items-center justify-center group-hover:border-[#d97706] group-hover:bg-[#451a03] transition-colors">
                                    <span className="font-serif font-bold text-xl text-[#d97706]">hh</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-[#e7e5e4] font-bold text-lg group-hover:text-[#fbbf24] transition-colors">HeadHunter</h3>
                                    <div className="flex items-center text-[#78716c] text-xs font-mono mt-1">
                                        <Radio size={10} className="mr-1 text-green-500 animate-pulse" />
                                        СИГНАЛ СТАБИЛЬНЫЙ
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="text-[#57534e] group-hover:text-[#d97706] transition-transform group-hover:translate-x-1" />
                        </div>
                    </button>

                    {/* Locked */}
                    <div className="relative w-full bg-[#140c08] border-2 border-[#292524] rounded-2xl p-6 opacity-60 grayscale cursor-not-allowed">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-[#1c1917] border border-[#292524] flex items-center justify-center">
                                    <span className="font-serif font-bold text-xl text-[#57534e]">in</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-[#a8a29e] font-bold text-lg">LinkedIn</h3>
                                    <div className="flex items-center text-[#57534e] text-xs font-mono mt-1">
                                        <Lock size={10} className="mr-1" />
                                        НЕТ ДОСТУПА
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Hazard Pattern */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.5)_10px,rgba(0,0,0,0.5)_20px)] rounded-2xl pointer-events-none"></div>
                    </div>

                </div>

                {/* Footer Deco */}
                <div className="absolute -bottom-2 left-8 right-8 h-2 bg-[#1a120e] border-l border-r border-b border-[#3a2d25] rounded-b-xl shadow-lg"></div>
            </div>
        </div>
      </div>
    </Layout>
  );
};