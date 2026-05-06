// Handles specific game views, Steam API fetches, wishlist toggles, and carousel refs.
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Heart,
  CheckCircle,
  PenTool,
  Layers,
  Calendar,
  Star,
  PlaySquare,
  ChevronRight,
  Info,
  HardDrive,
  Download,
} from "lucide-react";
import ProfileMenu from "../profile/ProfileMenu";

export default function GameDetail({
  selectedGame,
  setSelectedGame,
  currentTheme,
  isDownloaded,
  wishlist,
  setWishlist,
  detailMenuOpen,
  setDetailMenuOpen,
  profile,
  setCurrentView,
}) {
  const [steamData, setSteamData] = useState(null);
  const [steamLoading, setSteamLoading] = useState(true);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchSteam = async () => {
      setSteamLoading(true);
      const data = await window.api.getSteamMedia(selectedGame.name);
      setSteamData(data);
      setSteamLoading(false);
    };
    if (selectedGame) fetchSteam();
  }, [selectedGame]);

  const handleToggleWishlist = async () => {
    setWishlist(await window.api.toggleWishlist(selectedGame));
  };

  const scrollCarousel = (dir) => {
    if (carouselRef.current)
      carouselRef.current.scrollBy({
        left: dir === "left" ? -600 : 600,
        behavior: "smooth",
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#030303] flex flex-col overflow-y-auto no-scrollbar"
    >
      <div className="absolute top-8 left-8 right-8 z-50 flex justify-between items-start pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <button
            onClick={() => setSelectedGame(null)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 hover:bg-black/60 transition-all text-sm font-bold text-gray-200"
          >
            <ChevronLeft size={18} className={currentTheme.iconColor} /> BACK TO
            BROWSE
          </button>
          <button
            onClick={handleToggleWishlist}
            className={`flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-3xl border transition-all text-sm font-bold ${wishlist.some((g) => g.name === selectedGame.name) ? "bg-pink-500/10 border-pink-500/30 text-pink-400" : "bg-black/40 border-white/10 hover:bg-black/60 text-gray-200"}`}
          >
            <Heart
              size={18}
              fill={
                wishlist.some((g) => g.name === selectedGame.name)
                  ? "currentColor"
                  : "none"
              }
              className={
                wishlist.some((g) => g.name === selectedGame.name)
                  ? "text-pink-400"
                  : currentTheme.iconColor
              }
            />
            {wishlist.some((g) => g.name === selectedGame.name)
              ? "SAVED TO WISHLIST"
              : "ADD TO WISHLIST"}
          </button>
        </div>
        <div className="pointer-events-auto">
          <ProfileMenu
            isOpen={detailMenuOpen}
            setOpen={setDetailMenuOpen}
            profile={profile}
            currentTheme={currentTheme}
            setCurrentView={setCurrentView}
            setSelectedGame={setSelectedGame}
            isOverlay={true}
          />
        </div>
      </div>

      <div className="relative pt-32 pb-12 px-12 shrink-0 w-full min-h-[55vh] flex flex-col justify-end">
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            src={selectedGame.thumbnail_link}
            className="w-full h-full object-cover scale-105 blur-[16px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/90 to-transparent" />
        </div>

        <div className="relative z-10 flex gap-10 items-end w-full max-w-[1400px] mx-auto mt-auto">
          <motion.img
            layoutId={`img-${selectedGame.name}`}
            src={selectedGame.thumbnail_link}
            className="w-64 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10 z-20 bg-black aspect-[3/4] object-cover shrink-0"
          />
          <div className="pb-2 w-full">
            {isDownloaded(selectedGame.name) && (
              <span className="mb-4 inline-flex items-center gap-2 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-1.5 rounded-full text-xs font-black tracking-widest">
                <CheckCircle size={14} /> DOWNLOADED
              </span>
            )}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl md:text-6xl font-black tracking-tight mb-6 drop-shadow-2xl text-white leading-tight"
            >
              {selectedGame.name}
            </motion.h1>

            <div className="flex flex-wrap items-center gap-x-12 gap-y-4 pt-4 border-t border-white/10 w-full">
              {steamData?.developers && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5">
                    <PenTool size={12} className={currentTheme.iconColor} />{" "}
                    Developer
                  </span>
                  <span className="text-sm font-bold text-gray-200">
                    {steamData.developers[0]}
                  </span>
                </div>
              )}
              {steamData?.publishers && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5">
                    <Layers size={12} className={currentTheme.iconColor} />{" "}
                    Publisher
                  </span>
                  <span className="text-sm font-bold text-gray-200">
                    {steamData.publishers[0]}
                  </span>
                </div>
              )}
              {steamData?.release_date?.date && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5">
                    <Calendar size={12} className={currentTheme.iconColor} />{" "}
                    Release Date
                  </span>
                  <span className="text-sm font-bold text-gray-200">
                    {steamData.release_date.date}
                  </span>
                </div>
              )}
              {steamData?.metacritic && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5">
                    <Star size={12} className={currentTheme.iconColor} />{" "}
                    Metacritic
                  </span>
                  <span
                    className={`text-sm font-black ${steamData.metacritic.score >= 80 ? "text-green-400" : "text-yellow-400"}`}
                  >
                    {steamData.metacritic.score} / 100
                  </span>
                </div>
              )}
              {!steamData && selectedGame.categories && (
                <div className="flex gap-2 flex-wrap">
                  {selectedGame.categories.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      className={`bg-white/5 border border-white/10 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${currentTheme.iconColor}`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-[#030303] w-full pt-10 pb-8 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto w-full px-12">
          <h2
            className={`flex items-center gap-3 text-2xl font-black mb-6 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
          >
            <PlaySquare className={currentTheme.iconColor} /> Media Gallery
          </h2>
          <div className="relative group/carousel">
            {steamLoading ? (
              <div className="flex gap-6 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[450px] h-72 skeleton rounded-2xl shrink-0 shadow-xl"
                  />
                ))}
              </div>
            ) : steamData ? (
              <>
                <button
                  onClick={() => scrollCarousel("left")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl"
                >
                  <ChevronLeft size={30} className={currentTheme.iconColor} />
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl"
                >
                  <ChevronRight size={30} className={currentTheme.iconColor} />
                </button>
                <motion.div
                  ref={carouselRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x"
                >
                  {steamData.movies?.map((m) =>
                    m.webm?.max ? (
                      <video
                        key={m.id}
                        src={m.webm.max}
                        controls
                        className="h-72 rounded-2xl shrink-0 border border-white/10 bg-black snap-center shadow-2xl object-cover"
                      />
                    ) : null,
                  )}
                  {steamData.screenshots?.map((s) => (
                    <img
                      key={s.id}
                      src={s.path_full}
                      className="h-72 rounded-2xl shrink-0 border border-white/10 snap-center object-cover shadow-2xl"
                      alt="screenshot"
                    />
                  ))}
                </motion.div>
              </>
            ) : (
              <p className="text-gray-400 italic bg-white/5 border border-white/5 p-8 rounded-2xl font-medium">
                No external media found for this title.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-[#030303] flex-1 w-full">
        <div className="max-w-[1400px] mx-auto w-full px-12 py-12 flex flex-col gap-10">
          {steamData?.short_description && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-10 rounded-3xl w-full shadow-2xl"
            >
              <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-white uppercase tracking-widest">
                <Info className="text-gray-400" size={24} /> About Game
              </h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: steamData.short_description,
                }}
                className="text-gray-200 leading-relaxed text-base max-w-5xl"
              />
            </motion.div>
          )}

          <div className="flex gap-12 w-full">
            <div className="flex-1 min-w-0">
              <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-10 rounded-3xl relative overflow-hidden shadow-2xl">
                <div
                  className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${currentTheme.textGradient}`}
                />
                <h3
                  className={`text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
                >
                  <HardDrive className={currentTheme.iconColor} size={24} />{" "}
                  System Requirements
                </h3>
                {steamLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 skeleton rounded w-3/4" />
                    <div className="h-4 skeleton rounded w-1/2" />
                    <div className="h-4 skeleton rounded w-5/6 mt-6" />
                  </div>
                ) : steamData?.pc_requirements?.minimum ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none text-gray-300 leading-loose"
                    dangerouslySetInnerHTML={{
                      __html: steamData.pc_requirements.minimum,
                    }}
                  />
                ) : (
                  <p className="text-gray-500 italic">
                    Requirements not available on database.
                  </p>
                )}
              </div>
            </div>

            <div className="w-[450px] shrink-0 bg-black/40 backdrop-blur-[40px] border border-white/10 p-10 rounded-3xl relative overflow-hidden shadow-2xl self-start">
              <div
                className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${currentTheme.textGradient}`}
              />
              <h3
                className={`text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
              >
                <Download className={currentTheme.iconColor} size={24} /> Direct
                Links
              </h3>
              <div className="flex flex-col gap-4">
                {selectedGame.download_links.map((link, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      window.api.startSmartDownload(link, selectedGame.name)
                    }
                    className="group flex items-center justify-between bg-black/60 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-all shadow-md hover:shadow-xl text-left"
                  >
                    <span className="truncate text-[15px] font-bold text-gray-200 group-hover:text-white transition-colors">
                      {new URL(link).hostname}
                    </span>
                    <div
                      className={`bg-white/5 border border-white/5 p-2.5 rounded-xl group-hover:${currentTheme.activeBg} transition-colors`}
                    >
                      <Download
                        size={18}
                        className="text-gray-400 group-hover:text-white"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
