// Renders the user's game library with launcher status and remove option.
import { motion } from "framer-motion";
import { BookOpen, Trash2, Gamepad2, FolderOpen } from "lucide-react";

export default function LibraryView({
  library,
  currentTheme,
  openGame,
  onRemove,
  runningGames,
}) {
  return (
    <div className="p-8 w-full">
      <div className="flex items-center gap-4 mb-8">
        <h2
          className={`text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
        >
          <BookOpen className="inline mb-1 mr-2" size={28} />
          Library
        </h2>
        <span className="text-xs font-black uppercase tracking-widest text-gray-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          {library.length} {library.length === 1 ? "game" : "games"}
        </span>
      </div>

      {library.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 gap-4">
          <Gamepad2
            size={72}
            className={`opacity-30 ${currentTheme.iconColor}`}
          />
          <p className="text-lg font-bold text-center">Your library is empty</p>
          <p className="text-sm text-center max-w-xs">
            Games you download will automatically appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {library.map((game, i) => {
            const isRunning = runningGames.has(game.name);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group flex flex-col gap-3"
              >
                <div
                  onClick={() => openGame(game)}
                  className={`relative rounded-2xl overflow-hidden aspect-[3/4] bg-black/40 border transition-all duration-300 cursor-pointer shadow-xl ${
                    isRunning
                      ? "border-green-500/60 shadow-green-500/20"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <img
                    src={game.thumbnail_link}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt={game.name}
                  />

                  {/* Running pulse overlay */}
                  {isRunning && (
                    <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" />
                        <span className="text-[10px] font-black text-green-300 uppercase tracking-widest bg-black/60 px-2 py-1 rounded-full">
                          Running
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Launcher set badge */}
                  {game.exePath && !isRunning && (
                    <div className="absolute bottom-2 left-2 z-10 bg-black/70 backdrop-blur-sm text-white text-[9px] font-black tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                      <Gamepad2 size={10} className={currentTheme.iconColor} />
                      LAUNCHER SET
                    </div>
                  )}

                  {/* Hover overlay */}
                  {!isRunning && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      <span
                        className={`text-[10px] font-bold text-white px-2.5 py-1.5 rounded-lg bg-gradient-to-r ${currentTheme.textGradient}`}
                      >
                        {game.exePath ? "▶ PLAY" : "OPEN"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title + Remove */}
                <div className="flex items-start justify-between px-1 gap-2">
                  <h3
                    onClick={() => openGame(game)}
                    className="font-semibold text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2 flex-1 cursor-pointer"
                  >
                    {game.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(game.name);
                    }}
                    title="Remove from Library"
                    className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
