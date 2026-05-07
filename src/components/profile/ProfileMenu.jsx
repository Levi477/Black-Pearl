import { motion, AnimatePresence } from "framer-motion";
import { User, Download, Heart, BookOpen } from "lucide-react";

export default function ProfileMenu({
  isOpen,
  setOpen,
  isOverlay = false,
  profile,
  currentTheme,
  setCurrentView,
  setSelectedGame,
}) {
  const items = [
    { icon: User, label: "Profile", view: "profile" },
    { icon: BookOpen, label: "Library", view: "library" },
    { icon: Download, label: "Downloads", view: "downloads" },
    { icon: Heart, label: "Wishlist", view: "wishlist" },
  ];

  return (
    <div className="relative">
      <div
        onClick={() => setOpen(!isOpen)}
        className={`flex items-center gap-3 cursor-pointer ${
          isOverlay
            ? "bg-black/40 backdrop-blur-3xl border border-white/10 hover:bg-black/60"
            : "bg-black/40 border border-white/10 hover:bg-white/10"
        } py-1.5 px-3 rounded-full transition-colors`}
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
            {items.map(({ icon: Icon, label, view }) => (
              <button
                key={view}
                onClick={() => {
                  setCurrentView(view);
                  setOpen(false);
                  setSelectedGame(null);
                }}
                className="text-left px-4 py-2.5 hover:bg-white/10 rounded-xl text-sm font-bold flex items-center gap-3 text-gray-100 hover:text-white transition-colors"
              >
                <Icon size={16} className={currentTheme.iconColor} />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
