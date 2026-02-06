
import React from 'react';
import { Globe, ArrowRight, Lock, Radio } from 'lucide-react';
import { Layout } from '../components/Layout';

interface Props {
  onSelect: (site: string) => void;
  onBack: () => void;
  onSettingsClick?: () => void;
  onNavigate?: (route: string) => void;
}

export const SiteSelectionScreen: React.FC<Props> = ({ onSelect, onBack, onSettingsClick, onNavigate }) => {
  return (
    <Layout title="Target Coordinates" onSettingsClick={onSettingsClick} onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto mt-8">
        <button onClick={onBack} className="text-sm font-mono text-[#a8a29e] hover:text-amber-500 mb-8 flex items-center transition-colors uppercase tracking-widest">
          <ArrowRight className="rotate-180 mr-2" size={14} />
          Abort Sequence
        </button>
        
        <div className="space-y-6">
          <div className="border-l-2 border-amber-900/50 pl-4 mb-6">
             <h4 className="text-amber-700 font-bold uppercase text-xs tracking-widest mb-1">Select Frequency</h4>
             <p className="text-[#57534e] text-sm">Establish connection with external job aggregation mainframe.</p>
          </div>

          <button 
            onClick={() => onSelect('hh.ru')}
            className="w-full relative group overflow-hidden"
          >
            {/* Background Plate */}
            <div className="absolute inset-0 bg-[#1c1917] border-2 border-[#44403c] group-hover:border-red-700/50 transition-colors z-0"></div>
            
            <div className="relative z-10 flex items-center justify-between p-8">
                <div className="flex items-center space-x-8">
                    {/* Toggle Switch Visual */}
                    <div className="w-20 h-20 rounded-full bg-[#0c0a08] border-4 border-[#292524] flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,1)] group-hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all">
                        <span className="font-serif font-bold text-3xl text-red-700 group-hover:text-red-500 group-hover:drop-shadow-[0_0_5px_rgba(220,38,38,0.8)] transition-all">hh</span>
                    </div>
                    
                    <div className="text-left">
                        <h3 className="text-2xl font-serif font-bold text-[#e7e5e4] group-hover:text-red-400 transition-colors uppercase">HeadHunter Protocol</h3>
                        <div className="flex items-center mt-2 text-[#78716c] font-mono text-xs">
                            <Radio size={12} className="mr-2 animate-pulse" />
                            <span>SIGNAL STRONG</span>
                        </div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="h-12 w-12 border-2 border-[#292524] bg-[#0c0a08] flex items-center justify-center group-hover:border-red-900 group-hover:text-red-500 transition-all">
                    <ArrowRight size={24} />
                </div>
            </div>
            
            {/* Hover Scanline */}
            <div className="absolute top-0 bottom-0 w-1 bg-red-500/20 left-0 group-hover:left-full transition-all duration-1000 ease-in-out"></div>
          </button>

           <div className="w-full relative opacity-50 grayscale cursor-not-allowed">
             <div className="absolute inset-0 bg-[#151413] border-2 border-[#292524] z-0"></div>
             <div className="relative z-10 flex items-center justify-between p-8">
                <div className="flex items-center space-x-8">
                    <div className="w-20 h-20 rounded-full bg-[#0c0a08] border-4 border-[#292524] flex items-center justify-center">
                        <span className="font-serif font-bold text-3xl text-[#292524]">in</span>
                    </div>
                    <div className="text-left">
                        <h3 className="text-2xl font-serif font-bold text-[#44403c] uppercase">LinkedIn Protocol</h3>
                        <div className="flex items-center mt-2 text-[#44403c] font-mono text-xs">
                            <Lock size={12} className="mr-2" />
                            <span>ENCRYPTED / NO KEY</span>
                        </div>
                    </div>
                </div>
             </div>
             {/* Hazard Stripes */}
             <div className="absolute bottom-0 left-0 w-full h-2 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#333_10px,#333_20px)]"></div>
          </div>

        </div>
      </div>
    </Layout>
  );
};
