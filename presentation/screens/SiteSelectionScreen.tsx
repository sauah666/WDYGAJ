import React from 'react';
import { Globe, ArrowRight } from 'lucide-react';
import { Layout } from '../components/Layout';

interface Props {
  onSelect: (site: string) => void;
  onBack: () => void;
}

export const SiteSelectionScreen: React.FC<Props> = ({ onSelect, onBack }) => {
  return (
    <Layout title="Select Target Platform" currentStep={1}>
      <div className="max-w-4xl mx-auto mt-10">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-white mb-6">
          &larr; Back to Modes
        </button>
        
        <div className="space-y-4">
          <button 
            onClick={() => onSelect('hh.ru')}
            className="w-full flex items-center justify-between p-6 rounded-xl bg-gray-800 border border-gray-700 hover:border-red-500 transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xl">
                hh
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">HeadHunter (hh.ru)</h3>
                <p className="text-sm text-gray-400">Primary CIS job aggregation platform.</p>
              </div>
            </div>
            <ArrowRight className="text-gray-600 group-hover:text-red-500 transition-colors" />
          </button>

           <div className="w-full flex items-center justify-between p-6 rounded-xl bg-gray-800/40 border border-gray-800 cursor-not-allowed opacity-50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                in
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-400">LinkedIn</h3>
                <p className="text-sm text-gray-500">International professional network.</p>
              </div>
            </div>
            <span className="text-xs text-gray-600 border border-gray-700 px-2 py-1 rounded">LOCKED</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};