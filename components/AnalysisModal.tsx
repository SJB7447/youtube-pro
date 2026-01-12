
import React, { useState } from 'react';
import JSZip from 'jszip';
import { AnalysisResult, YouTubeVideo, ScriptOutline, GeneratedAsset } from '../types';
import { generateProductionPlan, generateImage, generateTTS, generateVeoVideo, decodePCM } from '../services/geminiService';

interface AnalysisModalProps {
  video: YouTubeVideo;
  result: AnalysisResult | null;
  loading: boolean;
  scriptOutline: ScriptOutline | null;
  scriptLoading: boolean;
  onKeywordSelect: (keyword: string) => void;
  onClose: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
  video, result, loading, scriptOutline, scriptLoading, onKeywordSelect, onClose 
}) => {
  const [productionLoading, setProductionLoading] = useState(false);
  const [productionProgress, setProductionProgress] = useState("");
  const [producedAssets, setProducedAssets] = useState<GeneratedAsset[]>([]);
  const [fullScript, setFullScript] = useState("");
  const [isZipping, setIsZipping] = useState(false);

  const startProduction = async () => {
    if (!scriptOutline) return;
    setProductionLoading(true);
    setProducedAssets([]);
    
    try {
      setProductionProgress("AI 기획자가 상세 대본과 이미지 프롬프트를 작성 중입니다...");
      const plan = await generateProductionPlan(scriptOutline, video.title.toLowerCase().includes('short'));
      setFullScript(plan.fullScript);

      setProductionProgress("대본을 기반으로 성우 음성(TTS)을 생성 중입니다...");
      try {
        const audioUrl = await generateTTS(plan.fullScript);
        setProducedAssets(prev => [...prev, { type: 'audio', url: audioUrl }]);
      } catch (e) {
        console.error("TTS generation failed", e);
      }

      setProductionProgress(`이미지 생성 중 (0/${plan.imagePrompts.length})...`);
      for(let i=0; i < plan.imagePrompts.length; i++) {
        setProductionProgress(`이미지 생성 중 (${i+1}/${plan.imagePrompts.length})...`);
        try {
          const imgUrl = await generateImage(plan.imagePrompts[i]);
          const newAsset: GeneratedAsset = { type: 'image', url: imgUrl, prompt: plan.imagePrompts[i] };
          setProducedAssets(prev => [...prev, newAsset]);
        } catch (e) {
          console.error(`Image generation ${i+1} failed`, e);
        }
      }

      setProductionProgress("마지막으로 고화질 시네마틱 영상을 제작 중입니다 (약 1분 소요)...");
      try {
        const videoUrl = await generateVeoVideo(scriptOutline.title);
        setProducedAssets(prev => [...prev, { type: 'video', url: videoUrl }]);
      } catch (e) {
        console.error("Veo generation failed", e);
      }

      setProductionProgress("제작 완료! 🎉");
    } catch (err: any) {
      console.error(err);
      alert("제작 중 오류 발생: " + err.message);
    } finally {
      setProductionLoading(false);
    }
  };

  const playTTS = async (url: string) => {
    try {
      const buffer = await decodePCM(url);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const downloadAllAsZip = async () => {
    if (!fullScript || producedAssets.length === 0) return;
    setIsZipping(true);
    const zip = new JSZip();

    try {
      // 1. Script
      zip.file("script.txt", fullScript);

      // 2. Images
      const imgFolder = zip.folder("images");
      const images = producedAssets.filter(a => a.type === 'image');
      for (let i = 0; i < images.length; i++) {
        const res = await fetch(images[i].url);
        const blob = await res.blob();
        imgFolder?.file(`scene_${i + 1}.png`, blob);
      }

      // 3. Audio (TTS)
      const audioAsset = producedAssets.find(a => a.type === 'audio');
      if (audioAsset) {
        const res = await fetch(audioAsset.url);
        const arrayBuffer = await res.arrayBuffer();
        // Since it's raw PCM, for better compatibility, we'll label it .pcm
        // In a real scenario we'd wrap it in a WAV header
        zip.file("voiceover.pcm", arrayBuffer);
      }

      // 4. Video
      const videoAsset = producedAssets.find(a => a.type === 'video');
      if (videoAsset) {
        const res = await fetch(videoAsset.url);
        const blob = await res.blob();
        zip.file("cinematic_preview.mp4", blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${scriptOutline?.title || 'content'}_assets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("ZIP creation error", e);
      alert("파일 압축 중 오류가 발생했습니다.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">콘텐츠 기획 & 제작 랩</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI CONTENT PRODUCER</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-10 md:px-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-rose-500/20 border-t-rose-500 mb-6"></div>
              <p className="text-slate-600 font-bold text-lg">데이터 분석 중...</p>
            </div>
          ) : result ? (
            <div className="space-y-12">
              <div className="border border-slate-200 rounded-[2rem] p-8 md:p-10 bg-white shadow-sm">
                <div className="flex flex-col md:flex-row gap-10 mb-12 items-center">
                  <div className="relative shrink-0">
                    <img src={video.thumbnail} className="w-full md:w-[320px] rounded-2xl shadow-lg object-cover aspect-video" alt="" />
                    <div className="absolute -bottom-3 right-4 bg-white px-3 py-1 rounded-lg shadow-md border border-slate-100">
                      <p className="text-[10px] font-black text-rose-500 uppercase">VIRAL: {video.efficiencyRatio?.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight" dangerouslySetInnerHTML={{ __html: video.title }} />
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold">{video.channelTitle}</span>
                      <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold">조회수 {(video.viewCount/10000).toFixed(1)}만</span>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-7 space-y-12">
                    <div className="bg-slate-50/50 p-8 rounded-2xl border-l-4 border-slate-200">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">REACTION SUMMARY</h4>
                      <p className="text-slate-700 leading-relaxed font-medium italic">"{result.audienceReaction}"</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 mb-4">실시간 키워드</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.frequentKeywords.map((kw, i) => (
                          <span key={i} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100">#{kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5 border-l border-slate-100 pl-0 lg:pl-10">
                    <h4 className="text-sm font-black text-slate-900 mb-6">추천 소재 (대본 생성 가능)</h4>
                    <div className="space-y-3">
                      {result.recommendedTopics.map((topic, i) => (
                        <button key={i} onClick={() => onKeywordSelect(topic.keyword)} className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all bg-white shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-slate-800 text-sm">#{topic.keyword}</span>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{topic.reason}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {(scriptLoading || scriptOutline) && (
                <section className="mt-16 border-t border-slate-100 pt-16">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </div>
                      <h3 className="text-xl font-black text-slate-900">기획서 초안 및 자동 영상 제작</h3>
                    </div>
                    {scriptOutline && !productionLoading && producedAssets.length === 0 && (
                      <button 
                        onClick={startProduction}
                        className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg flex items-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        상세 대본 및 영상 자산 생성 시작
                      </button>
                    )}
                    {producedAssets.length > 0 && !productionLoading && (
                      <button 
                        onClick={downloadAllAsZip}
                        disabled={isZipping}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 text-sm disabled:opacity-50"
                      >
                        {isZipping ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            압축 중...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            모든 자산 다운로드 (ZIP)
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {productionLoading && (
                    <div className="bg-slate-900 text-white p-12 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <p className="text-xl font-black mb-2">{productionProgress}</p>
                        <p className="text-slate-400 text-sm">잠시만 기다려주세요. AI가 자산을 하나씩 생성하고 있습니다.</p>
                      </div>
                    </div>
                  )}

                  {(producedAssets.length > 0) && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-rose-500 font-black uppercase text-xs tracking-widest">Full Production Assets</h4>
                          <span className="text-[10px] text-slate-500">{productionLoading ? '진행 중...' : '완료'}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                            {fullScript && (
                              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                  <h5 className="font-bold text-sm">최종 대본</h5>
                                  {producedAssets.find(a => a.type === 'audio') && (
                                    <button 
                                      onClick={() => playTTS(producedAssets.find(a => a.type === 'audio')!.url)}
                                      className="px-3 py-1.5 bg-rose-600 rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-rose-500 transition-all"
                                    >
                                      음성 듣기
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed h-64 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-wrap">{fullScript}</p>
                              </div>
                            )}

                            {producedAssets.find(a => a.type === 'video') && (
                              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h5 className="font-bold text-sm mb-4">시네마틱 영상 (Veo AI)</h5>
                                <video 
                                  src={producedAssets.find(a => a.type === 'video')!.url} 
                                  controls 
                                  className="w-full rounded-xl aspect-video bg-black shadow-2xl"
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <h5 className="font-bold text-sm">생성된 이미지 보드 ({producedAssets.filter(a => a.type === 'image').length})</h5>
                            <div className="grid grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                              {producedAssets.filter(a => a.type === 'image').map((img, idx) => (
                                <div key={idx} className="group relative rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/20">
                                  <img src={img.url} className="w-full aspect-video object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex items-end">
                                    <p className="text-[9px] text-slate-200 line-clamp-3 leading-tight">{img.prompt}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {scriptLoading ? (
                    <div className="bg-slate-50 rounded-[2rem] p-16 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-600 font-bold">목차 작성 중...</p>
                    </div>
                  ) : scriptOutline && producedAssets.length === 0 && !productionLoading && (
                    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden max-w-4xl mx-auto">
                      <div className="bg-slate-900 p-10 text-white">
                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4">OUTLINE</h4>
                        <h5 className="text-2xl font-black">{scriptOutline.title}</h5>
                      </div>
                      <div className="p-10 space-y-8">
                        {scriptOutline.sections.map((section, idx) => (
                          <div key={idx} className="flex gap-6">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-black text-slate-400 text-xs shrink-0">{idx + 1}</div>
                            <div>
                              <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{section.label}</h6>
                              <p className="text-slate-700 text-sm font-medium">{section.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
