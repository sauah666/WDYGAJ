import React from 'react';
import { Briefcase, Search, ShieldAlert } from 'lucide-react';
import { Layout } from '../components/Layout';

interface Props {
  onSelect: (mode: string) => void;
}

export const ModeSelectionScreen: React.FC<Props> = ({ onSelect }) => {
  return (
    <Layout title="Select Operation Mode" currentStep={1}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mt-10">
        
        {/* Active Mode */}
        <button 
          onClick={() => onSelect('JOB_SEARCH')}
          className="group relative flex flex-col items-start p-6 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500 transition-all hover:bg-gray-750 text-left"
        >
          <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400 mb-4 group-hover:text-blue-300">
            <Briefcase size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Job Search Agent</h3>
          <p className="text-sm text-gray-400 mb-4">
            Autonomous vacancy scanning, filtering via LLM, and candidate matching.
          </p>
          <span className="text-xs font-mono text-blue-500 py-1 px-2 bg-blue-900/20 rounded">AVAILABLE</span>
        </button>

        {/* Placeholder Mode */}
        <div className="relative flex flex-col items-start p-6 rounded-xl bg-gray-800/50 border border-gray-800 opacity-60 cursor-not-allowed">
           <div className="p-3 bg-gray-800 rounded-lg text-gray-500 mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-400 mb-2">Market Analyzer</h3>
          <p className="text-sm text-gray-500 mb-4">
            Collects salary statistics and skill demands without applying.
          </p>
          <span className="text-xs font-mono text-gray-600 py-1 px-2 bg-gray-800 rounded">SOON</span>
        </div>

        {/* Placeholder Mode */}
        <div className="relative flex flex-col items-start p-6 rounded-xl bg-gray-800/50 border border-gray-800 opacity-60 cursor-not-allowed">
           <div className="p-3 bg-gray-800 rounded-lg text-gray-500 mb-4">
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-400 mb-2">Reputation Monitor</h3>
          <p className="text-sm text-gray-500 mb-4">
            Scans feedback sites for company reviews and red flags.
          </p>
          <span className="text-xs font-mono text-gray-600 py-1 px-2 bg-gray-800 rounded">SOON</span>
        </div>

      </div>
    </Layout>
  );
};