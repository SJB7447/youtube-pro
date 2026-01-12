
import React from 'react';
import { YouTubeVideo } from '../types';

interface VideoCardProps {
  video: YouTubeVideo;
  onAnalyze: (video: YouTubeVideo) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onAnalyze }) => {
  const isViral = (video.efficiencyRatio || 0) > 100;
  const isUltraViral = (video.efficiencyRatio || 0) > 300;

  return (
    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300 group flex flex-col h-full">
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        {isViral && (
          <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-xl text-[10px] font-black text-white shadow-lg backdrop-blur-md ${isUltraViral ? 'bg-rose-600' : 'bg-orange-500'}`}>
            {isUltraViral ? 'ULTRA VIRAL 🔥' : 'TRENDING ✨'}
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 line-clamp-2 text-sm leading-relaxed mb-3 group-hover:text-rose-600 transition-colors" 
              dangerouslySetInnerHTML={{ __html: video.title }} />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
            {video.channelTitle}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-50/80 p-3 rounded-2xl text-center border border-slate-100">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1">Views</p>
            <p className="text-sm font-black text-slate-800">{(video.viewCount / 1000).toFixed(1)}k</p>
          </div>
          <div className="bg-slate-50/80 p-3 rounded-2xl text-center border border-slate-100">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1">Efficiency</p>
            <p className={`text-sm font-black ${(video.efficiencyRatio || 0) > 100 ? 'text-rose-600' : 'text-slate-800'}`}>
              {(video.efficiencyRatio || 0).toFixed(0)}%
            </p>
          </div>
        </div>

        <button 
          onClick={() => onAnalyze(video)}
          className="w-full py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all text-xs font-black shadow-lg shadow-slate-100 active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          AI 소재 분석
        </button>
      </div>
    </div>
  );
};

export default VideoCard;
