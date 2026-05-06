// Handles the display of the bottom toast notification for active downloads.
import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";

export default function DownloadToast({
  toast,
  setToast,
  setCurrentView,
  setSelectedGame,
  currentTheme,
}) {
  return (
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
  );
}
