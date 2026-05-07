import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  FolderOpen,
  Gamepad2,
  Play,
  Square,
  RefreshCw,
  BookOpen,
  Loader2,
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
  // Library props
  library,
  setLibrary,
  runningGames,
  setRunningGames,
}) {
  const [steamData, setSteamData] = useState(null);
  const [steamLoading, setSteamLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  
  // Track parameters locally so typing doesn't feel laggy
  const [localParams, setLocalParams] = useState("");
  const carouselRef = useRef(null);

  // Derived library state
  const isInLibrary = library.some((g) => g.name === selectedGame.name);
  const libraryEntry = library.find((g) => g.name === selectedGame.name);
  const isRunning = runningGames.has(selectedGame.name);
  const hasExe = !!libraryEntry?.exePath;

  // Sync params state whenever we open a new game view
  useEffect(() => {
    setLocalParams(libraryEntry?.launchParams || "");
  }, [libraryEntry]);

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

  const handleDownload = async (link) => {
    window.api.startSmartDownload(link, selectedGame.name);
    if (!isInLibrary) {
      const updated = await window.api.addToLibrary(selectedGame);
      setLibrary(updated);
    }
  };

  const handleChooseLauncher = async () => {
    const exePath = await window.api.selectExe();
    if (exePath) {
      const updated = await window.api.setGameExe(selectedGame.name, exePath);
      setLibrary(updated);
    }
  };

  const handleLaunchGame = async () => {
    if (!libraryEntry?.exePath) return;
    setLaunching(true);
    const result = await window.api.launchGame(
      selectedGame.name,
      libraryEntry.exePath,
      libraryEntry.launchParams || ""
    );
    setLaunching(false);
    
    if (!result.success) {
      alert(`Failed to launch: ${result.message}`);
    }
  };

  const handleKillGame = async () => {
    await window.api.killGame(selectedGame.name);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#030303] flex flex-col overflow-y-auto no-scrollbar"
    >
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-0 left-0 right-0 z-[60] bg-green-500/20 border-b border-green-500/30 backdrop-blur-xl flex items-center justify-center gap-3 py-2.5"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
            <span className="text-sm font-black text-green-300 uppercase tracking-widest">
              {selectedGame.name} is Running
            </span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`absolute left-8 right-8 z-50 flex justify-between items-start pointer-events-none transition-all duration-300 ${
          isRunning ? "top-14" : "top-8"
        }`}
      >
        <div className="flex gap-3 pointer-events-auto flex-wrap">
          <button
            onClick={() => setSelectedGame(null)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 hover:bg-black/60 transition-all text-sm font-bold text-gray-200"
          >
            <ChevronLeft size={18} className={currentTheme.iconColor} /> BACK
          </button>
          <button
            onClick={handleToggleWishlist}
            className={`flex items-center gap-2 px-5 py-3 rounded-full backdrop-blur-3xl border transition-all text-sm font-bold ${
              wishlist.some((g) => g.name === selectedGame.name)
                ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                : "bg-black/40 border-white/10 hover:bg-black/60 text-gray-200"
            }`}
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
              ? "WISHLISTED"
              : "WISHLIST"}
          </button>

          {isInLibrary && (
            <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 text-sm font-bold text-gray-300">
              <BookOpen size={16} className={currentTheme.iconColor} />
              IN LIBRARY
            </div>
          )}
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

      <div
        className={`relative pb-12 px-12 shrink-0 w-full min-h-[55vh] flex flex-col justify-end transition-all duration-300 ${
          isRunning ? "pt-40" : "pt-32"
        }`}
      >
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
                    className={`text-sm font-black ${
                      steamData.metacritic.score >= 80
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
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

      {steamData?.short_description && (
        <div className="relative z-10 bg-[#030303] w-full pt-10 px-12">
          <div className="max-w-[1400px] mx-auto">
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
          </div>
        </div>
      )}

      <div className="relative z-10 bg-[#030303] flex-1 w-full">
        <div className="max-w-[1400px] mx-auto w-full px-12 py-12 flex gap-12">
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

          <div className="w-[450px] shrink-0 flex flex-col gap-4">
            {isInLibrary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-black/40 backdrop-blur-[40px] border p-8 rounded-3xl relative overflow-hidden shadow-2xl ${
                  isRunning
                    ? "border-green-500/40 shadow-green-500/10"
                    : "border-white/10"
                }`}
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${
                    isRunning
                      ? "from-green-500 to-emerald-400"
                      : currentTheme.textGradient
                  }`}
                />

                <h3
                  className={`text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${
                    isRunning
                      ? "from-green-400 to-emerald-300"
                      : currentTheme.textGradient
                  }`}
                >
                  <Gamepad2
                    className={
                      isRunning ? "text-green-400" : currentTheme.iconColor
                    }
                    size={24}
                  />
                  Game Controls
                </h3>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() =>
                      window.api.openGameFolder(libraryEntry?.exePath)
                    }
                    className="flex items-center justify-between bg-black/60 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-all text-left group"
                  >
                    <span className="text-sm font-bold text-gray-200 group-hover:text-white">
                      Open Game Folder
                    </span>
                    <FolderOpen
                      size={18}
                      className={`text-gray-400 group-hover:${currentTheme.iconColor} transition-colors`}
                    />
                  </button>

                  {!hasExe ? (
                    <button
                      onClick={handleChooseLauncher}
                      className={`flex items-center justify-center gap-3 p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white`}
                    >
                      <Gamepad2 size={18} />
                      Choose Launcher
                    </button>
                  ) : isRunning ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                        <span className="text-sm font-black text-green-300 uppercase tracking-widest">
                          Game Running
                        </span>
                      </div>
                      <button
                        onClick={handleKillGame}
                        className="flex items-center justify-center gap-3 p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 hover:text-red-200"
                      >
                        <Square size={16} fill="currentColor" />
                        Exit Game
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleLaunchGame}
                        disabled={launching}
                        className={`flex items-center justify-center gap-3 p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${currentTheme.color} text-black`}
                      >
                        {launching ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Play size={18} fill="currentColor" />
                        )}
                        {launching ? "Launching..." : "Play"}
                      </button>
                      <button
                        onClick={handleChooseLauncher}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                      >
                        <RefreshCw size={13} />
                        Reselect Executable
                      </button>
                    </div>
                  )}

                  {/* Exe path and Parameters display */}
                  {hasExe && (
                    <div className="mt-1 flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                          Executable
                        </p>
                        <p
                          className="text-xs text-gray-300 truncate font-mono"
                          title={libraryEntry.exePath}
                        >
                          {libraryEntry.exePath.split(/[/\\]/).pop()}
                        </p>
                      </div>
                      <div className="border-t border-white/5 pt-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                          Launch Parameters
                        </p>
                        <input
                          type="text"
                          placeholder='-fullscreen -res "1920 1080"'
                          value={localParams}
                          onChange={(e) => setLocalParams(e.target.value)}
                          onBlur={async () => {
                            if (localParams !== (libraryEntry.launchParams || "")) {
                              const updated = await window.api.setLaunchParams(selectedGame.name, localParams);
                              setLibrary(updated);
                            }
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-xs text-gray-200 focus:outline-none focus:border-white/30 transition-all font-mono placeholder:text-gray-600 shadow-inner"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
              <div
                className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${currentTheme.textGradient}`}
              />
              <h3
                className={`text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
              >
                <Download className={currentTheme.iconColor} size={24} /> Direct
                Links
              </h3>
              <div className="flex flex-col gap-3">
                {selectedGame.download_links.map((link, i) => (
                  <button
                    key={i}
                    onClick={() => handleDownload(link)}
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