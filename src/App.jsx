import { useState, useEffect } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Layers } from "lucide-react";
import { useLibrary } from "./hooks/useLibrary.js";
import { DEFAULT_THEMES } from "./constants/themes.js";
import Sidebar from "./components/layout/Sidebar.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import GameGrid from "./components/library/GameGrid.jsx";
import GameDetail from "./components/library/GameDetail.jsx";
import DownloadToast from "./components/downloads/DownloadToast.jsx";
import DownloadsView from "./components/downloads/DownloadsView.jsx";
import Wishlist from "./components/library/Wishlist.jsx";
import LibraryView from "./components/library/LibraryView.jsx";
import ProfileSettings from "./components/profile/ProfileSettings.jsx";

export default function App() {
  const [currentView, setCurrentView] = useState("browse");
  const [themes, setThemes] = useState(DEFAULT_THEMES);
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEMES[0]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [extensions, setExtensions] = useState([]);
  const [activeExt, setActiveExt] = useState("");
  const [categories, setCategories] = useState([]);
  const [capabilities, setCapabilities] = useState({});
  const [selectedGame, setSelectedGame] = useState(null);

  const [profile, setProfile] = useState({
    name: "User",
    avatar: "",
    downloadPath: "",
    liteMode: false,
  });
  const [wishlist, setWishlist] = useState([]);
  const [library, setLibrary] = useState([]);
  const [completedDownloads, setCompletedDownloads] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [runningGames, setRunningGames] = useState(new Set());

  const handleSelectExtension = async (name) => {
    setActiveExt(name);
    const data = await window.api.setExtension(name);
    setCategories(data.categories);
    setCapabilities(data.capabilities);
    clearCache();
    loadHomepage(name);
  };

  const {
    games,
    loading,
    setLoading,
    searchQuery,
    setSearchQuery,
    activeCategory,
    hasMore,
    loadingMore,
    loadHomepage,
    loadCategory,
    handleSearch,
    loadMore,
    clearCache,
  } = useLibrary(activeExt, capabilities, setCurrentView);

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
        setLibrary(db.library || []);
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

      // Track game starts from the main process
      window.api.onGameStarted((gameName) => {
        setRunningGames((prev) => {
          const next = new Set(prev);
          next.add(gameName);
          return next;
        });
      });

      // Track game exits from the main process
      window.api.onGameExited((gameName) => {
        setRunningGames((prev) => {
          const next = new Set(prev);
          next.delete(gameName);
          return next;
        });
      });
    }
  }, []);

  const isDownloaded = (gameName) =>
    completedDownloads.some(
      (c) => c.gameName === gameName || c.name.includes(gameName),
    );

  const handleRemoveFromLibrary = async (gameName) => {
    const updated = await window.api.removeFromLibrary(gameName);
    setLibrary(updated);
  };

  return (
    <MotionConfig transition={profile.liteMode ? { duration: 0 } : undefined}>
      <div
        className={`flex h-screen w-screen text-white overflow-hidden p-3 gap-3 transition-colors duration-1000 ${
          currentTheme.class
        } ${profile.liteMode ? "lite-mode" : ""}`}
      >
        <DownloadToast
          toast={toast}
          setToast={setToast}
          setCurrentView={setCurrentView}
          setSelectedGame={setSelectedGame}
          currentTheme={currentTheme}
        />

        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          themes={themes}
          extensions={extensions}
          setExtensions={setExtensions}
          activeExt={activeExt}
          handleSelectExtension={handleSelectExtension}
          setToast={setToast}
          loadHomepage={loadHomepage}
          categories={categories}
          loadCategory={loadCategory}
          activeCategory={activeCategory}
          currentView={currentView}
          searchQuery={searchQuery}
          profile={profile}
        />

        <div className="flex-1 relative flex flex-col overflow-hidden rounded-3xl bg-black/30 backdrop-blur-[40px] border border-white/10 shadow-2xl">
          <TopBar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            currentView={currentView}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            currentTheme={currentTheme}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            profile={profile}
            setCurrentView={setCurrentView}
            setSelectedGame={setSelectedGame}
          />

          <div className="flex-1 overflow-y-auto relative no-scrollbar">
            {currentView === "profile" && (
              <ProfileSettings
                profile={profile}
                setProfile={setProfile}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                themes={themes}
                setThemes={setThemes}
                setToast={setToast}
              />
            )}
            {currentView === "library" && (
              <LibraryView
                library={library}
                currentTheme={currentTheme}
                openGame={(game) => setSelectedGame(game)}
                onRemove={handleRemoveFromLibrary}
                runningGames={runningGames}
              />
            )}
            {currentView === "wishlist" && (
              <Wishlist
                wishlist={wishlist}
                currentTheme={currentTheme}
                setCurrentView={setCurrentView}
                openGame={setSelectedGame}
              />
            )}
            {currentView === "downloads" && (
              <DownloadsView
                activeDownloads={activeDownloads}
                completedDownloads={completedDownloads}
                setCompletedDownloads={setCompletedDownloads}
                currentTheme={currentTheme}
              />
            )}

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
                  <GameGrid
                    games={games}
                    currentTheme={currentTheme}
                    openGame={setSelectedGame}
                    activeDownloads={activeDownloads}
                    isDownloaded={isDownloaded}
                    hasMore={hasMore}
                    loadMore={loadMore}
                    loadingMore={loadingMore}
                  />
                )}
              </div>
            )}
          </div>

          <AnimatePresence>
            {selectedGame && (
              <GameDetail
                selectedGame={selectedGame}
                setSelectedGame={setSelectedGame}
                currentTheme={currentTheme}
                isDownloaded={isDownloaded}
                wishlist={wishlist}
                setWishlist={setWishlist}
                detailMenuOpen={detailMenuOpen}
                setDetailMenuOpen={setDetailMenuOpen}
                profile={profile}
                setCurrentView={setCurrentView}
                library={library}
                setLibrary={setLibrary}
                runningGames={runningGames}
                setRunningGames={setRunningGames}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}