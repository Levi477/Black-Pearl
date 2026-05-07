import { Search, Menu, Minus, Square, X } from "lucide-react"; // <-- Added window icons
import ProfileMenu from "../profile/ProfileMenu";

export default function TopBar({
  sidebarOpen,
  setSidebarOpen,
  currentView,
  activeCategory,
  searchQuery,
  setSearchQuery,
  handleSearch,
  currentTheme,
  menuOpen,
  setMenuOpen,
  profile,
  setCurrentView,
  setSelectedGame,
}) {
  return (
    <div className="h-20 border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-40 bg-black/20 draggable">
      
      <div className="flex items-center gap-4 no-drag">
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
      
      <div className="flex items-center gap-6 no-drag">
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
        <ProfileMenu
          isOpen={menuOpen}
          setOpen={setMenuOpen}
          profile={profile}
          currentTheme={currentTheme}
          setCurrentView={setCurrentView}
          setSelectedGame={setSelectedGame}
        />

        <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
          <button 
            onClick={() => window.api.minimizeWindow()} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <Minus size={16} />
          </button>
          <button 
            onClick={() => window.api.maximizeWindow()} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <Square size={13} />
          </button>
          <button 
            onClick={() => window.api.closeWindow()} 
            className="p-2 hover:bg-red-500/80 hover:text-white rounded-lg transition-colors text-gray-400"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}