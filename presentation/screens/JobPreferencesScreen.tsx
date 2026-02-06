
import React, { useEffect } from 'react';
import { Play, FileText, DollarSign, MapPin, Briefcase, CheckSquare, Square, ChevronRight, ArrowRight, PenTool } from 'lucide-react';
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

  return (
    <Layout title="Mission Parameters" onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="max-w-5xl mx-auto mt-6">
        
        <button onClick={onBack} className="text-sm font-mono text-[#a8a29e] hover:text-amber-500 mb-6 flex items-center transition-colors uppercase tracking-widest">
          <ArrowRight className="rotate-180 mr-2" size={14} />
          Return to Coordinates
        </button>

        <div className="bg-[#1c1917] border-4 border-[#292524] shadow-2xl relative">
            <div className="p-8 border-b-2 border-[#292524] bg-[#151413]">
                <h3 className="text-xl font-serif font-bold text-[#e7e5e4] flex items-center gap-3">
                    <span className="w-2 h-2 bg-amber-600 rotate-45"></span>
                    Search Criteria
                </h3>
            </div>
            
            <div className="p-8 space-y-12 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-90">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    
                    {/* Salary */}
                    <div>
                        <label className="flex items-center text-xs font-bold text-amber-700 mb-4 uppercase tracking-wider font-mono border-b border-amber-900/20 pb-1">
                            <DollarSign size={14} className="mr-2" />
                            Minimum Compensation
                        </label>
                        <div className="flex space-x-0 relative">
                            {/* Input styled as old counter */}
                            <input 
                                type="number" 
                                value={config.minSalary || ''}
                                onChange={(e) => onChange('minSalary', parseInt(e.target.value))}
                                placeholder="000000"
                                className="flex-1 bg-[#0c0a08] border-2 border-[#44403c] px-6 py-4 text-amber-500 focus:border-amber-600 outline-none text-2xl font-mono shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)] tracking-widest"
                            />
                            <div className="w-24 bg-[#292524] border-t-2 border-b-2 border-r-2 border-[#44403c] flex items-center justify-center">
                                <select 
                                    value={config.currency || 'RUB'}
                                    onChange={(e) => onChange('currency', e.target.value)}
                                    className="bg-transparent text-[#a8a29e] font-bold outline-none appearance-none uppercase text-sm"
                                >
                                    <option value="RUB">RUB</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Work Mode */}
                    <div>
                        <label className="flex items-center text-xs font-bold text-amber-700 mb-4 uppercase tracking-wider font-mono border-b border-amber-900/20 pb-1">
                            <Briefcase size={14} className="mr-2" />
                            Deployment Type
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            {[WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.OFFICE].map((mode) => (
                                <button 
                                key={mode}
                                onClick={() => toggleMode(mode)}
                                className={`border-2 p-4 flex flex-col items-center justify-center transition-all duration-200 active:translate-y-1 relative 
                                ${currentModes.includes(mode) 
                                    ? 'bg-[#292524] border-amber-600 text-amber-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)]' 
                                    : 'bg-[#1c1917] border-[#44403c] text-[#57534e] hover:border-[#57534e]'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full mb-2 border ${currentModes.includes(mode) ? 'bg-amber-500 border-amber-300 shadow-[0_0_8px_orange]' : 'bg-[#0c0a08] border-[#44403c]'}`}></div>
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{mode}</span>
                                    {/* Screw heads */}
                                    <div className="absolute top-1 left-1 w-1 h-1 bg-[#44403c] rounded-full"></div>
                                    <div className="absolute top-1 right-1 w-1 h-1 bg-[#44403c] rounded-full"></div>
                                    <div className="absolute bottom-1 left-1 w-1 h-1 bg-[#44403c] rounded-full"></div>
                                    <div className="absolute bottom-1 right-1 w-1 h-1 bg-[#44403c] rounded-full"></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="flex items-center text-xs font-bold text-amber-700 mb-4 uppercase tracking-wider font-mono border-b border-amber-900/20 pb-1">
                        <MapPin size={14} className={`mr-2 ${isCityRequired ? 'text-red-700' : 'text-[#78716c]'}`} />
                        Target Sector (City)
                        {!isCityRequired && <span className="ml-2 text-[9px] text-[#57534e] border border-[#44403c] px-1 bg-[#0c0a08]">OPTIONAL</span>}
                    </label>
                    <input 
                        type="text" 
                        value={config.city || ''}
                        onChange={(e) => onChange('city', e.target.value)}
                        placeholder={isCityRequired ? "REQUIRED" : "GLOBAL"}
                        disabled={!isCityRequired && !config.city} 
                        className={`w-full bg-[#0c0a08] border-2 px-6 py-4 text-amber-100 focus:border-amber-600 outline-none font-mono tracking-wide shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)] ${!isCityRequired ? 'border-[#292524] text-[#57534e]' : 'border-[#44403c]'}`}
                    />
                </div>

                {/* Cover Letter */}
                <div>
                    <label className="flex items-center text-xs font-bold text-amber-700 mb-4 uppercase tracking-wider font-mono border-b border-amber-900/20 pb-1">
                        <PenTool size={14} className="mr-2" />
                        Transmission Protocol (Cover Letter)
                    </label>
                    <div className="relative p-2 bg-[#292524] border-2 border-[#44403c] rounded-sm">
                        <textarea 
                        value={config.coverLetterTemplate || ''}
                        onChange={(e) => onChange('coverLetterTemplate', e.target.value)}
                        className="w-full h-48 bg-[#e7e5e4] text-[#292524] p-4 outline-none font-mono text-sm leading-relaxed border-none shadow-inner"
                        placeholder="Initiating communication sequence..."
                        style={{ fontFamily: '"Courier New", Courier, monospace' }}
                        />
                        {/* Paper clip effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#78716c] rounded-full z-10 border-4 border-[#1c1917]"></div>
                    </div>
                </div>

            </div>

            {/* Launch Lever */}
            <div className="p-8 bg-[#151413] border-t-2 border-[#292524] flex justify-end">
                <button 
                    onClick={onRun}
                    className="group relative flex items-center gap-4 bg-gradient-to-b from-green-800 to-green-900 text-green-100 px-12 py-4 font-bold text-lg shadow-[0_5px_0_#14532d] active:translate-y-[5px] active:shadow-none transition-all border-2 border-green-950 uppercase tracking-widest overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <Play size={24} fill="currentColor" className="relative z-10 drop-shadow-md" />
                    <span className="relative z-10 drop-shadow-md">Ignite Engine</span>
                </button>
            </div>
        </div>
      </div>
    </Layout>
  );
};
