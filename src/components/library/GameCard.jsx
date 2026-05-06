// Displays individual game metadata, poster artwork, and the play and download actions.
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function GameCard({
  game,
  currentTheme,
  openGame,
  isDownloadedStatus,
  activeDlProgress,
  activeDl,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={game.name}
      onClick={() => openGame(game)}
      className="group cursor-pointer flex flex-col gap-3"
    >
      <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-black/40 border border-white/10 hover:border-white/30 transition-all duration-300 shadow-xl">
        <motion.img
          layoutId={`img-${game.name}`}
          src={game.thumbnail_link}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt={game.name}
        />

        {isDownloadedStatus && (
          <div className="absolute bottom-3 left-3 z-20 bg-green-500/90 backdrop-blur-md text-white text-[10px] font-black tracking-widest px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/20">
            <CheckCircle size={14} /> DOWNLOADED
          </div>
        )}

        {activeDl ? (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-black"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="175.9"
                  strokeDashoffset={175.9 - (175.9 * activeDlProgress) / 100}
                  className={`transition-all duration-500 ${currentTheme.stroke}`}
                />
              </svg>
              <span className="absolute text-xs font-black text-white">
                {Math.round(activeDlProgress)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span
              className={`text-xs font-bold text-white px-3 py-1.5 rounded-lg shadow-lg bg-gradient-to-r ${currentTheme.textGradient}`}
            >
              VIEW DETAILS
            </span>
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2 px-1">
        {game.name}
      </h3>
    </motion.div>
  );
}
