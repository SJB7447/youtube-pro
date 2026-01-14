
import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { AnalysisResult, YouTubeVideo, ScriptOutline, GeneratedAsset, ProductionPlan, SubtitleSegment, FavoriteProject } from '../types';
import { generateProductionPlan, generateImage, generateTTS, generateVeoVideo, decodePCM, regenerateSubTopics, generateSeoStrategy } from '../services/geminiService';

interface AnalysisModalProps {
  video: YouTubeVideo;
  result: AnalysisResult | null;
  loading: boolean;
  scriptOutline: ScriptOutline | null;
  scriptLoading: boolean;
  onKeywordSelect: (keyword: string) => void;
  onClose: () => void;
}

type ProductionStep = 'idle' | 'scripting' | 'imaging' | 'review_images' | 'videoing' | 'completed';
type VideoFormat = 'short' | 'long';

const VISUAL_STYLES = [
  { id: 'cinematic', label: '시네마틱', prompt: 'Cinematic, Epic, Professional Film Style' },
  { id: '3d_render', label: '3D 렌더링', prompt: 'Unreal Engine 5, Octane Render, Highly Detailed 3D' },
  { id: 'anime', label: '애니메이션', prompt: 'Studio Ghibli aesthetic, Vibrant Anime Illustration' },
  { id: 'custom', label: '직접 입력', prompt: '' },
  { id: 'realistic', label: '실사 다큐', prompt: 'Photorealistic, Documentary Photography Style' },
  { id: 'pop_art', label: '팝아트', prompt: 'Vibrant Pop Art, High Contrast, Graphic Illustration' }
];

const LANGUAGES = [
  { id: 'Korean', label: '한국어 (KR)' },
  { id: 'English', label: '영어 (EN)' },
  { id: 'Japanese', label: '일본어 (JP)' },
  { id: 'Spanish', label: '스페인어 (ES)' },
  { id: 'Chinese', label: '중국어 (CN)' }
];

const RATIOS = {
  short: ["9:16", "3:4", "1:1"],
  long: ["16:9", "4:3"]
};

