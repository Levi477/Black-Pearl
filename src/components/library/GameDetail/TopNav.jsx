import { ChevronLeft, Heart, BookOpen, ExternalLink } from "lucide-react";
import ProfileMenu from "../../profile/ProfileMenu";

export default function TopNav({
  selectedGame, setSelectedGame, currentTheme, wishlist, setWishlist,
  isInLibrary, detailMenuOpen, setDetailMenuOpen, profile, setCurrentView
}) {
  const handleToggleWishlist = async () => {
    setWishlist(await window.api.toggleWishlist(selectedGame));
  };

  return (
    <div className="absolute left-8 right-8 z-50 flex justify-between items-start pointer-events-none transition-all duration-300 top-8">
      <div className="flex gap-3 pointer-events-auto flex-wrap">
        <button
          onClick={() => setSelectedGame(null)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 hover:bg-black/60 transition-all text-sm font-bold text-gray-200"
        >
          <ChevronLeft size={18} className={currentTheme.iconColor} /> BACK
        </button>
        
        {selectedGame.url && (
           <button
             onClick={() => window.api.openExternal(selectedGame.url)}
             className="flex items-center justify-center w-[46px] h-[46px] rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 hover:bg-blue-600/50 hover:border-blue-500 hover:text-white transition-all text-gray-200"
             title="Open in Default Browser"
           >
             <ExternalLink size={18} />
           </button>
        )}

        <button
          onClick={handleToggleWishlist}
          className={`flex items-center gap-2 px-5 py-3 rounded-full backdrop-blur-3xl border transition-all text-sm font-bold ${wishlist.some((g) => g.name === selectedGame.name) ? "bg-pink-500/10 border-pink-500/30 text-pink-400" : "bg-black/40 border-white/10 hover:bg-black/60 text-gray-200"}`}
        >
          <Heart size={18} fill={wishlist.some((g) => g.name === selectedGame.name) ? "currentColor" : "none"} className={wishlist.some((g) => g.name === selectedGame.name) ? "text-pink-400" : currentTheme.iconColor} />
          {wishlist.some((g) => g.name === selectedGame.name) ? "WISHLISTED" : "WISHLIST"}
        </button>

        {isInLibrary && (
          <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 text-sm font-bold text-gray-300">
            <BookOpen size={16} className={currentTheme.iconColor} /> IN LIBRARY
          </div>
        )}
      </div>

      <div className="pointer-events-auto">
        <ProfileMenu isOpen={detailMenuOpen} setOpen={setDetailMenuOpen} profile={profile} currentTheme={currentTheme} setCurrentView={setCurrentView} setSelectedGame={setSelectedGame} isOverlay={true} />
      </div>
    </div>
  );
}