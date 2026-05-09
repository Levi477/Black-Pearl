import { motion } from "framer-motion";
import { CheckCircle, PenTool, Layers, Calendar, HardDrive, Star, Tag, Info } from "lucide-react";

export default function GameHeader({ selectedGame, steamData, currentTheme, isDownloaded }) {
  const getCategories = () => {
    if (!selectedGame.categories) return [];
    if (Array.isArray(selectedGame.categories)) return selectedGame.categories;
    if (typeof selectedGame.categories === 'string') return selectedGame.categories.split(',').map(s => s.trim());
    return [];
  };

  return (
    <div className="relative pb-12 px-12 shrink-0 w-full min-h-[55vh] flex flex-col justify-end transition-all duration-300 pt-32">
      <div className="absolute inset-0 overflow-hidden">
        <motion.img initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} src={selectedGame.thumbnail_link} className="w-full h-full object-cover scale-105 blur-[16px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/90 to-transparent" />
      </div>

      <div className="relative z-10 flex gap-10 items-end w-full max-w-[1400px] mx-auto mt-auto">
        <div className="relative shrink-0 z-20">
           <motion.img layoutId={`img-${selectedGame.name}`} src={selectedGame.thumbnail_link} className="w-64 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10 bg-black aspect-[3/4] object-cover" />
           {selectedGame.tag && (
              <div className="absolute top-3 left-3 bg-red-600 text-white font-black px-3 py-1 rounded shadow-lg shadow-red-900/50 uppercase tracking-widest text-xs z-30">
                {selectedGame.tag}
              </div>
           )}
        </div>

        <div className="pb-2 w-full">
          {isDownloaded(selectedGame.name) && (
            <span className="mb-4 inline-flex items-center gap-2 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-1.5 rounded-full text-xs font-black tracking-widest">
              <CheckCircle size={14} /> DOWNLOADED
            </span>
          )}
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl md:text-6xl font-black tracking-tight mb-6 drop-shadow-2xl text-white leading-tight">
            {selectedGame.name}
          </motion.h1>

          <div className="flex flex-wrap items-center gap-x-12 gap-y-4 pt-4 border-t border-white/10 w-full">
            {steamData?.developers && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5"><PenTool size={12} className={currentTheme.iconColor} /> Developer</span>
                <span className="text-sm font-bold text-gray-200">{steamData.developers[0]}</span>
              </div>
            )}
            {steamData?.publishers && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5"><Layers size={12} className={currentTheme.iconColor} /> Publisher</span>
                <span className="text-sm font-bold text-gray-200">{steamData.publishers[0]}</span>
              </div>
            )}
            {steamData?.release_date?.date && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5"><Calendar size={12} className={currentTheme.iconColor} /> Release Date</span>
                <span className="text-sm font-bold text-gray-200">{steamData.release_date.date}</span>
              </div>
            )}
            {selectedGame.size && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5"><HardDrive size={12} className={currentTheme.iconColor} /> Size</span>
                <span className="text-sm font-bold text-gray-200">{selectedGame.size}</span>
              </div>
            )}
            {steamData?.metacritic && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5"><Star size={12} className={currentTheme.iconColor} /> Metacritic</span>
                <span className={`text-sm font-black ${steamData.metacritic.score >= 80 ? "text-green-400" : "text-yellow-400"}`}>{steamData.metacritic.score} / 100</span>
              </div>
            )}
            {getCategories().length > 0 && (
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5"><Tag size={12} className={currentTheme.iconColor} /> Categories</span>
                 <div className="flex gap-2 flex-wrap mt-0.5">
                   {getCategories().slice(0, 4).map((c, idx) => (
                     <span key={idx} className={`bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${currentTheme.iconColor}`}>{c}</span>
                   ))}
                 </div>
              </div>
            )}
          </div>
          
          {selectedGame.important_info && (
             <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl max-w-4xl">
                <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Info size={14} /> Important Information</h4>
                <p className="text-sm text-yellow-100/80 leading-relaxed whitespace-pre-wrap">{selectedGame.important_info}</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}