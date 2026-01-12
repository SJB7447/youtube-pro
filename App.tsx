
import React, { useState, useEffect } from 'react';
import { searchVideos, getVideoComments } from './services/youtubeService';
import { analyzeContent, generateScriptOutline } from './services/geminiService';
import { YouTubeVideo, AnalysisResult, ScriptOutline } from './types';
import VideoCard from './components/VideoCard';
import AnalysisModal from './components/AnalysisModal';

const App: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [videoType, setVideoType] = useState<'any' | 'short' | 'long'>('any');
  const [viralThreshold, setViralThreshold] = useState(100);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Key Selection State
  const [hasPaidKey, setHasPaidKey] = useState<boolean | null>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [ytKey, setYtKey] = useState(localStorage.getItem('YT_API_KEY') || '');

  // Analysis State
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scriptOutline, setScriptOutline] = useState<ScriptOutline | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasPaidKey(selected);
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasPaidKey(true); // Assume success as per guidelines
  };

  const handleSaveKeys = () => {
    localStorage.setItem('YT_API_KEY', ytKey);
    setShowSettings(false);
    setError(null);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!keyword.trim()) return;

    if (!ytKey && !process.env.API_KEY) {
      setShowSettings(true);
      setError("YouTube API 키를 먼저 설정해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await searchVideos(keyword, videoType);
      setVideos(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (video: YouTubeVideo) => {
    if (!hasPaidKey) {
      alert("고품질 AI 기능을 사용하려면 유료 API 키를 먼저 선택해주세요.");
      handleOpenKeySelector();
      return;
    }

    setSelectedVideo(video);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setScriptOutline(null);
    
    try {
      const comments = await getVideoComments(video.id);
      if (comments.length === 0) {
        throw new Error("분석할 댓글이 없습니다.");
      }
      const result = await analyzeContent(video.title, comments);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "분석 실패");
      setSelectedVideo(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleKeywordSelect = async (topicKeyword: string) => {
    if (!selectedVideo) return;
    setScriptLoading(true);
    try {
      const outline = await generateScriptOutline(topicKeyword, selectedVideo.title);
      setScriptOutline(outline);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setScriptLoading(false);
    }
  };

  const filteredVideos = videos.filter(v => (v.efficiencyRatio || 0) >= viralThreshold);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      {/* Header & Search */}
      <header className="bg-white/80 border-b border-slate-200 sticky top-0 z-40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-600 p-2 rounded-xl shadow-lg shadow-rose-200">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Ideator Pro</h1>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Viral Research Lab</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleOpenKeySelector} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${hasPaidKey ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {hasPaidKey ? '✓ Paid API Active' : '! Setup AI Key'}
                  </button>
                  <button onClick={() => setShowSettings(true)} className="md:hidden p-2 text-slate-400 hover:text-rose-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 max-w-2xl w-full">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="분석하고 싶은 주제를 입력하세요..."
                      className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none bg-slate-50/50 text-sm transition-all"
                    />
                    <div className="absolute right-3 top-3 text-slate-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all text-sm shadow-md active:scale-95">
                    {loading ? '검색 중' : '검색'}
                  </button>
                </form>
              </div>
              
              <button onClick={() => setShowSettings(true)} className="hidden md:flex items-center gap-2 px-5 py-3 rounded-2xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                YouTube API 설정
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-8 py-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video Type</span>
                <div className="flex p-1 bg-slate-100/80 rounded-xl">
                  {(['any', 'short', 'long'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setVideoType(type)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${videoType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {type === 'any' ? '전체' : type === 'short' ? 'Shorts' : 'Long-form'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-w-[240px] flex items-center gap-4">
                <div className="flex justify-between items-center w-full max-w-md">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Efficiency: <span className="text-rose-600 ml-1">{viralThreshold}%+</span></span>
                   <input 
                    type="range" min="0" max="1000" step="50"
                    value={viralThreshold}
                    onChange={(e) => setViralThreshold(parseInt(e.target.value))}
                    className="flex-1 ml-4 accent-rose-600 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer hover:accent-rose-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {error && (
          <div className="mb-10 p-5 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-center text-sm font-semibold shadow-sm animate-in slide-in-from-top-4">
            <span className="mr-2">⚠️</span> {error}
            <button onClick={() => setShowSettings(true)} className="ml-3 underline hover:text-rose-800">설정 바로가기</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-200 rounded-2xl h-80 shadow-sm"></div>
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredVideos.map(video => (
              <VideoCard 
                key={video.id} 
                video={video} 
                onAnalyze={handleAnalyze} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center opacity-80">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">검색 결과가 없습니다</h2>
            <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">다른 키워드를 입력해보거나 바이럴 비율 임계값을 낮추어 더 많은 영상을 확인해보세요.</p>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-8 text-white">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-black tracking-tight">YouTube API 설정</h3>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-slate-400 text-xs">YouTube 검색 결과를 가져오기 위한 API 키가 필요합니다.</p>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">YouTube Data API Key</label>
                <input 
                  type="password" 
                  value={ytKey} 
                  onChange={(e) => setYtKey(e.target.value)} 
                  placeholder="AI-XXXXXX..." 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none bg-slate-50 text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-mono" 
                />
              </div>
              <button onClick={handleSaveKeys} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 text-sm">
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVideo && (
        <AnalysisModal 
          video={selectedVideo}
          result={analysisResult}
          loading={analysisLoading}
          scriptOutline={scriptOutline}
          scriptLoading={scriptLoading}
          onKeywordSelect={handleKeywordSelect}
          onClose={() => {
            setSelectedVideo(null);
            setAnalysisResult(null);
            setScriptOutline(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
