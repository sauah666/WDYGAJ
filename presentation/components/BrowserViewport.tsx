
import React, { useState } from 'react';
import { Globe, Lock, ArrowLeft, ArrowRight, RotateCw, User, LogIn } from 'lucide-react';
import { AgentStatus } from '../../types';

interface BrowserViewportProps {
  url: string;
  status: AgentStatus;
  isMock: boolean;
  onLoginSubmit: (u: string, p: string) => void;
}

export const BrowserViewport: React.FC<BrowserViewportProps> = ({ url, status, isMock, onLoginSubmit }) => {
  const [fakeUser, setFakeUser] = useState("user@example.com");
  const [fakePass, setFakePass] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onLoginSubmit(fakeUser, fakePass);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#e5e5e5] relative">
        {/* Browser Chrome - Old OS Style */}
        <div className="h-8 bg-[#d4d0c8] border-b border-[#808080] flex items-center px-2 space-x-2 select-none shadow-[inset_1px_1px_0px_white]">
            <div className="flex space-x-1">
                <div className="w-4 h-4 bg-[#d4d0c8] border-t border-l border-white border-r border-b border-black flex items-center justify-center text-[10px] active:border-t-black active:border-l-black">_</div>
                <div className="w-4 h-4 bg-[#d4d0c8] border-t border-l border-white border-r border-b border-black flex items-center justify-center text-[10px] active:border-t-black active:border-l-black">□</div>
                <div className="w-4 h-4 bg-[#d4d0c8] border-t border-l border-white border-r border-b border-black flex items-center justify-center text-[10px] font-bold text-red-800 active:border-t-black active:border-l-black">x</div>
            </div>
            <div className="h-4 w-px bg-[#808080] mx-2"></div>
            <div className="flex space-x-2 text-[#404040]">
                <ArrowLeft size={14} />
                <ArrowRight size={14} />
                <RotateCw size={14} />
            </div>
            <div className="flex-1 bg-white border border-[#808080] h-5 flex items-center px-2 text-[10px] text-black font-serif overflow-hidden shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]">
                <Lock size={8} className="mr-1 text-green-700" />
                {url}
            </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 bg-white relative overflow-auto font-serif">
            {/* REAL MODE PLACEHOLDER */}
            {!isMock && (
                <div className="flex flex-col items-center justify-center h-full text-[#404040] space-y-4 p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                    <Globe size={64} className="text-[#a0a0a0]" strokeWidth={1} />
                    <div className="bg-[#f0f0f0] p-4 border border-[#808080] shadow-md">
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Remote Uplink Established</h3>
                        <p className="text-xs font-mono">Video feed intercepted from external automaton.</p>
                        <div className="mt-4 h-1 w-full bg-[#d4d0c8] overflow-hidden">
                             <div className="h-full bg-green-600 animate-pulse w-1/3"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* MOCK MODE INTERACTIVE LOGIN */}
            {isMock && status === AgentStatus.WAITING_FOR_HUMAN && (
                <div className="flex flex-col items-center justify-center h-full w-full bg-[#f3f4f6]">
                    <div className="w-full max-w-sm p-8 bg-white border border-gray-300 shadow-xl">
                        <div className="flex justify-center mb-6 text-red-600 font-bold text-3xl font-serif">hh.ru</div>
                        <h2 className="text-lg font-bold mb-4 text-gray-800 uppercase tracking-wide border-b border-red-600 pb-2">Auth Required</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Identity</label>
                                <input 
                                    type="text" 
                                    value={fakeUser}
                                    onChange={e => setFakeUser(e.target.value)}
                                    className="mt-1 block w-full border border-gray-400 p-2 text-gray-900 focus:border-red-500 outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">Cipher</label>
                                <input 
                                    type="password" 
                                    value={fakePass}
                                    onChange={e => setFakePass(e.target.value)}
                                    className="mt-1 block w-full border border-gray-400 p-2 text-gray-900 focus:border-red-500 outline-none" 
                                />
                            </div>
                            <button type="submit" className="w-full bg-red-600 text-white py-3 font-bold hover:bg-red-700 uppercase tracking-widest shadow-md active:translate-y-px transition-all">
                                Enter System
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MOCK MODE GENERIC PAGE */}
            {isMock && status !== AgentStatus.WAITING_FOR_HUMAN && (
                <div className="p-8">
                    <div className="space-y-6 opacity-50 grayscale">
                        <div className="h-6 bg-gray-200 w-3/4"></div>
                        <div className="h-4 bg-gray-200 w-1/2"></div>
                        <div className="h-40 bg-gray-100 border border-gray-200"></div>
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-200 w-full"></div>
                            <div className="h-3 bg-gray-200 w-full"></div>
                            <div className="h-3 bg-gray-200 w-5/6"></div>
                        </div>
                    </div>
                    <div className="mt-12 text-center text-xs text-gray-400 font-mono border-t border-gray-200 pt-4 uppercase">
                        [ Simulation Data Rendered ]
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
