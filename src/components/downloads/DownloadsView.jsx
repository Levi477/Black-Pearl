// Handles the display and management of active and completed Aria2 downloads.
import { Download, CheckCircle, Play, Pause, X } from "lucide-react";
import { formatBytes } from "../../utils/helpers";

export default function DownloadsView({
  activeDownloads,
  completedDownloads,
  setCompletedDownloads,
  currentTheme,
}) {
  return (
    <div className="p-8 w-full max-w-5xl mx-auto flex flex-col gap-10">
      <div>
        <h2
          className={`text-3xl font-black mb-6 flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
        >
          <Download className={currentTheme.iconColor} /> Active Downloads
        </h2>
        {activeDownloads.length === 0 ? (
          <p className="text-gray-400 italic bg-black/40 backdrop-blur-3xl border border-white/10 p-6 rounded-2xl">
            No active downloads.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {activeDownloads.map((d) => {
              const progress = d.total > 0 ? (d.completed / d.total) * 100 : 0;
              
              const isPreparing = d.completed === 0 && d.speed === 0;

              return (
                <div
                  key={d.gid}
                  className="bg-black/60 backdrop-blur-3xl p-6 rounded-2xl relative overflow-hidden shadow-lg border border-white/10"
                >
                  {isPreparing ? (
                    <div className="absolute top-0 left-0 h-1 w-full bg-blue-500/50 animate-pulse" />
                  ) : (
                    <div
                      className={`absolute top-0 left-0 h-1 ${currentTheme.color} transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  )}

                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold truncate pr-4 text-lg text-white">
                      {d.gameName || d.name}
                    </h4>
                    
                    {isPreparing ? (
                      <span className="font-mono text-xs font-black text-blue-400 animate-pulse shrink-0 uppercase tracking-widest">
                        Preparing...
                      </span>
                    ) : (
                      <span className="font-mono text-sm font-bold text-gray-300 shrink-0">
                        {formatBytes(d.speed)}/s
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-300 mb-4 font-mono">
                    {/* STATUS TEXT */}
                    {isPreparing ? (
                      <span className="text-gray-500 italic">Resolving links & allocating...</span>
                    ) : (
                      <span>
                        {formatBytes(d.completed)} / {formatBytes(d.total)}
                      </span>
                    )}
                    
                    <span>{isPreparing ? "0.0%" : `${progress.toFixed(1)}%`}</span>
                  </div>

                  <div className="flex gap-2">
                    {d.status === "paused" ? (
                      <button
                        onClick={() => window.api.resumeDownload(d.gid)}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                      >
                        <Play size={18} className="text-green-400" />
                      </button>
                    ) : (
                      <button
                        onClick={() => window.api.pauseDownload(d.gid)}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                      >
                        <Pause size={18} className="text-yellow-400" />
                      </button>
                    )}
                    <button
                      onClick={() => window.api.cancelDownload(d.gid)}
                      className="bg-white/10 hover:bg-red-500/50 p-2 rounded-lg transition-colors"
                    >
                      <X size={18} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-2xl font-black flex items-center gap-3 text-gray-300`}
          >
            <CheckCircle /> Completed Downloads
          </h2>
          <button
            onClick={() =>
              window.api.clearCompleted().then(() => setCompletedDownloads([]))
            }
            className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg font-bold text-gray-300 transition-colors"
          >
            Clear History
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {completedDownloads.map((c) => (
            <div
              key={c.gid}
              className="bg-black/40 backdrop-blur-3xl border border-white/10 p-5 rounded-xl flex justify-between items-center hover:bg-black/60 transition-colors"
            >
              <span className="truncate pr-4 font-bold text-gray-100">
                {c.gameName || c.name}
              </span>
              <span className="text-xs text-green-400 font-black tracking-widest uppercase bg-green-400/10 px-3 py-1 rounded-md">
                Completed
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}