import { useState } from "react";
import {
  Download,
  CheckCircle,
  Play,
  Pause,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatBytes } from "../../utils/helpers";

export default function DownloadsView({
  activeDownloads,
  completedDownloads,
  setCompletedDownloads,
  currentTheme,
}) {
  const [expandedGids, setExpandedGids] = useState(new Set());

  const toggleExpand = (gid) => {
    setExpandedGids((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gid)) newSet.delete(gid);
      else newSet.add(gid);
      return newSet;
    });
  };

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
              const isExpanded = expandedGids.has(d.gid);
              const hasFiles = d.files && d.files.length > 1;

              return (
                <div
                  key={d.gid}
                  className="bg-black/60 backdrop-blur-3xl p-6 rounded-2xl relative overflow-hidden shadow-lg border border-white/10 flex flex-col"
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
                    {isPreparing ? (
                      <span className="text-gray-500 italic">
                        Resolving links & allocating metadata...
                      </span>
                    ) : (
                      <span>
                        {formatBytes(d.completed)} / {formatBytes(d.total)}
                      </span>
                    )}
                    <span>
                      {isPreparing ? "0.0%" : `${progress.toFixed(1)}%`}
                    </span>
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

                  {/* SUB-FILES RENDERING (Torrent Tree) */}
                  {hasFiles && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => toggleExpand(d.gid)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                        {isExpanded
                          ? "Hide Files"
                          : `View Tracked Files (${d.files.length})`}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                          {d.files.map((file, idx) => {
                            const fileProgress =
                              file.total > 0
                                ? (file.completed / file.total) * 100
                                : 0;
                            return (
                              <div
                                key={idx}
                                className="bg-white/5 rounded-lg p-2 text-xs"
                              >
                                <div className="flex justify-between text-gray-300 mb-1">
                                  <span
                                    className="truncate pr-2"
                                    title={file.path}
                                  >
                                    {file.path || "Resolving..."}
                                  </span>
                                  <span className="shrink-0">
                                    {fileProgress.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                                  <div
                                    className={`${currentTheme.color} h-full opacity-70`}
                                    style={{ width: `${fileProgress}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
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
