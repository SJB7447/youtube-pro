
import React, { useState, useEffect } from 'react';
import { generateConceptAngles, analyzeConceptBrief, generateScriptOutline } from './services/geminiService';
import { searchVideos, hasYouTubeKey } from './services/youtubeService';
import { AIConcept, AnalysisResult, ScriptOutline, FavoriteProject, YouTubeVideo } from './types';
import AnalysisModal from './components/AnalysisModal';
import SettingsModal from './components/SettingsModal';
import VideoCard from './components/VideoCard';

const LANGUAGES = [
  { id: 'Korean', label: '한국어 (KR)' },
  { id: 'English', label: 'English (EN)' },
  { id: 'Japanese', label: '日本語 (JP)' },
  { id: 'Spanish', label: 'Español (ES)' },
  { id: 'Chinese', label: '中文 (CN)' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discover' | 'ideate'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [videoType, setVideoType] = useState<'any' | 'short' | 'long'>('any');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [topic, setTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].id);
  const [concepts, setConcepts] = useState<AIConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [selectedConcept, setSelectedConcept] = useState<AIConcept | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scriptOutline, setScriptOutline] = useState<ScriptOutline | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProject[]>([]);

  useEffect(() => {
    const checkKeys = () => {
      const hasGemini = !!localStorage.getItem('GEMINI_API_KEY');
      const hasYT = hasYouTubeKey();
      if (!hasYT || !hasGemini) {
        setShowSettings(true);
      }
    };
    checkKeys();
    loadFavorites();

    const handleStorageChange = () => checkKeys();
    const handleFavChange = () => loadFavorites();
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('favoritesChanged', handleFavChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesChanged', handleFavChange);
    };
  }, []);

  const loadFavorites = () => {
    const favs = JSON.parse(localStorage.getItem('ideator_favorites') || '[]');
    setFavorites(favs);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (!hasYouTubeKey()) {
      setShowSettings(true);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchVideos(searchQuery, videoType);
      setSearchResults(results.sort((a, b) => b.efficiencyRatio - a.efficiencyRatio));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGenerateConcepts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setConcepts([]);
    try {
      const results = await generateConceptAngles(topic, selectedLanguage);
      setConcepts(results);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "AI 생성 실패. API 구성을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeVideo = async (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setScriptOutline(null);

    const tempConcept: AIConcept = {
      id: video.id,
      title: video.title,
      description: `Analysis of viral video from ${video.channelTitle}`,
      koreanTitle: video.title,
      koreanDescription: `구독자 대비 조회수 ${video.efficiencyRatio.toFixed(0)}%를 기록한 인기 영상 분석`,
      style: 'Based on Trend',
      targetAudience: 'YouTube Viewers',
      estimatedVirality: video.efficiencyRatio
    };
    setSelectedConcept(tempConcept);

    try {
      const result = await analyzeConceptBrief(tempConcept);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      alert("분석 실패");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleKeywordSelect = async (keyword: string) => {
    setScriptLoading(true);
    try {
      const outline = await generateScriptOutline(keyword);
      setScriptOutline(outline);
    } catch (err) {
      alert("대본 생성 실패");
    } finally {
      setScriptLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans pb-20">
      <header className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col items-center gap-6">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-rose-600 p-2 rounded-xl shadow-lg shadow-rose-900/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">Ideator Pro</h1>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">AI Content Discovery & Production</p>
              </div>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button 
                onClick={() => setActiveTab('discover')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${activeTab === 'discover' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                트렌드 발굴
              </button>
              <button 
                onClick={() => setActiveTab('ideate')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${activeTab === 'ideate' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                AI 아이디어
              </button>
            </div>

            <button 
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
          </div>

          <div className="w-full max-w-2xl">
            {activeTab === 'discover' ? (
              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="트렌드 키워드를 입력하세요 (예: 캠핑, 재테크, AI...)"
                    className="w-full pl-6 pr-4 py-4 rounded-2xl bg-slate-950 border border-slate-800 outline-none focus:border-rose-500/50 transition-all text-sm shadow-inner"
                  />
                  <button type="submit" disabled={searchLoading} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-rose-500 disabled:opacity-50 transition-all text-sm shadow-xl active:scale-95 whitespace-nowrap">
                    {searchLoading ? '검색 중...' : '소재 발굴'}
                  </button>
                </div>
                <div className="flex justify-center gap-2">
                  {['any', 'short', 'long'].map((type) => (
                    <button 
                      key={type}
                      onClick={() => setVideoType(type as any)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${videoType === type ? 'bg-slate-100 text-slate-900 border-white' : 'text-slate-500 border-slate-800 hover:border-slate-600'}`}
                    >
                      {type === 'any' ? '전체' : type === 'short' ? '쇼츠' : '롱폼'}
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <form onSubmit={handleGenerateConcepts} className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="어떤 주제로 기획을 시작할까요?"
                    className="w-full pl-6 pr-4 py-4 rounded-2xl bg-slate-950 border border-slate-800 outline-none focus:border-rose-500/50 transition-all text-sm shadow-inner"
                  />
                  <button type="submit" disabled={loading} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-rose-500 disabled:opacity-50 transition-all text-sm shadow-xl active:scale-95 whitespace-nowrap">
                    {loading ? '기획 중...' : '컨셉 생성'}
                  </button>
                </div>
                <div className="bg-slate-900/40 p-1.5 rounded-2xl flex items-center justify-center gap-1">
                  {LANGUAGES.map(lang => (
                    <button 
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${selectedLanguage === lang.id ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {lang.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-16">
        {activeTab === 'discover' ? (
          <div className="space-y-12">
            {searchResults.length > 0 ? (
              <>
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
                  <span className="text-emerald-500 font-black text-[10px] tracking-widest uppercase mb-4">Viral Market Analysis</span>
                  <h2 className="text-4xl font-black tracking-tight mb-4">"{searchQuery}" 검색 결과</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">구독자 대비 조회수(효율성)가 높은 영상을 분석하여 나만의 소재로 만드세요.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {searchResults.map(video => (
                    <VideoCard 
                      key={video.id} 
                      video={video} 
                      onAnalyze={handleAnalyzeVideo}
                    />
                  ))}
                </div>
              </>
            ) : !searchLoading && (
              <div className="flex flex-col items-center justify-center py-40 text-center opacity-40">
                <svg className="w-16 h-16 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <h3 className="text-xl font-black">키워드를 입력하여 인기 소재를 발굴하세요</h3>
                <p className="text-sm font-medium mt-2">구독자보다 조회수가 월등히 높은 영상을 찾아보세요.</p>
              </div>
            )}
            {searchLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-pulse">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-[2rem] aspect-[3/4] border border-slate-800"></div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-12">
             {concepts.length > 0 ? (
              <>
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
                  <span className="text-rose-500 font-black text-[10px] tracking-widest uppercase mb-4">AI Recommendations</span>
                  <h2 className="text-4xl font-black tracking-tight mb-4">"{topic}" 기반 컨셉</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {concepts.map((concept) => (
                    <button 
                      key={concept.id}
                      onClick={() => {
                        setSelectedConcept(concept);
                        handleSelectConcept(concept);
                      }}
                      className="group relative text-left bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-[2.5rem] p-10 transition-all duration-500 flex flex-col"
                    >
                      <div className="flex justify-between items-start gap-6 mb-4">
                        <h3 className="text-2xl font-black group-hover:text-rose-500 transition-colors leading-tight">{concept.koreanTitle || concept.title}</h3>
                        <span className="text-[10px] font-black text-rose-500 uppercase shrink-0 pt-2">{concept.estimatedVirality}% Viral</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-8 line-clamp-3 flex-1 font-medium">{concept.koreanDescription || concept.description}</p>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300">{concept.style}</span>
                        <span className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300">{concept.targetAudience}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : !loading && (
              <div className="flex flex-col items-center justify-center py-40 text-center opacity-40">
                <svg className="w-16 h-16 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <h3 className="text-xl font-black">AI에게 새로운 컨셉을 제안받으세요</h3>
                <p className="text-sm font-medium mt-2">간단한 주제만으로 파급력 있는 기획안을 만들어드립니다.</p>
              </div>
            )}
            {loading && (
              <div className="grid md:grid-cols-2 gap-8 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-[2.5rem] h-64 border border-slate-800"></div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {selectedConcept && (
        <AnalysisModal 
          video={selectedVideo || { 
            id: selectedConcept.id, 
            title: selectedConcept.title, 
            thumbnail: '',
            channelTitle: 'AI Generation', 
            viewCount: 0, 
            subscriberCount: 0,
            efficiencyRatio: selectedConcept.estimatedVirality,
            publishedAt: new Date().toISOString(),
            channelId: 'ai'
          }}
          result={analysisResult}
          loading={analysisLoading}
          scriptOutline={scriptOutline}
          scriptLoading={scriptLoading}
          onKeywordSelect={handleKeywordSelect}
          onClose={() => {
            setSelectedConcept(null);
            setSelectedVideo(null);
            setAnalysisResult(null);
            setScriptOutline(null);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );

  async function handleSelectConcept(concept: AIConcept) {
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setScriptOutline(null);
    try {
      const result = await analyzeConceptBrief(concept);
      setAnalysisResult(result);
    } catch (err) {
      alert("분석 실패");
    } finally {
      setAnalysisLoading(false);
    }
  }
};

export default App;
