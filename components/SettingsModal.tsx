
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [ytKey, setYtKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    setYtKey(localStorage.getItem('YT_API_KEY') || '');
    setGeminiKey(localStorage.getItem('GEMINI_API_KEY') || '');
  }, []);

  const handleSaveYT = () => {
    if (!ytKey.trim()) {
      alert('YouTube API 키를 입력해주세요.');
      return;
    }
    localStorage.setItem('YT_API_KEY', ytKey);
    window.dispatchEvent(new Event('storage'));
    alert('YouTube API 설정이 저장되었습니다.');
  };

  const handleSaveGemini = () => {
    if (!geminiKey.trim()) {
      alert('Gemini API 키를 입력해주세요.');
      return;
    }
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    window.dispatchEvent(new Event('storage'));
    alert('Gemini API 설정이 저장되었습니다.');
  };

  const isYouTubeSet = ytKey.trim() !== '';
  const isGeminiSet = geminiKey.trim() !== '';
  const isAllSet = isYouTubeSet && isGeminiSet;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-lg p-10 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-rose-400"></div>
        
        <div className="flex justify-between items-center mb-10">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">서비스 시작하기</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">API Integration Center</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-all text-slate-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-12">
          {/* 1. Gemini AI Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-black text-rose-500 uppercase tracking-widest">1. Gemini API Key</label>
              {isGeminiSet && <span className="text-[10px] font-black text-emerald-500">저장됨 ✓</span>}
            </div>
            <div className="space-y-3">
              <input 
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Gemini API 키를 입력하세요"
                className="w-full bg-slate-950 border border-slate-800 rounded-[1.5rem] px-6 py-5 text-sm text-slate-200 outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700 shadow-inner"
              />
              <button 
                onClick={handleSaveGemini}
                className="w-full py-4 bg-slate-800 text-rose-500 rounded-[1.5rem] font-black hover:bg-rose-600 hover:text-white transition-all active:scale-95 text-xs border border-slate-700/50 shadow-lg"
              >
                Gemini 키 저장
              </button>
            </div>
          </div>

          {/* 2. YouTube Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-black text-blue-500 uppercase tracking-widest">2. YouTube Data API v3 Key</label>
              {isYouTubeSet && <span className="text-[10px] font-black text-emerald-500">저장됨 ✓</span>}
            </div>
            <div className="space-y-3">
              <input 
                type="password"
                value={ytKey}
                onChange={(e) => setYtKey(e.target.value)}
                placeholder="YouTube API 키를 입력하세요"
                className="w-full bg-slate-950 border border-slate-800 rounded-[1.5rem] px-6 py-5 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 shadow-inner"
              />
              <button 
                onClick={handleSaveYT}
                className="w-full py-4 bg-slate-800 text-blue-500 rounded-[1.5rem] font-black hover:bg-blue-600 hover:text-white transition-all active:scale-95 text-xs border border-slate-700/50 shadow-lg"
              >
                YouTube 키 저장
              </button>
            </div>
          </div>
        </div>

        {isAllSet && (
          <div className="mt-12 animate-in fade-in slide-in-from-top-4 duration-500">
             <button 
              onClick={onClose}
              className="w-full py-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[2rem] font-black hover:from-emerald-500 hover:to-teal-500 transition-all shadow-2xl shadow-emerald-900/40 text-lg border-t border-emerald-400/20"
            >
              제작 스튜디오 입장
            </button>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <p className="text-[10px] text-slate-600 font-medium">
            모든 API 키는 브라우저 로컬 스토리지에만 안전하게 저장됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
