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
  Skull,
  User,
  Heart,
  Pause,
  Play,
  X,
  CheckCircle,
  Image as ImageIcon,
  Calendar,
  Layers,
  PenTool,
  Star,
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
    stroke: "text-purple-500",
  },
  {
    id: "crimson",
    name: "Crimson Void",
    class: "theme-crimson",
    color: "bg-red-500",
    textGradient: "from-red-400 to-orange-400",
    activeBg: "bg-red-500/20 text-red-300",
    iconColor: "text-red-400",
    stroke: "text-red-500",
  },
  {
    id: "emerald",
    name: "Emerald Sea",
    class: "theme-emerald",
    color: "bg-emerald-500",
    textGradient: "from-emerald-400 to-cyan-400",
    activeBg: "bg-emerald-500/20 text-emerald-300",
    iconColor: "text-emerald-400",
    stroke: "text-emerald-500",
  },
  {
    id: "cyber",
    name: "Neon Cyber",
    class: "theme-cyber",
    color: "bg-blue-500",
    textGradient: "from-blue-400 to-fuchsia-400",
    activeBg: "bg-blue-500/20 text-blue-300",
    iconColor: "text-blue-400",
    stroke: "text-blue-500",
  },
  {
    id: "cyberpunk",
    name: "Night City",
    class: "theme-cyberpunk",
    color: "bg-yellow-400",
    textGradient: "from-yellow-400 to-amber-500",
    activeBg: "bg-yellow-400/20 text-yellow-300",
    iconColor: "text-yellow-400",
    stroke: "text-yellow-400",
  },
];

