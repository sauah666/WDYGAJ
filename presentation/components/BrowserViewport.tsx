
import React, { useState } from 'react';
import { Globe, Lock, ArrowLeft, ArrowRight, RotateCw, User, LogIn, Search, MapPin, Briefcase, FileText, CheckCircle2 } from 'lucide-react';
import { AgentStatus } from '../../types';
import { UserSearchPrefsV1 } from '../../core/domain/entities';

interface BrowserViewportProps {
  url: string;
  status: AgentStatus;
  isMock: boolean;
  onLoginSubmit: (u: string, p: string) => void;
  activeSearchPrefs?: UserSearchPrefsV1; // Prop to show typing
}

export const BrowserViewport: React.FC<BrowserViewportProps> = ({ url, status, isMock, onLoginSubmit, activeSearchPrefs }) => {
  const [fakeUser, setFakeUser] = useState("user@example.com");
  const [fakePass, setFakePass] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onLoginSubmit(fakeUser, fakePass);
  };

  // Helper to extract values from prefs safely
  const getPrefValue = (keyMatch: string) => {
      if (!activeSearchPrefs?.additionalFilters) return "";
      const key = Object.keys(activeSearchPrefs.additionalFilters).find(k => k.toLowerCase().includes(keyMatch));
      return key ? activeSearchPrefs.additionalFilters[key] : "";
  };

  const renderMockContent = () => {
      // 1. LOGIN
      if (status === AgentStatus.WAITING_FOR_HUMAN) {
          return (
             <div className="flex flex-col items-center justify-center h-full w-full bg-[#f3f4f6]">
                <div className="w-full max-w-sm p-8 bg-white border border-gray-300 shadow-xl">
                    <div className="flex justify-center mb-6 text-red-600 font-bold text-3xl font-sans">hh.ru</div>
                    <h2 className="text-lg font-bold mb-4 text-gray-800 uppercase tracking-wide border-b border-red-600 pb-2 font-sans">Требуется Авторизация</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Идентификатор</label>
                            <input 
                                type="text" 
                                value={fakeUser}
                                onChange={e => setFakeUser(e.target.value)}
                                className="mt-1 block w-full border border-gray-400 p-2 text-gray-900 focus:border-red-500 outline-none font-mono" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Шифр</label>
                            <input 
                                type="password" 
                                value={fakePass}
                                onChange={e => setFakePass(e.target.value)}
                                className="mt-1 block w-full border border-gray-400 p-2 text-gray-900 focus:border-red-500 outline-none font-mono" 
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 text-white py-3 font-bold hover:bg-red-700 uppercase tracking-widest shadow-md active:translate-y-px transition-all font-sans">
                            Войти в Систему
                        </button>
                    </form>
                </div>
            </div>
          );
      }

      // 2. PROFILE (Capture)
      if (status === AgentStatus.WAITING_FOR_PROFILE_PAGE || status === AgentStatus.PROFILE_CAPTURED || status === AgentStatus.TARGETING_READY) {
          return (
              <div className="p-8 bg-white h-full overflow-y-auto text-gray-800">
                  <div className="border-b pb-4 mb-4 flex justify-between items-start">
                      <div>
                          <h1 className="text-2xl font-bold text-gray-900 font-sans">Иван Иванов</h1>
                          <p className="text-gray-600">Frontend Developer • Москва</p>
                      </div>
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="text-gray-400" size={32} />
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="p-4 bg-gray-50 rounded border border-gray-200">
                          <h3 className="font-bold text-sm uppercase text-gray-600 mb-2">Опыт работы</h3>
                          <div className="space-y-2">
                              <div>
                                  <div className="font-bold text-gray-800">Senior Frontend Dev</div>
                                  <div className="text-sm text-gray-600">TechCorp • 2020 - Present</div>
                                  <div className="text-xs text-gray-500 mt-1">React, TypeScript, Node.js...</div>
                              </div>
                          </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded border border-gray-200">
                          <h3 className="font-bold text-sm uppercase text-gray-600 mb-2">Навыки</h3>
                          <div className="flex flex-wrap gap-2">
                              {['JavaScript', 'React', 'Redux', 'WebGL', 'Docker'].map(s => (
                                  <span key={s} className="px-2 py-1 bg-gray-200 text-xs rounded text-gray-700">{s}</span>
                              ))}
                          </div>
                      </div>
                  </div>
                  {status === AgentStatus.PROFILE_CAPTURED && (
                      <div className="mt-4 p-2 bg-green-100 text-green-800 text-center font-bold border border-green-300 rounded">
                          ✓ Профиль успешно скопирован
                      </div>
                  )}
              </div>
          );
      }

      // 3. SEARCH FORM
      if (status === AgentStatus.NAVIGATING_TO_SEARCH || status === AgentStatus.SEARCH_PAGE_READY || status === AgentStatus.SEARCH_DOM_READY || status === AgentStatus.WAITING_FOR_SEARCH_PREFS || status === AgentStatus.SEARCH_PREFS_SAVED || status === AgentStatus.APPLY_PLAN_READY) {
          
          const keywordVal = getPrefValue('keyword') || "Frontend Developer";
          const salaryVal = getPrefValue('salary') || "150000";
          const areaVal = getPrefValue('region') || "Москва";

          return (
              <div className="p-6 bg-white h-full flex flex-col items-center pt-10 text-gray-800">
                  <div className="w-full max-w-2xl space-y-4">
                      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center font-sans">Поиск Вакансий</h1>
                      
                      <div className="flex gap-2">
                          <div className="flex-1 relative">
                              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                              <input 
                                  type="text" 
                                  placeholder="Профессия, должность..." 
                                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded focus:border-red-500 outline-none text-gray-900" 
                                  value={keywordVal}
                                  readOnly
                              />
                          </div>
                          <button className="bg-red-600 text-white px-8 py-3 font-bold rounded hover:bg-red-700">Найти</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="border p-4 rounded bg-gray-50">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Зарплата</label>
                              <div className="flex gap-2 items-center">
                                  <span className="text-gray-600">от</span>
                                  <input type="text" className="w-24 border p-1 bg-white" value={salaryVal} readOnly />
                                  <span className="text-gray-600">RUB</span>
                              </div>
                          </div>
                          <div className="border p-4 rounded bg-gray-50">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Регион</label>
                              <div className="flex items-center gap-2 text-gray-700">
                                  <MapPin size={16} />
                                  <span>{areaVal}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex gap-4 mt-2">
                           <label className="flex items-center gap-2 cursor-pointer">
                               <input type="checkbox" checked={true} readOnly className="w-4 h-4 text-red-600" />
                               <span className="text-sm text-gray-700">Удаленная работа</span>
                           </label>
                      </div>

                      {status === AgentStatus.APPLY_PLAN_READY && (
                          <div className="mt-8 bg-blue-50 border border-blue-200 p-4 text-blue-800 text-center animate-pulse">
                              Агент настраивает фильтры...
                          </div>
                      )}
                  </div>
              </div>
          );
      }

      // 4. RESULTS / PROCESSING
      if ([AgentStatus.VACANCIES_CAPTURED, AgentStatus.VACANCIES_DEDUPED, AgentStatus.PREFILTER_DONE, AgentStatus.LLM_SCREENING_DONE, AgentStatus.EXTRACTING_VACANCIES, AgentStatus.VACANCIES_EXTRACTED].includes(status)) {
          return (
              <div className="bg-gray-100 min-h-full p-4 text-gray-800">
                  <div className="max-w-3xl mx-auto space-y-4">
                      {[1, 2, 3].map(i => (
                          <div key={i} className="bg-white p-4 rounded shadow-sm border border-gray-200 flex justify-between group relative overflow-hidden">
                              <div>
                                  <h3 className="text-lg font-bold text-blue-600 hover:underline">Senior Frontend Developer</h3>
                                  <div className="text-gray-900 font-bold mt-1">250 000 - 350 000 руб.</div>
                                  <div className="text-gray-500 text-sm mt-1">TechCorp • Москва • Можно удаленно</div>
                                  <div className="text-xs text-gray-400 mt-2">React • TypeScript • CI/CD</div>
                              </div>
                              <div className="flex flex-col items-end justify-between">
                                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${i}`} className="w-10 h-10 rounded" alt="logo" />
                                  <button className="text-sm border border-green-600 text-green-600 px-4 py-1 rounded hover:bg-green-50">Откликнуться</button>
                              </div>
                              
                              {/* Analysis Overlay Effect */}
                              {(status === AgentStatus.LLM_SCREENING_DONE || status === AgentStatus.EXTRACTING_VACANCIES) && i === 1 && (
                                  <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center backdrop-blur-[1px]">
                                      <div className="bg-white border border-green-500 px-3 py-1 rounded-full text-green-700 text-xs font-bold flex items-center shadow-lg">
                                          <CheckCircle2 size={12} className="mr-1" /> Анализ...
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          );
      }

      // 5. APPLY MODAL
      if ([AgentStatus.APPLY_QUEUE_READY, AgentStatus.APPLY_BUTTON_FOUND, AgentStatus.APPLY_FORM_OPENED, AgentStatus.APPLY_DRAFT_FILLED, AgentStatus.SUBMITTING_APPLICATION, AgentStatus.APPLY_SUBMIT_SUCCESS].includes(status)) {
           return (
              <div className="bg-gray-100 min-h-full p-4 relative text-gray-800">
                  {/* Blurred Background Vacancy */}
                  <div className="bg-white p-8 rounded shadow max-w-3xl mx-auto opacity-50 blur-sm pointer-events-none">
                      <h1 className="text-2xl font-bold mb-4 text-black">Senior Frontend Developer</h1>
                      <div className="space-y-4 text-gray-600">
                          <p>We are looking for a rockstar...</p>
                          <p>Requirements: React, Node, AWS...</p>
                      </div>
                  </div>

                  {/* Modal */}
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="bg-white w-full max-w-md rounded-lg shadow-2xl border border-gray-300 flex flex-col overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                              <h3 className="font-bold text-gray-800">Отклик на вакансию</h3>
                              <button className="text-gray-400 hover:text-gray-600">×</button>
                          </div>
                          <div className="p-6 space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Резюме</label>
                                  <select className="w-full border border-gray-300 p-2 rounded bg-white text-black">
                                      <option>Иванов Иван (Frontend)</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Сопроводительное письмо</label>
                                  <textarea 
                                    className="w-full border border-gray-300 p-2 rounded h-32 text-sm text-black bg-white" 
                                    defaultValue={status === AgentStatus.APPLY_DRAFT_FILLED ? "Здравствуйте! Меня зовут Иван. Я увидел вашу вакансию на позицию Senior Frontend Developer и хочу предложить свою кандидатуру. У меня более 10 лет опыта в разработке, отлично владею React, Node.js и TypeScript. Готов выполнить тестовое задание. Спасибо за уделенное время!" : ""}
                                    placeholder="Напишите, почему мы должны взять именно вас..."
                                  ></textarea>
                              </div>
                          </div>
                          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                              <button className={`bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center ${status === AgentStatus.SUBMITTING_APPLICATION ? 'opacity-70 cursor-wait' : ''}`}>
                                  {status === AgentStatus.SUBMITTING_APPLICATION ? 'Отправка...' : 'Отправить'}
                              </button>
                          </div>
                          
                          {status === AgentStatus.APPLY_SUBMIT_SUCCESS && (
                              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-green-600">
                                  <CheckCircle2 size={48} className="mb-2" />
                                  <span className="font-bold text-xl">Отправлено!</span>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
           );
      }

      // Default / Unknown
      return (
            <div className="flex flex-col items-center justify-center h-full text-[#404040] space-y-4 p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                <Globe size={64} className="text-[#a0a0a0]" strokeWidth={1} />
                <div className="bg-[#f0f0f0] p-4 border border-[#808080] shadow-md">
                    <h3 className="text-lg font-bold uppercase tracking-widest mb-2 font-sans">Ожидание Сигнала</h3>
                    <p className="text-lg">Статус агента: {status}</p>
                    <div className="mt-4 h-1 w-full bg-[#d4d0c8] overflow-hidden">
                            <div className="h-full bg-yellow-600 animate-pulse w-full"></div>
                    </div>
                </div>
            </div>
      );
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
        <div className="flex-1 bg-white relative overflow-auto font-sans">
            {!isMock ? (
                <div className="flex flex-col items-center justify-center h-full text-[#404040] space-y-4 p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                    <Globe size={64} className="text-[#a0a0a0]" strokeWidth={1} />
                    <div className="bg-[#f0f0f0] p-4 border border-[#808080] shadow-md">
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-2 font-sans">Удаленный Канал Установлен</h3>
                        <p className="text-lg">Видеопоток перехвачен с внешнего автоматона.</p>
                        <div className="mt-4 h-1 w-full bg-[#d4d0c8] overflow-hidden">
                             <div className="h-full bg-green-600 animate-pulse w-1/3"></div>
                        </div>
                    </div>
                </div>
            ) : renderMockContent()}
        </div>
    </div>
  );
};
