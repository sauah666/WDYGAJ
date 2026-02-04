import React, { ReactNode } from 'react';
import { Activity, Settings, Layout as LayoutIcon } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title: string;
  currentStep?: number;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, currentStep = 0 }) => {
  return (
    <div className="flex h-full bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 bg-gray-800 border-r border-gray-700 flex flex-col items-center md:items-stretch py-6 space-y-4">
        <div className="px-4 mb-6 flex items-center justify-center md:justify-start space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-white">AS</span>
          </div>
          <span className="hidden md:block font-bold text-lg tracking-wider">AGENT</span>
        </div>
        
        <nav className="flex-1 w-full px-2 space-y-2">
          <div className={`flex items-center p-3 rounded-lg cursor-default ${currentStep === 1 ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}>
            <LayoutIcon size={20} />
            <span className="hidden md:block ml-3">Setup</span>
          </div>
           <div className={`flex items-center p-3 rounded-lg cursor-default ${currentStep === 2 ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}>
            <Activity size={20} />
            <span className="hidden md:block ml-3">Runner</span>
          </div>
           <div className={`flex items-center p-3 rounded-lg cursor-default ${currentStep === 3 ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}>
            <Settings size={20} />
            <span className="hidden md:block ml-3">Config</span>
          </div>
        </nav>

        <div className="px-4 text-xs text-gray-500 hidden md:block">
          v0.1.0 Skeleton
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md flex items-center px-8 justify-between">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-mono text-gray-400">SYSTEM ONLINE</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
};