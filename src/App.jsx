import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  PlaySquare,
  HardDrive,
  Palette,
  Loader2,
  Menu,
  Info,
  Ship,
} from "lucide-react";

const THEMES = [
  {
    id: "aurora",
    name: "Dark Aurora",
    class: "theme-aurora",
    color: "bg-purple-500",
    textGradient: "from-purple-400 to-indigo-400",
    activeBg: "bg-purple-500/20 text-purple-300",
    iconColor: "text-purple-400",
  },
  {
    id: "crimson",
    name: "Crimson Void",
    class: "theme-crimson",
    color: "bg-red-500",
    textGradient: "from-red-400 to-orange-400",
    activeBg: "bg-red-500/20 text-red-300",
    iconColor: "text-red-400",
  },
  {
    id: "emerald",
    name: "Emerald Sea",
    class: "theme-emerald",
    color: "bg-emerald-500",
    textGradient: "from-emerald-400 to-cyan-400",
    activeBg: "bg-emerald-500/20 text-emerald-300",
    iconColor: "text-emerald-400",
  },
  {
    id: "cyber",
    name: "Neon Cyber",
    class: "theme-cyber",
    color: "bg-blue-500",
    textGradient: "from-blue-400 to-fuchsia-400",
    activeBg: "bg-blue-500/20 text-blue-300",
    iconColor: "text-blue-400",
  },
  {
    id: "cyberpunk",
    name: "Night City",
    class: "theme-cyberpunk",
    color: "bg-yellow-400",
    textGradient: "from-yellow-400 to-amber-500",
    activeBg: "bg-yellow-400/20 text-yellow-300",
    iconColor: "text-yellow-400",
  },
];

