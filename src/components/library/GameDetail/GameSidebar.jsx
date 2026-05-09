import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Play, Square, Loader2, RefreshCw, FolderOpen, Download, ChevronLeft, ChevronRight, CheckCircle, Magnet } from "lucide-react";

export default function GameSidebar({
  selectedGame, libraryEntry, isRunning, hasExe, showControls, currentTheme,
  launching, fetchingLinks, downloadLinks, downloadedParts, 
  handleChooseLauncher, handleLaunchGame, handleKillGame, handleDownload, setLibrary
}) {
  const [localParams, setLocalParams] = useState(libraryEntry?.launchParams || "");
  const [expandedSources, setExpandedSources] = useState({});

  useEffect(() => setLocalParams(libraryEntry?.launchParams || ""), [libraryEntry]);

  const toggleSource = (index) => {
    setExpandedSources(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="w-[450px] shrink-0 flex flex-col gap-4">
      {showControls && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-black/40 backdrop-blur-[40px] border p-8 rounded-3xl relative overflow-hidden shadow-2xl ${isRunning ? "border-green-500/40 shadow-green-500/10" : "border-white/10"}`}>
          <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${isRunning ? "from-green-500 to-emerald-400" : currentTheme.textGradient}`} />
          <h3 className={`text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${isRunning ? "from-green-400 to-emerald-300" : currentTheme.textGradient}`}>
            <Gamepad2 className={isRunning ? "text-green-400" : currentTheme.iconColor} size={24} /> Game Controls
          </h3>
          <div className="flex flex-col gap-3">
            <button onClick={() => window.api.openGameFolder(libraryEntry?.exePath)} className="flex items-center justify-between bg-black/60 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-all text-left group">
              <span className="text-sm font-bold text-gray-200 group-hover:text-white">Open Game Folder</span>
              <FolderOpen size={18} className={`text-gray-400 group-hover:${currentTheme.iconColor} transition-colors`} />
            </button>

            {!hasExe ? (
              <button onClick={handleChooseLauncher} className="flex items-center justify-center gap-3 p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white">
                <Gamepad2 size={18} /> Choose Launcher
              </button>
            ) : isRunning ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                  <span className="text-sm font-black text-green-300 uppercase tracking-widest">Game Running</span>
                </div>
                <button onClick={handleKillGame} className="flex items-center justify-center gap-3 p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 hover:text-red-200">
                  <Square size={16} fill="currentColor" /> Exit Game
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button onClick={handleLaunchGame} disabled={launching} className={`flex items-center justify-center gap-3 p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${currentTheme.color} text-black`}>
                  {launching ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                  {launching ? "Launching..." : "Play"}
                </button>
                <button onClick={handleChooseLauncher} className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                  <RefreshCw size={13} /> Reselect Executable
                </button>
              </div>
            )}

            {hasExe && (
              <div className="mt-1 flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Executable</p>
                  <p className="text-xs text-gray-300 truncate font-mono" title={libraryEntry.exePath}>{libraryEntry.exePath.split(/[/\\]/).pop()}</p>
                </div>
                <div className="border-t border-white/5 pt-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Launch Parameters</p>
                  <input type="text" placeholder='-fullscreen' value={localParams} onChange={(e) => setLocalParams(e.target.value)} onBlur={async () => { if (localParams !== (libraryEntry.launchParams || "")) { const updated = await window.api.setLaunchParams(selectedGame.name, localParams); setLibrary(updated); } }} className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs text-gray-200 focus:outline-none focus:border-white/30 font-mono shadow-inner" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${currentTheme.textGradient}`} />
        <h3 className={`text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}>
          <Download className={currentTheme.iconColor} size={24} /> Direct Links
        </h3>
        
        <div className="flex flex-col gap-3">
          {fetchingLinks ? (
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl text-gray-400 font-bold uppercase tracking-widest text-sm border border-white/5">
              <Loader2 size={18} className="animate-spin" /> Scraping Links...
            </div>
          ) : downloadLinks.length === 0 ? (
            <div className="p-4 bg-white/5 rounded-xl text-gray-500 font-bold uppercase tracking-widest text-xs border border-white/5 text-center">
              No Direct Links Found
            </div>
          ) : (
            downloadLinks.map((originalLink, i) => {
              // BUG FIX: Convert 1-item arrays to pure strings to correctly render them as Single Links instead of Accordions
              const link = (Array.isArray(originalLink) && originalLink.length === 1) ? originalLink[0] : originalLink;

              // 1. ARRAY OF LINKS (Multi-Part)
              if (Array.isArray(link)) {
                const isExpanded = expandedSources[i];
                let siteName = "Direct Download";
                try { siteName = new URL(link[0]).hostname.replace('www.', ''); } catch(e){}
                const allPartsDone = link.every((_, pIdx) => downloadedParts[`${i}-${pIdx}`]);

                return (
                  <div key={i} className={`border rounded-xl overflow-hidden shadow-md ${allPartsDone ? 'bg-green-900/10 border-green-500/30' : 'bg-black/60 border-white/5'}`}>
                    <button onClick={() => toggleSource(i)} className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-all text-left group">
                       <div className="flex flex-col">
                          <span className={`text-[15px] font-bold uppercase tracking-wider transition-colors ${allPartsDone ? 'text-green-400' : 'text-gray-200 group-hover:text-white'}`}>
                            {siteName}
                          </span>
                          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">{link.length} Parts</span>
                       </div>
                       <div className="p-2 rounded-lg bg-white/5 transition-all text-gray-400">
                          {isExpanded ? <ChevronLeft className="-rotate-90" size={16}/> : <ChevronRight size={16}/>}
                       </div>
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                         <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`border-t ${allPartsDone ? 'border-green-500/30 bg-green-900/20' : 'border-white/5 bg-black/40'}`}>
                           <div className="p-3 grid grid-cols-2 gap-2">
                             {link.map((partUrl, pIdx) => {
                                const isPartDone = downloadedParts[`${i}-${pIdx}`];
                                return (
                                  <button key={pIdx} onClick={() => handleDownload(partUrl)} className={`flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold transition-all border ${isPartDone ? "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30" : `bg-white/5 hover:${currentTheme.activeBg} hover:text-black border-white/5 hover:border-transparent text-gray-300`}`}>
                                    {isPartDone ? <CheckCircle size={14} /> : <Download size={14} />} Part {pIdx + 1}
                                  </button>
                                )
                             })}
                           </div>
                           {!allPartsDone && (
                             <div className="p-3 border-t border-white/5 flex justify-end">
                               <button onClick={() => handleDownload(link)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs shadow-lg">
                                 Download Missing Parts
                               </button>
                             </div>
                           )}
                         </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              // 2. MAGNET / TORRENT LINK
              if (typeof link === 'string' && link.startsWith('magnet:')) {
                return (
                  <button key={i} onClick={() => handleDownload(link)} className="group flex items-center justify-between bg-green-900/20 border border-green-500/20 p-4 rounded-xl hover:bg-green-500/20 transition-all shadow-md hover:shadow-xl text-left">
                    <span className="truncate text-[15px] font-bold text-green-400 group-hover:text-green-300 transition-colors">Magnet / Torrent</span>
                    <div className="bg-green-500/10 border border-green-500/20 p-2.5 rounded-xl group-hover:bg-green-500 group-hover:text-black transition-colors">
                      <Magnet size={18} className="text-green-500 group-hover:text-black" />
                    </div>
                  </button>
                );
              }

              // 3. STANDARD DIRECT LINK (Single Link)
              if (typeof link === 'string') {
                let hostname = "Download Link";
                try { hostname = new URL(link).hostname.replace('www.', ''); } catch(e){}
                const isPartDone = downloadedParts[`${i}`];

                return (
                  <button key={i} onClick={() => handleDownload(link)} className={`group flex items-center justify-between border p-4 rounded-xl transition-all shadow-md hover:shadow-xl text-left ${isPartDone ? "bg-green-900/20 border-green-500/40 hover:bg-green-900/40" : "bg-black/60 border-white/5 hover:bg-white/10"}`}>
                    <span className={`truncate text-[15px] font-bold uppercase tracking-wider transition-colors ${isPartDone ? "text-green-400" : "text-gray-200 group-hover:text-white"}`}>
                      {hostname}
                    </span>
                    <div className={`${isPartDone ? "bg-green-500/20 text-green-400 border border-green-500/40" : `bg-white/5 border border-white/5 text-gray-400 group-hover:${currentTheme.activeBg} group-hover:text-black`} p-2.5 rounded-xl transition-colors`}>
                      {isPartDone ? <CheckCircle size={18} /> : <Download size={18} />}
                    </div>
                  </button>
                );
              }
            })
          )}
        </div>
      </div>
    </div>
  );
}