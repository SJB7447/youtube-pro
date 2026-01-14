
import React, { useState, useEffect } from 'react';
import { generateConceptAngles, analyzeConceptBrief, generateScriptOutline } from './services/geminiService';
import { AIConcept, AnalysisResult, ScriptOutline, FavoriteProject } from './types';
import AnalysisModal from './components/AnalysisModal';
import SettingsModal from './components/SettingsModal';
import { hasYouTubeKey } from './services/youtubeService';

const LANGUAGES = [
  { id: 'Korean', label: '한국어 (KR)' },
  { id: 'English', label: 'English (EN)' },
  { id: 'Japanese', label: '日本語 (JP)' },
  { id: 'Spanish', label: 'Español (ES)' },
  { id: 'Chinese', label: '中文 (CN)' }
];

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].id);
  const [concepts, setConcepts] = useState<AIConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [selectedConcept, setSelectedConcept] = useState<AIConcept | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scriptOutline, setScriptOutline] = useState<ScriptOutline | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProject[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const geminiSelected = await (window as any).aistudio.hasSelectedApiKey();
        setHasGeminiKey(geminiSelected);
        
        // Both keys must be present
        if (!geminiSelected || !hasYouTubeKey()) {
          setShowSettings(true);
        }
      } catch (e) {
        setHasGeminiKey(false);
        setShowSettings(true);
      }
    };
    init();
    loadFavorites();

    const handleFavChange = () => loadFavorites();
    window.addEventListener('favoritesChanged', handleFavChange);
    return () => window.removeEventListener('favoritesChanged', handleFavChange);
  }, []);

  const loadFavorites = () => {
    const favs = JSON.parse(localStorage.getItem('ideator_favorites') || '[]');
    setFavorites(favs);
  };

  const handleGeminiKeySelection = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasGeminiKey(true);
  };

  const handleGenerateConcepts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    if (!hasGeminiKey || !hasYouTubeKey()) {
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setConcepts([]);
    try {
      const results = await generateConceptAngles(topic, selectedLanguage);
      setConcepts(results);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("entity was not found")) {
         setHasGeminiKey(false);
         setShowSettings(true);
      }
      alert("AI 생성 실패. API 키 프로젝트와 할당량을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConcept = async (concept: AIConcept) => {
    setSelectedConcept(concept);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setScriptOutline(null);

    try {
      const result = await analyzeConceptBrief(concept);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      alert("분석 실패");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSelectFavorite = (fav: FavoriteProject) => {
    setSelectedConcept({
      id: fav.video.id,
      title: fav.video.title,
      description: fav.result?.audienceReaction || '',
      koreanTitle: fav.video.title,
      koreanDescription: fav.result?.audienceReaction || '',
      style: 'Saved',
      targetAudience: 'Saved',
      estimatedVirality: fav.video.efficiencyRatio
    });
    setAnalysisResult(fav.result);
    setScriptOutline(fav.scriptOutline);
    setAnalysisLoading(false);
    setScriptLoading(false);
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
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col items-center gap-8">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-rose-600 p-2 rounded-xl shadow-lg shadow-rose-900/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">Ideator Pro</h1>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">AI Production Studio</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSettings(true)}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                  (hasGeminiKey && hasYouTubeKey()) 
                  ? 'bg-slate-800/50 border-slate-700/50 text-slate-300' 
                  : 'bg-rose-600/20 border-rose-500/50 text-rose-500 animate-pulse'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                API 설정 관리
              </button>
            </div>
          </div>

          <div className="w-full max-w-2xl space-y-6">
            <form onSubmit={handleGenerateConcepts} className="flex gap-2">
              <input 
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="어떤 주제로 영상을 만들고 싶나요?"
                className="w-full pl-6 pr-4 py-4 rounded-2xl bg-slate-900 border border-slate-800 outline-none focus:border-rose-500/50 transition-all text-sm placeholder:text-slate-600 shadow-inner"
              />
              <button type="submit" disabled={loading} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-rose-500 disabled:opacity-50 transition-all text-sm shadow-xl active:scale-95 whitespace-nowrap border-t border-rose-400/20">
                {loading ? '기획 중...' : '컨셉 생성'}
              </button>
            </form>

            <div className="bg-slate-900/40 border border-slate-800 p-1.5 rounded-2xl flex items-center justify-center gap-1">
              {LANGUAGES.map(lang => (
                <button 
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${selectedLanguage === lang.id ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-16 space-y-20">
        
        {/* Onboarding Overlay when keys are missing */}
        {(!hasGeminiKey || !hasYouTubeKey()) && !showSettings && (
          <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-16 text-center animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="w-20 h-20 bg-rose-600/20 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            </div>
            <h2 className="text-3xl font-black mb-4">서비스 시작을 위해 API 연동이 필요합니다</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 font-medium">
              모든 제작 기능은 사용자의 전용 API 키를 통해 작동합니다. <br/>
              안전하게 저장되는 API 키를 설정해주세요.
            </p>
            <button 
              onClick={() => setShowSettings(true)}
              className="px-12 py-5 bg-rose-600 text-white rounded-[2rem] font-black hover:bg-rose-500 transition-all shadow-2xl shadow-rose-900/40 active:scale-95 border-t border-rose-400/20 text-lg"
            >
              설정 센터 열기
            </button>
          </section>
        )}

        {/* Favorites Section */}
        {favorites.length > 0 && hasGeminiKey && hasYouTubeKey() && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-rose-600/10 rounded-lg flex items-center justify-center text-rose-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <h2 className="text-xl font-black tracking-tight">즐겨찾는 기획안</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map(fav => (
                <button 
                  key={fav.id} 
                  onClick={() => handleSelectFavorite(fav)}
                  className="bg-slate-900/40 border border-slate-800 hover:border-rose-500/50 p-6 rounded-[2rem] text-left transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-100 group-hover:text-rose-500 transition-colors line-clamp-1">{fav.video.title}</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Saved on {new Date(fav.savedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Results Section */}
        {hasGeminiKey && hasYouTubeKey() && (
          loading ? (
            <div className="grid md:grid-cols-2 gap-8 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-slate-900/50 rounded-[2rem] h-64 border border-slate-800"></div>
              ))}
            </div>
          ) : concepts.length > 0 ? (
            <div className="space-y-12">
              <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
                <span className="text-rose-500 font-black text-[10px] tracking-widest uppercase mb-4">AI Recommendations</span>
                <h2 className="text-4xl font-black tracking-tight mb-4">"{topic}" 영상 기획안</h2>
                <p className="text-slate-500 text-sm leading-relaxed">AI가 분석한 파급력 있는 비디오 컨셉입니다. 하나를 선택해 상세 기획을 시작하세요.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {concepts.map((concept) => (
                  <button 
                    key={concept.id}
                    onClick={() => handleSelectConcept(concept)}
                    className="group relative text-left bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-[2.5rem] p-10 transition-all duration-500 flex flex-col"
                  >
                    <div className="flex justify-between items-start gap-6 mb-4">
                      <div className="flex-1 space-y-1">
                        <h3 className="text-2xl font-black group-hover:text-rose-500 transition-colors leading-tight">
                          {concept.koreanTitle || concept.title}
                        </h3>
                        {selectedLanguage !== 'Korean' && (
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">{concept.title}</p>
                        )}
                      </div>
                      <div className="shrink-0 pt-1 flex items-center gap-2">
                        <span className="text-[10px] font-black text-rose-500 uppercase">{concept.estimatedVirality}% Viral</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8 line-clamp-3 flex-1 font-medium">
                      {concept.koreanDescription || concept.description}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300">{concept.style}</span>
                      <span className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300">{concept.targetAudience}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : !favorites.length && (
            <div className="flex flex-col items-center justify-center py-40 text-center">
              <h2 className="text-3xl font-black mb-4">새로운 아이디어를 구상하세요</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed font-medium">주제를 입력하면 AI가 성공적인 비디오 컨셉을 제안합니다.</p>
            </div>
          )
        )}
      </main>

      {selectedConcept && (
        <AnalysisModal 
          video={{ 
            id: selectedConcept.id, 
            title: selectedConcept.title, 
            thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
            channelTitle: 'AI Suggested', 
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
            setAnalysisResult(null);
            setScriptOutline(null);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          onGeminiKeyRequested={handleGeminiKeySelection}
          hasGeminiKey={!!hasGeminiKey}
        />
      )}
    </div>
  );
};

export default App;