export default function App() {
  const [extensions, setExtensions] = useState([]);
  const [activeExt, setActiveExt] = useState("");
  const [categories, setCategories] = useState([]);
  const [capabilities, setCapabilities] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedGame, setSelectedGame] = useState(null);
  const [steamData, setSteamData] = useState(null);
  const [steamLoading, setSteamLoading] = useState(false);

  const carouselRef = useRef(null);
  const localCache = useRef(new Map());

  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.api) {
      window.api.getExtensions().then((exts) => {
        setExtensions(exts);
        if (exts.length > 0) handleSelectExtension(exts[0]);
      });
    }
  }, []);

  const handleSelectExtension = async (name) => {
    setActiveExt(name);
    const data = await window.api.setExtension(name);
    setCategories(data.categories);
    setCapabilities(data.capabilities);
    localCache.current.clear();
    loadHomepage(name);
  };

  const loadHomepage = async (extName = activeExt) => {
    const cacheKey = `home_${extName}`;
    if (localCache.current.has(cacheKey)) {
      setActiveCategory(null);
      setSearchQuery("");
      setPage(1);
      setHasMore(false);
      setGames(localCache.current.get(cacheKey));
      setLoading(false);
      return;
    }

    setLoading(true);
    setActiveCategory(null);
    setSearchQuery("");
    setPage(1);
    setHasMore(false);
    const data = await window.api.getHomepage();
    localCache.current.set(cacheKey, data);
    setGames(data);
    setLoading(false);
  };

  const loadCategory = async (cat) => {
    const cacheKey = `cat_${activeExt}_${cat}_1`;
    if (localCache.current.has(cacheKey)) {
      setActiveCategory(cat);
      setSearchQuery("");
      setPage(1);
      const cachedData = localCache.current.get(cacheKey);
      setGames(cachedData);
      setHasMore(cachedData.length > 0 && capabilities.hasCategoryPagination);
      setLoading(false);
      return;
    }

    setLoading(true);
    setActiveCategory(cat);
    setSearchQuery("");
    setPage(1);
    const data = await window.api.getCategory(cat, 1);
    localCache.current.set(cacheKey, data);
    setGames(data);
    setHasMore(data.length > 0 && capabilities.hasCategoryPagination);
    setLoading(false);
  };

  const handleSearch = async (e) => {
    if (e.key !== "Enter" || !searchQuery.trim()) return;
    const cacheKey = `search_${activeExt}_${searchQuery}_1`;

    if (localCache.current.has(cacheKey)) {
      setActiveCategory(null);
      setPage(1);
      const cachedData = localCache.current.get(cacheKey);
      setGames(cachedData);
      setHasMore(cachedData.length > 0 && capabilities.hasSearchPagination);
      setLoading(false);
      return;
    }

    setLoading(true);
    setActiveCategory(null);
    setPage(1);
    const data = await window.api.searchGames(searchQuery, 1);
    localCache.current.set(cacheKey, data);
    setGames(data);
    setHasMore(data.length > 0 && capabilities.hasSearchPagination);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    let cacheKey = "";
    if (activeCategory)
      cacheKey = `cat_${activeExt}_${activeCategory}_${nextPage}`;
    else if (searchQuery)
      cacheKey = `search_${activeExt}_${searchQuery}_${nextPage}`;

    if (localCache.current.has(cacheKey)) {
      const cachedData = localCache.current.get(cacheKey);
      if (cachedData.length === 0) setHasMore(false);
      else {
        setGames((prev) => [...prev, ...cachedData]);
        setPage(nextPage);
      }
      setLoadingMore(false);
      return;
    }

    let newData = [];
    if (activeCategory)
      newData = await window.api.getCategory(activeCategory, nextPage);
    else if (searchQuery)
      newData = await window.api.searchGames(searchQuery, nextPage);

    localCache.current.set(cacheKey, newData);

    if (newData.length === 0) setHasMore(false);
    else {
      setGames((prev) => [...prev, ...newData]);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const openGame = async (game) => {
    setSelectedGame(game);
    setSteamData(null);
    setSteamLoading(true);
    const data = await window.api.getSteamMedia(game.name);
    setSteamData(data);
    setSteamLoading(false);
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -600 : 600;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Protect the grid layout by filtering out exact duplicates returned by the scraper
  const uniqueGames = games.filter(
    (game, index, self) =>
      index === self.findIndex((t) => t.name === game.name),
  );

  return (
    <div
      className={`flex h-screen w-screen text-white overflow-hidden p-3 gap-3 transition-colors duration-1000 ${currentTheme.class}`}
    >
      {/* COLLAPSIBLE SIDEBAR */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0, marginLeft: -12 }}
            animate={{ width: 256, opacity: 1, marginLeft: 0 }}
            exit={{ width: 0, opacity: 0, marginLeft: -12 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="glass-panel rounded-3xl flex flex-col overflow-hidden shrink-0 whitespace-nowrap"
          >
            <div className="p-6 border-b border-white/5 bg-black/20">
              <h2
                className={`text-2xl font-black flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
              >
                <Ship className={currentTheme.iconColor} size={28} /> Black
                Pearl
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 no-scrollbar">
              <p
                className={`text-xs font-bold mb-2 uppercase tracking-widest ${currentTheme.iconColor}`}
              >
                Extensions
              </p>
              <select
                className="w-full glass-inner rounded-xl p-2.5 mb-6 text-sm outline-none transition-colors text-white"
                value={activeExt}
                onChange={(e) => handleSelectExtension(e.target.value)}
              >
                {extensions.map((ext) => (
                  <option key={ext} value={ext} className="bg-slate-900">
                    {ext}
                  </option>
                ))}
              </select>

              <p
                className={`text-xs font-bold mb-2 uppercase tracking-widest ${currentTheme.iconColor}`}
              >
                Browse
              </p>
              <button
                onClick={() => loadHomepage()}
                className={`px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${!activeCategory && !searchQuery ? currentTheme.activeBg : "hover:bg-white/5 text-gray-400"}`}
              >
                Homepage
              </button>

              <div className="mt-2 flex flex-col gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => loadCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-left text-sm font-semibold capitalize transition-all ${activeCategory === cat ? currentTheme.activeBg : "hover:bg-white/5 text-gray-400 hover:text-white"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
              <Palette size={18} className="text-gray-400 shrink-0" />
              <div className="flex gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    title={theme.name}
                    onClick={() => setCurrentTheme(theme)}
                    className={`w-4 h-4 rounded-full shrink-0 ${theme.color} ${currentTheme.id === theme.id ? "ring-2 ring-white scale-125 shadow-lg shadow-white/20" : "opacity-40 hover:opacity-100"} transition-all`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEW */}
      <div className="flex-1 relative flex flex-col overflow-hidden rounded-3xl glass-panel">
        {/* Top Navigation */}
        <div className="h-20 border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-10 bg-black/10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 glass-inner rounded-xl transition-colors hover:bg-white/10 text-white"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold tracking-widest text-gray-200">
              {activeCategory
                ? activeCategory.toUpperCase()
                : searchQuery
                  ? "SEARCH RESULTS"
                  : "DISCOVER"}
            </h1>
          </div>

          <div className="relative group">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${currentTheme.iconColor} opacity-70`}
              size={18}
            />
            <input
              type="text"
              placeholder="Search the seven seas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="glass-inner rounded-full py-2.5 pl-12 pr-6 w-64 md:w-80 text-sm focus:outline-none focus:bg-black/60 transition-all placeholder:text-gray-500 text-white"
            />
          </div>
        </div>

        {/* Game Grid with Pagination */}
        <div className="flex-1 overflow-y-auto p-8 relative no-scrollbar">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="rounded-2xl aspect-[3/4] skeleton shadow-lg" />
                  <div className="h-4 skeleton rounded w-3/4 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {uniqueGames.map((game) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={game.name}
                    onClick={() => openGame(game)}
                    className="group cursor-pointer flex flex-col gap-3"
                  >
                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] glass-inner hover:border-white/30 transition-all duration-300 shadow-xl">
                      <motion.img
                        layoutId={`img-${game.name}`}
                        src={game.thumbnail_link}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt={game.name}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <span
                          className={`text-xs font-bold text-white px-3 py-1.5 rounded-lg shadow-lg bg-gradient-to-r ${currentTheme.textGradient}`}
                        >
                          VIEW DETAILS
                        </span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2 px-1">
                      {game.name}
                    </h3>
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 mb-4 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 shadow-lg ${currentTheme.activeBg} hover:bg-black/40 border border-white/10`}
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
          )}
        </div>

        {/* FULL SCREEN DETAIL OVERLAY */}
        <AnimatePresence>
          {selectedGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#030303] flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="relative h-[55vh] shrink-0 w-full flex items-end pb-12 px-12 pt-24">
                <div className="absolute inset-0 overflow-hidden">
                  <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                    src={selectedGame.thumbnail_link}
                    className="w-full h-full object-cover scale-105 blur-[8px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent" />
                </div>

                <button
                  onClick={() => setSelectedGame(null)}
                  className="absolute top-8 left-8 z-50 flex items-center gap-2 px-6 py-3 rounded-full glass-inner hover:bg-white/10 transition-all text-sm font-bold text-gray-200"
                >
                  <ChevronLeft size={18} className={currentTheme.iconColor} />{" "}
                  BACK
                </button>

                <div className="relative z-10 flex gap-8 items-end w-full max-w-[1400px] mx-auto mt-auto">
                  <motion.img
                    layoutId={`img-${selectedGame.name}`}
                    src={selectedGame.thumbnail_link}
                    className="w-64 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 z-20 bg-black aspect-[3/4] object-cover"
                  />
                  <div className="pb-4 z-20">
                    <motion.h1
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-5xl md:text-6xl font-black tracking-tight mb-6 drop-shadow-2xl text-white"
                    >
                      {selectedGame.name}
                    </motion.h1>
                    <div className="flex gap-2 flex-wrap">
                      {selectedGame.categories.map((c) => (
                        <span
                          key={c}
                          className={`glass-inner px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${currentTheme.iconColor}`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 bg-[#030303] w-full pt-10 pb-8 border-b border-white/5">
                <div className="max-w-[1400px] mx-auto w-full px-12">
                  <h2
                    className={`flex items-center gap-3 text-2xl font-black mb-6 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
                  >
                    <PlaySquare className={currentTheme.iconColor} /> Media
                    Gallery
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
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 backdrop-blur-md shadow-2xl"
                        >
                          <ChevronLeft
                            size={30}
                            className={currentTheme.iconColor}
                          />
                        </button>
                        <button
                          onClick={() => scrollCarousel("right")}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 backdrop-blur-md shadow-2xl"
                        >
                          <ChevronRight
                            size={30}
                            className={currentTheme.iconColor}
                          />
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
                      <p className="text-gray-400 italic glass-inner p-8 rounded-2xl font-medium">
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
                      className="glass-inner p-10 rounded-3xl w-full shadow-xl"
                    >
                      <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-white uppercase tracking-widest">
                        <Info className="text-gray-400" size={24} /> About Game
                      </h3>
                      <p
                        dangerouslySetInnerHTML={{
                          __html: steamData.short_description,
                        }}
                        className="text-gray-300 leading-relaxed text-base max-w-5xl"
                      />
                    </motion.div>
                  )}

                  <div className="flex gap-12 w-full">
                    <div className="flex-1 min-w-0 glass-inner p-10 rounded-3xl relative overflow-hidden shadow-xl">
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${currentTheme.textGradient}`}
                      />
                      <h3
                        className={`text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
                      >
                        <HardDrive
                          className={currentTheme.iconColor}
                          size={24}
                        />{" "}
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

                    <div className="w-[450px] shrink-0 glass-inner p-10 rounded-3xl relative overflow-hidden shadow-xl self-start">
                      <div
                        className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${currentTheme.textGradient}`}
                      />

                      <h3
                        className={`text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
                      >
                        <Download
                          className={currentTheme.iconColor}
                          size={24}
                        />{" "}
                        Direct Download Links
                      </h3>

                      <div className="flex flex-col gap-4">
                        {selectedGame.download_links.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between bg-black/60 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-all shadow-md hover:shadow-xl"
                          >
                            <span className="truncate text-[15px] font-bold text-gray-300 group-hover:text-white transition-colors">
                              {new URL(link).hostname}
                            </span>
                            <div className="glass-inner p-2.5 rounded-xl group-hover:bg-white/10 transition-colors">
                              <Download
                                size={18}
                                className={currentTheme.iconColor}
                              />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
