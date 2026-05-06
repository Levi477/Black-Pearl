// Renders the reusable dropdown menu for user profile, downloads, and wishlist navigation.
import { motion, AnimatePresence } from "framer-motion";
import { User, Download, Heart } from "lucide-react";

export default function ProfileMenu({
  isOpen,
  setOpen,
  isOverlay = false,
  profile,
  currentTheme,
  setCurrentView,
  setSelectedGame,
}) {
  return (
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
}