const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
  video, result, loading, scriptOutline, scriptLoading, onKeywordSelect, onClose 
}) => {
  const [step, setStep] = useState<ProductionStep>('idle');
  // Added missing closing angle bracket for the generic type and fixed initialization syntax
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('short');
  const [aspectRatio, setAspectRatio] = useState<string>("9:16");
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].id);
  const [visualStyle, setVisualStyle] = useState(VISUAL_STYLES[0]);
  const [customStylePrompt, setCustomStylePrompt] = useState("");
  const [seoPlatform, setSeoPlatform] = useState<'youtube' | 'tiktok'>('youtube');
  const [productionProgress, setProductionProgress] = useState("");
  const [producedAssets, setProducedAssets] = useState<GeneratedAsset[]>([]);
  const [fullScript, setFullScript] = useState("");
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ProductionPlan | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assembleProgress, setAssembleProgress] = useState(0);

  // Audio Control States
  const [bgmUrl, setBgmUrl] = useState<string | null>(null);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [bgmVolume, setBgmVolume] = useState(0.2);

  // Image Count Selection State
  const [targetImageCount, setTargetImageCount] = useState(10);

  // Local SEO Data state to handle multi-language updates
  const [localSeoData, setLocalSeoData] = useState<AnalysisResult['seoData'] | null>(null);
  const [seoUpdating, setSeoUpdating] = useState(false);

  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [localTopics, setLocalTopics] = useState<AnalysisResult['recommendedTopics']>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  useEffect(() => {
    const favorites: FavoriteProject[] = JSON.parse(localStorage.getItem('ideator_favorites') || '[]');
    setIsFavorited(favorites.some(f => f.video.id === video.id));
  }, [video.id]);

  useEffect(() => {
    if (result) {
      setLocalTopics(result.recommendedTopics);
      setLocalSeoData(result.seoData);
    }
  }, [result]);

  // Sync aspect ratio and default image count when format changes
  useEffect(() => {
    if (videoFormat === 'short') {
      setAspectRatio("9:16");
      setTargetImageCount(10);
    } else {
      setAspectRatio("16:9");
      setTargetImageCount(40);
    }
  }, [videoFormat]);

  // Trigger SEO strategy update when selected language changes
  useEffect(() => {
    const updateSeo = async () => {
      if (!result || !video.title || selectedLanguage === 'Korean') {
        if (result) setLocalSeoData(result.seoData);
        return;
      }
      setSeoUpdating(true);
      try {
        const newData = await generateSeoStrategy(video.title, result.audienceReaction, selectedLanguage);
        setLocalSeoData(newData);
      } catch (err) {
        console.error("SEO update error:", err);
      } finally {
        setSeoUpdating(false);
      }
    };
    updateSeo();
  }, [selectedLanguage, result, video.title]);

  const toggleFavorite = () => {
    const favorites: FavoriteProject[] = JSON.parse(localStorage.getItem('ideator_favorites') || '[]');
    let newFavorites: FavoriteProject[];

    if (isFavorited) {
      newFavorites = favorites.filter(f => f.video.id !== video.id);
    } else {
      const newFav: FavoriteProject = {
        id: video.id,
        video,
        result,
        scriptOutline,
        savedAt: Date.now()
      };
      newFavorites = [newFav, ...favorites];
    }

    localStorage.setItem('ideator_favorites', JSON.stringify(newFavorites));
    setIsFavorited(!isFavorited);
    
    window.dispatchEvent(new Event('favoritesChanged'));
  };

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (bgmUrl) URL.revokeObjectURL(bgmUrl);
      setBgmUrl(URL.createObjectURL(file));
    }
  };

  const handleRegenerateTopics = async () => {
    if (!result) return;
    setTopicsLoading(true);
    try {
      const newTopics = await regenerateSubTopics(video.title, result.audienceReaction);
      setLocalTopics(newTopics);
    } catch (err) {
      console.error(err);
      alert("주제 재생성 실패");
    } finally {
      setTopicsLoading(false);
    }
  };

  const startProduction = async () => {
    if (!scriptOutline) return;
    
    const finalPrompt = visualStyle.id === 'custom' ? customStylePrompt : visualStyle.prompt;
    if (visualStyle.id === 'custom' && !finalPrompt.trim()) {
      alert("커스텀 스타일 프롬프트를 입력해주세요.");
      return;
    }

    setStep('scripting');
    setProducedAssets([]);
    setFullScript("");
    setSubtitles([]);
    
    try {
      const isShort = videoFormat === 'short';
      setProductionProgress(`AI가 ${selectedLanguage} 버전의 ${isShort ? '숏폼' : '롱폼'} 대본을 기획 중입니다...`);
      
      const plan = await generateProductionPlan(scriptOutline, isShort, finalPrompt, targetImageCount, selectedLanguage);
      setFullScript(plan.fullScript);
      setSubtitles(plan.subtitles);
      setCurrentPlan(plan);

      setProductionProgress(`${selectedLanguage} 음성 합성(TTS) 에셋을 생성하고 있습니다...`);
      const audioUrl = await generateTTS(plan.fullScript, selectedLanguage);
      setProducedAssets([{ type: 'audio', url: audioUrl }]);

      generateImagesInBatch(plan);
    } catch (err: any) {
      alert("제작 중 오류: " + err.message);
      setStep('idle');
    }
  };

  const generateImagesInBatch = async (plan: ProductionPlan) => {
    setStep('imaging');
    setProducedAssets(prev => prev.filter(a => a.type === 'audio'));
    
    const total = plan.imagePrompts.length;
    try {
      for (let i = 0; i < total; i++) {
        setProductionProgress(`이미지 스토리보드 생성 중... (${i + 1} / ${total})`);
        const imgUrl = await generateImage(plan.imagePrompts[i], aspectRatio);
        setProducedAssets(prev => [
          ...prev, 
          { type: 'image', url: imgUrl, prompt: plan.imagePrompts[i] }
        ]);
      }
      setStep('review_images');
      setProductionProgress("");
    } catch (err: any) {
      console.error(err);
      setStep('review_images');
    }
  };

  const regenerateSingleImage = async (asset: GeneratedAsset, globalIdx: number) => {
    if (!asset.prompt) return;
    setRegeneratingIndex(globalIdx);
    try {
      const newUrl = await generateImage(asset.prompt, aspectRatio);
      setProducedAssets(prev => prev.map((a, idx) => 
        idx === globalIdx ? { ...a, url: newUrl } : a
      ));
    } catch (err) {
      alert("이미지 재생성 실패");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const generateVideoClips = async () => {
    if (!currentPlan) return;
    setStep('videoing');
    
    const isShort = videoFormat === 'short';
    const clipCount = isShort ? 7 : 18;
    const images = producedAssets.filter(a => a.type === 'image');
    
    const stepSize = Math.max(1, Math.floor(images.length / clipCount));
    const selectedImages = [];
    for (let i = 0; i < clipCount && (i * stepSize) < images.length; i++) {
      selectedImages.push(images[i * stepSize]);
    }

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        setProductionProgress(`비디오 클립 렌더링 중... (${i + 1} / ${selectedImages.length})`);
        const target = selectedImages[i];
        const videoUrl = await generateVeoVideo(target.prompt || "Video Clip", target.url, aspectRatio);
        
        setProducedAssets(prev => [
          ...prev, 
          { type: 'video', url: videoUrl, prompt: target.prompt }
        ]);
      }
      setStep('completed');
    } catch (err: any) {
      alert("영상 제작 오류: " + err.message);
      setStep('review_images');
    }
  };

  const assembleFullVideo = async () => {
    const images = producedAssets.filter(a => a.type === 'image');
    const audioAsset = producedAssets.find(a => a.type === 'audio');
    const canvas = exportCanvasRef.current;

    if (!images.length || !audioAsset || !canvas) {
      alert("영상 제작에 필요한 이미지나 오디오가 없습니다.");
      return;
    }

    setIsAssembling(true);
    setAssembleProgress(0);

    try {
      const audioBuffer = await decodePCM(audioAsset.url);
      const totalDuration = audioBuffer.duration;
      const durationPerImage = totalDuration / images.length;

      const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
      const baseWidth = 1280;
      canvas.width = baseWidth;
      canvas.height = Math.floor(baseWidth * (hRatio / wRatio));
      const ctx = canvas.getContext('2d')!;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      const ttsSource = audioCtx.createBufferSource();
      ttsSource.buffer = audioBuffer;
      const ttsGain = audioCtx.createGain();
      ttsGain.gain.value = ttsVolume;
      ttsSource.connect(ttsGain);
      ttsGain.connect(dest);
      ttsSource.start(0);

      if (bgmUrl) {
        const bgmRes = await fetch(bgmUrl);
        const bgmArrayBuffer = await bgmRes.arrayBuffer();
        const bgmBuffer = await audioCtx.decodeAudioData(bgmArrayBuffer);
        const bgmSource = audioCtx.createBufferSource();
        bgmSource.buffer = bgmBuffer;
        bgmSource.loop = true;
        const bgmGain = audioCtx.createGain();
        bgmGain.gain.value = bgmVolume;
        bgmSource.connect(bgmGain);
        bgmGain.connect(dest);
        bgmSource.start(0);
      }

      const canvasStream = canvas.captureStream(30); 
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewVideoUrl(url);
        setIsAssembling(false);
        audioCtx.close();
      };

      recorder.start();

      const startTime = Date.now();
      const renderFrame = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= totalDuration) {
          recorder.stop();
          return;
        }

        const newIdx = Math.min(images.length - 1, Math.floor(elapsed / durationPerImage));
        setAssembleProgress(Math.floor((elapsed / totalDuration) * 100));

        const imgAsset = images[newIdx];
        const img = new Image();
        img.src = imgAsset.url;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let dW, dH, dX, dY;
        if (imgRatio > canvasRatio) {
            dH = canvas.height;
            dW = canvas.height * imgRatio;
            dX = -(dW - canvas.width) / 2;
            dY = 0;
        } else {
            dW = canvas.width;
            dH = canvas.width / imgRatio;
            dX = 0;
            dY = -(dH - canvas.height) / 2;
        }
        ctx.drawImage(img, dX, dY, dW, dH);

        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "bold 20px Inter";
        ctx.fillText("Ideator Pro AI", 40, canvas.height - 40);

        requestAnimationFrame(renderFrame);
      };

      renderFrame();
    } catch (err: any) {
      console.error(err);
      alert("통합 영상 제작 중 오류 발생: " + err.message);
      setIsAssembling(false);
    }
  };

  const playAudio = async (url: string) => {
    try {
      const buffer = await decodePCM(url);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) { console.error(e); }
  };

  const convertToSRT = (segments: SubtitleSegment[]) => {
    return segments.map(s => {
      return `${s.index}\n${s.start} --> ${s.end}\n${s.text}\n`;
    }).join('\n');
  };

  const downloadAll = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    try {
      zip.file(`script_${selectedLanguage}.txt`, fullScript);
      if (subtitles.length > 0) {
        zip.file(`subtitles_${selectedLanguage}.srt`, convertToSRT(subtitles));
        zip.file(`subtitles_${selectedLanguage}.json`, JSON.stringify(subtitles, null, 2));
      }

      const imgFolder = zip.folder("images");
      const images = producedAssets.filter(a => a.type === 'image');
      for (let i = 0; i < images.length; i++) {
        const base64 = images[i].url.split(',')[1];
        imgFolder?.file(`scene_${i+1}.png`, base64, {base64: true});
      }

      const videoFolder = zip.folder("videos");
      const videos = producedAssets.filter(a => a.type === 'video');
      for (let i = 0; i < videos.length; i++) {
        const res = await fetch(videos[i].url);
        videoFolder?.file(`clip_${i+1}.mp4`, await res.blob());
      }

      const audio = producedAssets.find(a => a.type === 'audio');
      if (audio) {
        const res = await fetch(audio.url);
        zip.file(`narration_${selectedLanguage}.pcm`, await res.arrayBuffer());
      }

      if (result) {
        zip.file("seo_strategy.json", JSON.stringify(result.seoData, null, 2));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${video.title.substring(0,15)}_${selectedLanguage}_full_production.zip`;
      link.click();
    } catch (e) { 
      console.error(e);
      alert("다운로드 중 오류가 발생했습니다."); 
    } finally { 
      setIsZipping(false); 
    }
  };

  const handleDownloadPreviewVideo = () => {
    if (!previewVideoUrl) return;
    const link = document.createElement('a');
    link.href = previewVideoUrl;
    link.download = `${video.title.substring(0, 15)}_assembled.webm`;
    link.click();
  };

  const getSEO = () => {
    if (!localSeoData) return null;
    const formatData = videoFormat === 'short' ? localSeoData.short : localSeoData.long;
    return seoPlatform === 'youtube' ? formatData.youtube : formatData.tiktok;
  };

  const currentSEO = getSEO();

  const isShort = videoFormat === 'short';
  const minImageCount = isShort ? 6 : 30;
  const maxImageCount = isShort ? 16 : 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-3xl">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-7xl max-h-[94vh] overflow-hidden shadow-2xl relative flex flex-col">
        
        <canvas ref={exportCanvasRef} className="hidden" />

        <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-white">AI 시네마틱 제작실</h2>
                <button 
                  onClick={toggleFavorite}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black transition-all border ${
                    isFavorited 
                      ? 'bg-rose-600 border-rose-500 text-white' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                  }`}
                >
                  <svg className={`w-4 h-4 ${isFavorited ? 'fill-current' : 'none'}`} stroke="currentColor" fill={isFavorited ? "currentColor" : "none"} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {isFavorited ? '즐겨찾기 해제' : '즐겨찾기 저장'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Global Multi-Language Protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-10 py-12 custom-scrollbar space-y-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 text-center space-y-6">
              <div className="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 font-medium">데이터 연산 중...</p>
            </div>
          ) : result ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-10">
                  <div className="bg-slate-800/20 p-10 rounded-[2.5rem] border border-slate-700/30">
                    <span className="text-rose-500 font-black text-[10px] uppercase tracking-widest block mb-6">AI Strategic Insight</span>
                    <p className="text-xl font-bold leading-tight text-slate-200 italic">"{result.audienceReaction}"</p>
                  </div>

                  <div className="bg-slate-800/10 border border-slate-800/60 p-8 rounded-[2.5rem] space-y-8">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                      <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                      Audio Mixing Studio
                    </h4>
                    
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Voice (TTS) Volume</label>
                          <span className="text-[10px] font-black text-rose-500">{Math.round(ttsVolume * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1.5" step="0.05" 
                          value={ttsVolume} 
                          onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                          className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-full appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Background Music Volume</label>
                          <span className="text-[10px] font-black text-emerald-500">{Math.round(bgmVolume * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1.0" step="0.05" 
                          value={bgmVolume} 
                          onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-full appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="pt-4 border-t border-slate-800/50">
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-2xl hover:bg-slate-800/40 hover:border-emerald-500/40 transition-all cursor-pointer group">
                          <svg className={`w-6 h-6 mb-2 ${bgmUrl ? 'text-emerald-500' : 'text-slate-600 group-hover:text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {bgmUrl ? '배경음악 변경하기' : '배경음악 (BGM) 업로드'}
                          </span>
                          <input type="file" accept="audio/*" className="hidden" onChange={handleBgmUpload} />
                        </label>
                        {bgmUrl && (
                          <p className="mt-2 text-[8px] text-center font-bold text-emerald-500 uppercase tracking-widest">Music Loaded ✓</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
                        추천 제작 서브 주제
                      </h4>
                      <button 
                        onClick={handleRegenerateTopics}
                        disabled={topicsLoading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50"
                      >
                        <svg className={`w-3 h-3 ${topicsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        추천 주제 다시 생성
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {localTopics.map((topic, i) => (
                        <button key={i} onClick={() => onKeywordSelect(topic.keyword)} className="group text-left p-6 rounded-3xl border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all bg-slate-900/30 flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-100 group-hover:text-rose-500 block">#{topic.keyword}</span>
                            <p className="text-[11px] text-slate-500 leading-snug">{topic.reason}</p>
                          </div>
                          <svg className="w-5 h-5 text-slate-700 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="p-10 bg-slate-800/10 border border-slate-800/60 rounded-[3rem]">
                    <h4 className="text-xs font-black text-slate-100 mb-8 uppercase tracking-widest">최종 프로덕션 가이드 설정</h4>
                    <div className="space-y-10">
                      
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">대본 및 TTS 언어 선택</p>
                        <div className="grid grid-cols-5 gap-2 p-2 bg-slate-950 rounded-2xl border border-slate-800">
                          {LANGUAGES.map(lang => (
                            <button 
                              key={lang.id}
                              onClick={() => setSelectedLanguage(lang.id)}
                              disabled={step !== 'idle'}
                              className={`py-3 rounded-xl text-[9px] font-black transition-all ${selectedLanguage === lang.id ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              {lang.label.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">영상 형식</p>
                          <div className="flex flex-col gap-3 p-2 bg-slate-950 rounded-2xl border border-slate-800">
                            <button 
                              onClick={() => setVideoFormat('short')}
                              disabled={step !== 'idle'}
                              className={`py-3 rounded-xl text-xs font-black transition-all ${videoFormat === 'short' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}
                            >
                              숏폼
                            </button>
                            <button 
                              onClick={() => setVideoFormat('long')}
                              disabled={step !== 'idle'}
                              className={`py-3 rounded-xl text-xs font-black transition-all ${videoFormat === 'long' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}
                            >
                              롱폼
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">화면 비율</p>
                          <div className="flex flex-col gap-3 p-2 bg-slate-950 rounded-2xl border border-slate-800">
                            {RATIOS[videoFormat].map(ratio => (
                              <button 
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                disabled={step !== 'idle'}
                                className={`py-3 rounded-xl text-xs font-black transition-all ${aspectRatio === ratio ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">이미지 생성 스타일 선택</p>
                        <div className="grid grid-cols-3 gap-3">
                          {VISUAL_STYLES.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => setVisualStyle(style)}
                              disabled={step !== 'idle'}
                              className={`py-3 rounded-xl text-[10px] font-black border transition-all ${
                                visualStyle.id === style.id 
                                  ? 'bg-rose-600 text-white border-rose-500 shadow-lg' 
                                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                        {visualStyle.id === 'custom' && (
                          <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                            <input 
                              type="text"
                              value={customStylePrompt}
                              onChange={(e) => setCustomStylePrompt(e.target.value)}
                              placeholder="원하는 영상 스타일 프롬프트를 입력하세요 (예: 80s Retro, Cyberpunk Noir)"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700"
                            />
                          </div>
                        )}
                      </div>

                      {localSeoData && (
                        <div className="pt-8 border-t border-slate-800/50">
                          <div className="flex justify-between items-center mb-6">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">제작 후 업로드 SEO 전략</p>
                            {seoUpdating && (
                              <span className="text-[8px] font-black text-rose-500 animate-pulse uppercase tracking-widest">언어 맞춤 최적화 중...</span>
                            )}
                          </div>
                          <div className="bg-slate-950/60 rounded-3xl border border-slate-800 overflow-hidden relative">
                            {seoUpdating && <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-10 flex items-center justify-center"></div>}
                            <div className="flex border-b border-slate-800">
                              <button onClick={() => setSeoPlatform('youtube')} className={`flex-1 py-3 text-[10px] font-black transition-all ${seoPlatform === 'youtube' ? 'bg-rose-600/10 text-rose-500' : 'text-slate-600'}`}>YOUTUBE SEO</button>
                              <button onClick={() => setSeoPlatform('tiktok')} className={`flex-1 py-3 text-[10px] font-black transition-all ${seoPlatform === 'tiktok' ? 'bg-rose-600/10 text-rose-500' : 'text-slate-600'}`}>TIKTOK SEO</button>
                            </div>
                            <div className="p-6 space-y-4">
                              <div>
                                <p className="text-[9px] font-black text-slate-600 uppercase mb-1 tracking-tighter">Recommended Title</p>
                                <p className="text-sm font-bold text-slate-200 leading-tight">{(currentSEO as any).title}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-600 uppercase mb-1 tracking-tighter">Optimal Description / Caption</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                  {seoPlatform === 'youtube' ? (currentSEO as any).description : (currentSEO as any).caption}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {(seoPlatform === 'youtube' ? (currentSEO as any).tags : (currentSEO as any).hashtags).map((t: string, idx: number) => (
                                  <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-500">#{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="mt-4 text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest text-center">선택한 {selectedLanguage}에 맞는 SEO 전략 수립 ✓</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(scriptLoading || scriptOutline) && (
                <section className="mt-20 pt-20 border-t border-slate-800/50">
                  <div className="flex flex-col items-center justify-center gap-8 mb-12">
                    <div className="flex items-center gap-6 w-full max-w-4xl">
                      <div className="w-14 h-14 flex items-center justify-center bg-white text-slate-950 rounded-2xl shadow-xl shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <h3 className="text-2xl font-black">AI 자동 제작 엔진</h3>
                        <p className="text-slate-500 text-xs font-medium">{selectedLanguage} 버전으로 자동 변환하여 제작합니다.</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-8 w-full">
                      {step === 'idle' && scriptOutline && (
                        <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="flex flex-col items-center gap-4">
                            <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] animate-pulse">
                              자동 제작 전 {isShort ? '숏폼은 6~16장' : '롱폼은 30~70장'} 중 선택
                            </p>
                            <div className="flex items-center gap-5 bg-slate-800/40 px-8 py-4 rounded-[2rem] border border-slate-800 shadow-inner">
                              <input 
                                type="range" 
                                min={minImageCount} 
                                max={maxImageCount} 
                                value={targetImageCount} 
                                onChange={(e) => setTargetImageCount(parseInt(e.target.value))}
                                className="w-48 md:w-64 accent-rose-600 bg-slate-700 h-1.5 rounded-full appearance-none cursor-pointer"
                              />
                              <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800">
                                <span className="text-sm font-black text-rose-500">{targetImageCount}</span>
                              </div>
                            </div>
                          </div>

                          <button onClick={startProduction} className="px-12 py-5 bg-rose-600 text-white rounded-[2rem] font-black hover:bg-rose-500 transition-all flex items-center gap-4 shadow-2xl shadow-rose-900/40 active:scale-95 text-base border-t border-rose-400/20 group">
                            자동 제작 시작 ({selectedLanguage})
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7"/></svg>
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap justify-center gap-4">
                        {(step === 'review_images' || step === 'completed') && (
                          <button 
                            onClick={assembleFullVideo} 
                            disabled={isAssembling}
                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 shadow-xl shadow-emerald-900/20 active:scale-95 text-sm flex items-center gap-2"
                          >
                            {isAssembling ? `통합 영상 제작 중 (${assembleProgress}%)` : '이미지 기반 통합 영상 제작 (WebM)'}
                          </button>
                        )}
                        {step === 'review_images' && (
                          <button onClick={generateVideoClips} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-500 shadow-xl shadow-rose-900/20 active:scale-95 text-sm">
                            영상 클립 렌더링 시작
                          </button>
                        )}
                        {step === 'completed' && (
                          <button onClick={downloadAll} disabled={isZipping} className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl flex items-center gap-3 active:scale-95 disabled:opacity-50 text-sm">
                            {isZipping ? "압축 중..." : "에셋 패키지 전체 다운로드 (.ZIP)"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {(step === 'scripting' || step === 'imaging' || step === 'videoing') && (
                    <div className="bg-slate-800/10 border border-slate-800 p-20 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-12 h-12 border-4 border-rose-600/20 border-t-rose-600 rounded-full animate-spin"></div>
                      <div className="space-y-2">
                        <p className="text-xl font-black text-white">{productionProgress}</p>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">AI가 {selectedLanguage} 시나리오에 맞춰 연산을 진행 중입니다.</p>
                      </div>
                    </div>
                  )}

                  {(step === 'review_images' || step === 'videoing' || step === 'completed') && (
                    <div className="grid lg:grid-cols-2 gap-12">
                      <div className="space-y-10">
                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 h-[500px] overflow-hidden flex flex-col">
                          <div className="flex justify-between items-center mb-6">
                            <h5 className="font-black text-rose-500 uppercase text-[9px] tracking-widest">Narrative Script & Subtitles ({selectedLanguage})</h5>
                            {producedAssets.find(a => a.type === 'audio') && (
                              <button onClick={() => playAudio(producedAssets.find(a => a.type === 'audio')!.url)} className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>
                              </button>
                            )}
                          </div>
                          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
                            {subtitles.length > 0 ? (
                                subtitles.map((s, i) => (
                                    <div key={i} className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/50">
                                        <div className="text-[10px] font-bold text-rose-500 mb-1">{s.start} - {s.end}</div>
                                        <p className="text-slate-200 text-sm leading-relaxed font-medium">{s.text}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                                    {fullScript}
                                </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          {producedAssets.filter(a => a.type === 'video').map((vid, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 overflow-hidden shadow-xl">
                                <div className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest px-2">Rendered Clip {idx + 1}</div>
                                <video src={vid.url} controls className="w-full rounded-2xl aspect-video bg-black shadow-lg" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-black text-slate-100 text-[10px] tracking-widest uppercase">AI Storyboard Gallery</h5>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-slate-800/40 px-2 py-1 rounded">Interactive Editor</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 h-[1000px] overflow-y-auto pr-4 custom-scrollbar">
                          {producedAssets.map((asset, globalIdx) => {
                            if (asset.type !== 'image') return null;
                            const isRegenerating = regeneratingIndex === globalIdx;
                            return (
                              <div key={globalIdx} className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg">
                                <div 
                                  className={`relative w-full overflow-hidden flex items-center justify-center cursor-zoom-in`} 
                                  style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                                  onClick={() => setPreviewImage(asset.url)}
                                >
                                  <img 
                                    src={asset.url} 
                                    className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${isRegenerating ? 'opacity-30 grayscale blur-[2px]' : 'opacity-100'}`} 
                                    alt="" 
                                  />
                                  {isRegenerating && (
                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                      <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                                      <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Regenerating...</span>
                                    </div>
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between pointer-events-none">
                                  <div className="flex justify-end pointer-events-auto">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        regenerateSingleImage(asset, globalIdx);
                                      }}
                                      disabled={isRegenerating}
                                      className="w-10 h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-xl active:scale-90 transition-all disabled:opacity-50"
                                      title="이 장면 다시 생성하기"
                                    >
                                      <svg className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em]">Scene Logic</span>
                                    <p className="text-[9px] text-slate-300 leading-relaxed line-clamp-4 font-medium italic">"{asset.prompt}"</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 'idle' && scriptOutline && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-700">
                      <div className="bg-slate-800/20 p-12 text-center border-b border-slate-800">
                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4">Draft Architecture</h4>
                        <h5 className="text-3xl font-black text-white">{scriptOutline.title}</h5>
                      </div>
                      <div className="p-12 space-y-8">
                        {scriptOutline.sections.map((section, idx) => (
                          <div key={idx} className="flex gap-8">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-slate-500 shrink-0">{idx + 1}</div>
                            <div className="space-y-1">
                              <h6 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{section.label}</h6>
                              <p className="text-slate-200 text-lg font-bold leading-tight">{section.content}</p>
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

      {(previewImage || previewVideoUrl) && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-8 md:p-12 animate-in fade-in duration-300"
          onClick={() => {
            setPreviewImage(null);
            setPreviewVideoUrl(null);
          }}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <button 
              className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-rose-600 text-white rounded-full transition-all"
              onClick={() => {
                setPreviewImage(null);
                setPreviewVideoUrl(null);
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            {previewImage && (
              <img 
                src={previewImage} 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                alt="Preview"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {previewVideoUrl && (
              <div 
                className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black"
                onClick={(e) => e.stopPropagation()}
              >
                <video src={previewVideoUrl} controls autoPlay className="w-full aspect-video" />
              </div>
            )}

            <div className="mt-6 flex gap-4">
              {previewImage && (
                <a 
                  href={previewImage} 
                  download="ai_scene.png"
                  className="px-6 py-3 bg-white text-slate-950 rounded-xl font-black text-xs hover:bg-slate-200 transition-all flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  이미지 저장
                </a>
              )}
              {previewVideoUrl && (
                <button 
                  onClick={handleDownloadPreviewVideo}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-500 transition-all flex items-center gap-3 shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  WebM 영상 다운로드
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisModal;
