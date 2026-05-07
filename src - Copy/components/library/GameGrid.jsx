// Renders the grid layout mapping over the user's game library.
import { Loader2 } from "lucide-react";
import GameCard from "./GameCard";

export default function GameGrid({
  games,
  currentTheme,
  openGame,
  activeDownloads,
  isDownloaded,
  hasMore,
  loadMore,
  loadingMore,
}) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {games.map((game) => {
          const activeDl = activeDownloads.find(
            (d) => d.gameName === game.name,
          );
          const progress =
            activeDl && activeDl.total > 0
              ? (activeDl.completed / activeDl.total) * 100
              : 0;
          return (
            <GameCard
              key={game.name}
              game={game}
              currentTheme={currentTheme}
              openGame={openGame}
              isDownloadedStatus={isDownloaded(game.name)}
              activeDl={activeDl}
              activeDlProgress={progress}
            />
          );
        })}
      </div>
      {hasMore && (
        <div className="mt-12 mb-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 shadow-lg ${currentTheme.activeBg} border border-white/10 hover:scale-105 active:scale-95`}
          >
            {loadingMore ? (
              <>
                <Loader2
                  className={`animate-spin ${currentTheme.iconColor}`}
                  size={18}
                />{" "}
                LOADING...
              </>
            ) : (
              "LOAD MORE"
            )}
          </button>
        </div>
      )}
    </>
  );
}
