import React from 'react';
import { Save, FileText } from 'lucide-react';
import { Layout } from '../components/Layout';
import { AgentConfig } from '../../types';

interface Props {
  config: Partial<AgentConfig>;
  onChange: (key: keyof AgentConfig, value: any) => void;
  onSave: () => void;
}

export const SettingsScreen: React.FC<Props> = ({ config, onChange, onSave }) => {
  return (
    <Layout title="Agent Configuration" currentStep={3}>
      <div className="max-w-3xl mx-auto mt-6 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
           <h3 className="text-lg font-medium text-white">Search Parameters</h3>
           <p className="text-sm text-gray-400">Configure filters and templates before running.</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Stub Inputs for Search Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">Job Title</label>
              <input disabled type="text" placeholder="Frontend Engineer" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed" />
            </div>
             <div>
              <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">Location</label>
              <input disabled type="text" placeholder="Remote / Moscow" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed" />
            </div>
          </div>

          <div>
             <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">LLM Model</label>
             <select disabled className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed">
               <option>Gemini 2.0 Flash (Default)</option>
             </select>
          </div>

          <div className="border-t border-gray-700 pt-6">
             <div className="flex items-center text-blue-400 mb-4">
               <FileText size={18} className="mr-2" />
               <span className="font-bold text-sm">Cover Letter Template</span>
             </div>
             <label className="block text-xs font-mono text-gray-500 mb-2">
                Use this text to auto-fill application forms. If empty, a default generic text will be used.
             </label>
             <textarea 
               value={config.coverLetterTemplate || ''}
               onChange={(e) => onChange('coverLetterTemplate', e.target.value)}
               className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y"
               placeholder="Здравствуйте! Меня заинтересовала ваша вакансия..."
             />
          </div>
        </div>

        <div className="p-6 bg-gray-850 border-t border-gray-700 flex justify-end">
          <button 
            onClick={onSave}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors font-medium"
          >
            <Save size={18} />
            <span>Confirm Configuration</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};