export default function App() {
  const [currentView, setCurrentView] = useState("browse");
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false); // Menu specifically for detail view
  const [toast, setToast] = useState(null);

  const [extensions, setExtensions] = useState([]);
  const [activeExt, setActiveExt] = useState("");
  const [categories, setCategories] = useState([]);
  const [capabilities, setCapabilities] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [steamData, setSteamData] = useState(null);
  const [steamLoading, setSteamLoading] = useState(false);

  const [installUrl, setInstallUrl] = useState("");
  const [installing, setInstalling] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const carouselRef = useRef(null);
  const localCache = useRef(new Map());

  const [profile, setProfile] = useState({
    name: "User",
    avatar: "",
    downloadPath: "",
  });
  const [wishlist, setWishlist] = useState([]);
  const [completedDownloads, setCompletedDownloads] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState([]);

  useEffect(() => {
    if (window.api) {
      window.api.getExtensions().then((exts) => {
        setExtensions(exts);
        if (exts.length > 0) handleSelectExtension(exts[0]);
        else setLoading(false);
      });

      window.api.getDB().then((db) => {
        setProfile(db.profile);
        setWishlist(db.wishlist);
        setCompletedDownloads(db.completedDownloads);
      });
      window.api.onDownloadUpdate((data) => {
        setActiveDownloads(data);
        window.api
          .getDB()
          .then((db) => setCompletedDownloads(db.completedDownloads));
      });
      window.api.onDownloadStarted((data) => {
        setToast(`Intercepted! Downloading: ${data.gameName}`);
        setTimeout(() => setToast(null), 5000);
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
    if (!extName) return;
    setCurrentView("browse");
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
    setCurrentView("browse");
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
    setCurrentView("browse");
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
    let cacheKey = activeCategory
      ? `cat_${activeExt}_${activeCategory}_${nextPage}`
      : `search_${activeExt}_${searchQuery}_${nextPage}`;
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
    let newData = activeCategory
      ? await window.api.getCategory(activeCategory, nextPage)
      : await window.api.searchGames(searchQuery, nextPage);
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
    setDetailMenuOpen(false);
    const data = await window.api.getSteamMedia(game.name);
    setSteamData(data);
    setSteamLoading(false);
  };

  const handleInstallExtension = async () => {
    if (!installUrl.trim()) return;
    setInstalling(true);
    let finalUrl = installUrl.trim();
    if (
      finalUrl.includes("github.com") &&
      !finalUrl.includes("raw.githubusercontent.com")
    )
      finalUrl = finalUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
    const result = await window.api.installExtension(finalUrl);
    if (result.success) {
      const exts = await window.api.getExtensions();
      setExtensions(exts);
      setInstallUrl("");
      setToast("Extension Installed Successfully!");
      setTimeout(() => setToast(null), 3000);
      if (exts.length === 1 || !activeExt)
        handleSelectExtension(exts[exts.length - 1]);
    } else {
      alert("⚠️ Failed: " + result.message);
    }
    setInstalling(false);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newProf = { ...profile, avatar: reader.result };
        setProfile(newProf);
        window.api.updateProfile(newProf);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleNameChange = (e) => {
    const newProf = { ...profile, name: e.target.value };
    setProfile(newProf);
    window.api.updateProfile(newProf);
  };
  const handleDirectorySelect = async () => {
    const newPath = await window.api.selectDirectory();
    if (newPath) {
      const newProf = { ...profile, downloadPath: newPath };
      setProfile(newProf);
      window.api.updateProfile(newProf);
    }
  };
  const handleToggleWishlist = async (game) => {
    const newWishlist = await window.api.toggleWishlist(game);
    setWishlist(newWishlist);
  };

  const formatBytes = (bytes) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024,
      sizes = ["B", "KB", "MB", "GB", "TB"],
      i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  const scrollCarousel = (dir) => {
    if (carouselRef.current)
      carouselRef.current.scrollBy({
        left: dir === "left" ? -600 : 600,
        behavior: "smooth",
      });
  };
  const uniqueGames = games.filter(
    (g, i, s) => i === s.findIndex((t) => t.name === g.name),
  );
  const isDownloaded = (gameName) =>
    completedDownloads.some(
      (c) => c.gameName === gameName || c.name.includes(gameName),
    );

  // --- REUSABLE PROFILE MENU COMPONENT ---
  const ProfileDropdown = ({ isOpen, setOpen, isOverlay = false }) => (
    <div className="relative">
      <div
        onClick={() => setOpen(!isOpen)}
        className={`flex items-center gap-3 cursor-pointer ${isOverlay ? "bg-black/40 backdrop-blur-3xl border border-white/10 hover:bg-black/60" : "bg-black/40 border border-white/10 hover:bg-white/10"} py-1.5 px-3 rounded-full transition-colors`}
      >
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-gray-100">
            {profile.name}
          </span>
          <span
            className={`text-[10px] uppercase font-black tracking-widest ${currentTheme.iconColor}`}
          >
            User
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-black border border-white/20 overflow-hidden">
          {profile.avatar ? (
            <img src={profile.avatar} className="w-full h-full object-cover" />
          ) : (
            <User className="m-2 text-gray-400" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 top-14 w-48 bg-[#050505]/70 backdrop-blur-[50px] border border-white/10 rounded-2xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.9)] flex flex-col gap-1 z-[100]"
          >
            <button
              onClick={() => {
                setCurrentView("profile");
                setOpen(false);
                setSelectedGame(null);
              }}
              className="text-left px-4 py-2.5 hover:bg-white/10 rounded-xl text-sm font-bold flex items-center gap-3 text-gray-100 hover:text-white transition-colors"
            >
              <User size={16} className={currentTheme.iconColor} /> Profile
            </button>
            <button
              onClick={() => {
                setCurrentView("downloads");
                setOpen(false);
                setSelectedGame(null);
              }}
              className="text-left px-4 py-2.5 hover:bg-white/10 rounded-xl text-sm font-bold flex items-center gap-3 text-gray-100 hover:text-white transition-colors"
            >
              <Download size={16} className={currentTheme.iconColor} />{" "}
              Downloads
            </button>
            <button
              onClick={() => {
                setCurrentView("wishlist");
                setOpen(false);
                setSelectedGame(null);
              }}
              className="text-left px-4 py-2.5 hover:bg-white/10 rounded-xl text-sm font-bold flex items-center gap-3 text-gray-100 hover:text-white transition-colors"
            >
              <Heart size={16} className={currentTheme.iconColor} /> Wishlist
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // --- SUB-VIEWS ---
  const renderProfile = () => (
    <div className="p-12 max-w-3xl mx-auto w-full">
      <h2
        className={`text-4xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
      >
        Profile Settings
      </h2>
      <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 p-10 rounded-3xl flex flex-col items-center gap-8 shadow-2xl relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${currentTheme.textGradient}`}
        />
        <div className="relative group cursor-pointer">
          <div className="w-40 h-40 rounded-full bg-black/60 border-4 border-white/10 overflow-hidden shadow-2xl">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={80} className="m-10 text-gray-500" />
            )}
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center">
            <ImageIcon size={30} className={currentTheme.iconColor} />
            <span className="text-xs font-bold mt-2">Upload Avatar</span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="w-full text-center">
          <label
            className={`text-xs font-black uppercase tracking-widest mb-2 block ${currentTheme.iconColor}`}
          >
            Username
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={handleNameChange}
            className="bg-black/60 border border-white/10 rounded-xl px-6 py-3 w-72 text-center font-bold text-2xl focus:outline-none focus:border-white/30 text-white hover:bg-black/80 transition-all"
          />
        </div>
        <div className="w-full mt-6 bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
          <label
            className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${currentTheme.iconColor}`}
          >
            <HardDrive size={16} /> Download Directory
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="text"
              readOnly
              value={profile.downloadPath || ""}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none cursor-default font-mono truncate"
            />
            <button
              onClick={handleDirectorySelect}
              className={`px-6 py-3 rounded-xl font-bold tracking-wider text-xs transition-all shadow-lg border border-white/10 hover:scale-105 active:scale-95 ${currentTheme.activeBg}`}
            >
              CHANGE
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWishlist = () => (
    <div className="p-8 w-full">
      <h2
        className={`text-3xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
      >
        <Heart className="inline mb-1 mr-2" /> Wishlist
      </h2>
      {wishlist.length === 0 ? (
        <p className="text-gray-500">Your wishlist is empty.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {wishlist.map((game, i) => (
            <motion.div
              key={i}
              onClick={() => {
                setCurrentView("browse");
                openGame(game);
              }}
              className="group cursor-pointer flex flex-col gap-3"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-black/40 border border-white/10 hover:border-white/30 transition-all duration-300">
                <img
                  src={game.thumbnail_link}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h3 className="font-semibold text-sm text-gray-100 group-hover:text-white line-clamp-2">
                {game.name}
              </h3>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDownloads = () => (
    <div className="p-8 w-full max-w-5xl mx-auto flex flex-col gap-10">
      <div>
        {/* FIX: Removed spinning circle, replaced with clean Download icon */}
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
              return (
                <div
                  key={d.gid}
                  className="bg-black/60 backdrop-blur-3xl p-6 rounded-2xl relative overflow-hidden shadow-lg border border-white/10"
                >
                  <div
                    className={`absolute top-0 left-0 h-1 ${currentTheme.color} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold truncate pr-4 text-lg text-white">
                      {d.gameName || d.name}
                    </h4>
                    <span className="font-mono text-sm font-bold text-gray-300 shrink-0">
                      {formatBytes(d.speed)}/s
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-300 mb-4 font-mono">
                    <span>
                      {formatBytes(d.completed)} / {formatBytes(d.total)}
                    </span>
                    <span>{progress.toFixed(1)}%</span>
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

  return (
    <div
      className={`flex h-screen w-screen text-white overflow-hidden p-3 gap-3 transition-colors duration-1000 ${currentTheme.class}`}
    >
      {/* INTERACTIVE TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => {
              setCurrentView("downloads");
              setSelectedGame(null);
              setToast(null);
            }}
            className="cursor-pointer absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-black/90 backdrop-blur-3xl px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/20 flex items-center gap-4 hover:scale-105 transition-transform"
          >
            <Download size={18} className={currentTheme.iconColor} />
            <span className="font-bold text-sm tracking-wide text-white">
              {toast}
            </span>
            <span className="text-[10px] text-gray-400 ml-2 border-l border-white/20 pl-4 uppercase tracking-widest font-black">
              Click to View
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0, marginLeft: -12 }}
            animate={{ width: 256, opacity: 1, marginLeft: 0 }}
            exit={{ width: 0, opacity: 0, marginLeft: -12 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="bg-black/30 backdrop-blur-[40px] border border-white/10 shadow-2xl rounded-3xl flex flex-col overflow-hidden shrink-0"
          >
            <div className="p-6 border-b border-white/5 bg-black/20 group cursor-default">
              <h2
                className={`text-2xl font-black flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
              >
                <Skull
                  className={`${currentTheme.iconColor} transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110`}
                  size={28}
                />{" "}
                Black Pearl
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 no-scrollbar">
              <p
                className={`text-xs font-bold mb-2 uppercase tracking-widest ${currentTheme.iconColor}`}
              >
                Extensions
              </p>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 mb-2 text-sm outline-none text-gray-100"
                value={activeExt}
                onChange={(e) => handleSelectExtension(e.target.value)}
              >
                {extensions.map((ext) => (
                  <option key={ext} value={ext} className="bg-slate-900">
                    {ext}
                  </option>
                ))}
              </select>

              <div className="bg-black/40 rounded-xl p-3 mb-6 border border-white/5 w-full box-border">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">
                  Add Source
                </p>
                <input
                  type="text"
                  placeholder="GitHub URL..."
                  value={installUrl}
                  onChange={(e) => setInstallUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs mb-2 focus:outline-none focus:bg-white/10 text-white placeholder:text-gray-500 box-border"
                />
                <button
                  onClick={handleInstallExtension}
                  disabled={installing || !installUrl}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-all box-border ${installUrl ? currentTheme.color + " text-black shadow-lg hover:brightness-110" : "bg-white/5 text-gray-500"}`}
                >
                  {installing ? "INSTALLING..." : "INSTALL PLUGIN"}
                </button>
              </div>

              <p
                className={`text-xs font-bold mb-2 uppercase tracking-widest ${currentTheme.iconColor}`}
              >
                Browse
              </p>
              <button
                onClick={() => loadHomepage()}
                className={`px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${currentView === "browse" && !activeCategory && !searchQuery ? currentTheme.activeBg : "hover:bg-white/5 text-gray-400"}`}
              >
                Homepage
              </button>
              <div className="mt-2 flex flex-col gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => loadCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-left text-sm font-semibold capitalize transition-all ${currentView === "browse" && activeCategory === cat ? currentTheme.activeBg : "hover:bg-white/5 text-gray-400 hover:text-white"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

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

      <div className="flex-1 relative flex flex-col overflow-hidden rounded-3xl bg-black/30 backdrop-blur-[40px] border border-white/10 shadow-2xl">
        <div className="h-20 border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-40 bg-black/20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 bg-black/40 border border-white/10 rounded-xl transition-colors hover:bg-white/10 text-white"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold tracking-widest text-gray-100">
              {currentView === "browse"
                ? activeCategory
                  ? activeCategory.toUpperCase()
                  : searchQuery
                    ? "SEARCH RESULTS"
                    : "DISCOVER"
                : currentView.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${currentTheme.iconColor} opacity-70`}
                size={18}
              />
              <input
                type="text"
                placeholder="Search for games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="bg-black/60 border border-white/10 rounded-full py-2.5 pl-12 pr-6 w-64 md:w-80 text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-gray-500 text-white"
              />
            </div>
            {/* Global Profile Dropdown */}
            <ProfileDropdown isOpen={menuOpen} setOpen={setMenuOpen} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative no-scrollbar">
          {currentView === "profile" && renderProfile()}
          {currentView === "wishlist" && renderWishlist()}
          {currentView === "downloads" && renderDownloads()}

          {currentView === "browse" && (
            <div className="p-8">
              {extensions.length === 0 ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500">
                  <Layers
                    size={80}
                    className={`mb-6 opacity-40 ${currentTheme.iconColor}`}
                  />
                  <h2 className="text-2xl font-black mb-2 text-white tracking-widest">
                    NO SOURCES FOUND
                  </h2>
                  <p className="text-sm font-medium">
                    Please install an extension via the sidebar to load games.
                  </p>
                </div>
              ) : loading ? (
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
                    {uniqueGames.map((game) => {
                      const activeDl = activeDownloads.find(
                        (d) => d.gameName === game.name,
                      );
                      const progress =
                        activeDl && activeDl.total > 0
                          ? (activeDl.completed / activeDl.total) * 100
                          : 0;

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

                            {isDownloaded(game.name) && (
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
                                      strokeDashoffset={
                                        175.9 - (175.9 * progress) / 100
                                      }
                                      className={`transition-all duration-500 ${currentTheme.stroke}`}
                                    />
                                  </svg>
                                  <span className="absolute text-xs font-black text-white">
                                    {Math.round(progress)}%
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
              )}
            </div>
          )}
        </div>

        {/* DETAIL OVERLAY */}
        <AnimatePresence>
          {selectedGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#030303] flex flex-col overflow-y-auto no-scrollbar"
            >
              {/* TOP ACTIONS & PROFILE MENU */}
              <div className="absolute top-8 left-8 right-8 z-50 flex justify-between items-start pointer-events-none">
                <div className="flex gap-4 pointer-events-auto">
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 hover:bg-black/60 transition-all text-sm font-bold text-gray-200"
                  >
                    <ChevronLeft size={18} className={currentTheme.iconColor} />{" "}
                    BACK TO BROWSE
                  </button>
                  <button
                    onClick={() => handleToggleWishlist(selectedGame)}
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
                    />{" "}
                    {wishlist.some((g) => g.name === selectedGame.name)
                      ? "SAVED TO WISHLIST"
                      : "ADD TO WISHLIST"}
                  </button>
                </div>
                {/* Overlay Profile Menu */}
                <div className="pointer-events-auto">
                  <ProfileDropdown
                    isOpen={detailMenuOpen}
                    setOpen={setDetailMenuOpen}
                    isOverlay={true}
                  />
                </div>
              </div>

              {/* HERO SECTION */}
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

                    {/* SLEEK METADATA STRIP UNDER TITLE */}
                    <div className="flex flex-wrap items-center gap-x-12 gap-y-4 pt-4 border-t border-white/10 w-full">
                      {steamData?.developers && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5">
                            <PenTool
                              size={12}
                              className={currentTheme.iconColor}
                            />{" "}
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
                            <Layers
                              size={12}
                              className={currentTheme.iconColor}
                            />{" "}
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
                            <Calendar
                              size={12}
                              className={currentTheme.iconColor}
                            />{" "}
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
                            <Star
                              size={12}
                              className={currentTheme.iconColor}
                            />{" "}
                            Metacritic
                          </span>
                          <span
                            className={`text-sm font-black ${steamData.metacritic.score >= 80 ? "text-green-400" : "text-yellow-400"}`}
                          >
                            {steamData.metacritic.score} / 100
                          </span>
                        </div>
                      )}
                      {/* Fallback tags if Steam data is missing */}
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
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl"
                        >
                          <ChevronLeft
                            size={30}
                            className={currentTheme.iconColor}
                          />
                        </button>
                        <button
                          onClick={() => scrollCarousel("right")}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-black/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl"
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
                    </div>

                    <div className="w-[450px] shrink-0 bg-black/40 backdrop-blur-[40px] border border-white/10 p-10 rounded-3xl relative overflow-hidden shadow-2xl self-start">
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
                        Direct Links
                      </h3>
                      <div className="flex flex-col gap-4">
                        {selectedGame.download_links.map((link, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              window.api.startSmartDownload(
                                link,
                                selectedGame.name,
                              )
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
