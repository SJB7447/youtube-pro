
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  onGeminiKeyRequested: () => Promise<void>;
  hasGeminiKey: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onGeminiKeyRequested, hasGeminiKey }) => {
  const [ytKey, setYtKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('YT_API_KEY') || '';
    setYtKey(savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('YT_API_KEY', ytKey);
    window.dispatchEvent(new Event('storage'));
    alert('YouTube API 설정이 저장되었습니다.');
    if (hasGeminiKey) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-rose-400"></div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black text-white">서비스 시작하기</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">API Key Integration Center</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-10">
          {/* Gemini Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">1. Gemini AI Project Key</label>
              {hasGeminiKey && <span className="text-[10px] font-black text-emerald-500">Connected ✓</span>}
            </div>
            <button 
              onClick={onGeminiKeyRequested}
              className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 border ${
                hasGeminiKey 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-600 text-white border-rose-500 shadow-xl shadow-rose-900/20 active:scale-95'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {hasGeminiKey ? 'Gemini 프로젝트 변경하기' : 'AI 프로젝트 키 선택 (필수)'}
            </button>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              * 유료 GCP 프로젝트 키를 선택해야 Veo 영상 및 Pro 모델을 사용할 수 있습니다. <br/>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline hover:text-rose-300">결제 문서 확인하기</a>
            </p>
          </div>

          <div className="w-full h-px bg-slate-800"></div>

          {/* YouTube Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">2. YouTube Data API v3 Key</label>
              {ytKey && <span className="text-[10px] font-black text-emerald-500">Key Present ✓</span>}
            </div>
            <input 
              type="password"
              value={ytKey}
              onChange={(e) => setYtKey(e.target.value)}
              placeholder="YouTube API 키를 입력하세요 (AI 소재 분석용)"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
            />
            <button 
              onClick={handleSave}
              className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black hover:bg-slate-700 transition-all active:scale-95"
            >
              YouTube 키 저장하기
            </button>
            <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
              * 키는 브라우저의 로컬 저장소(LocalStorage)에만 저장됩니다.
            </p>
          </div>
        </div>

        {hasGeminiKey && ytKey && (
          <div className="mt-10 animate-in fade-in slide-in-from-top-2 duration-500">
             <button 
              onClick={onClose}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black hover:from-emerald-500 hover:to-teal-500 transition-all shadow-2xl shadow-emerald-900/40"
            >
              아이디어 구상 시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
