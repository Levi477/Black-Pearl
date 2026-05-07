// src/components/layout/Sidebar.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette } from "lucide-react";
import PirateIcon from "../icons/PirateIcon";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  currentTheme,
  setCurrentTheme,
  themes,
  extensions,
  setExtensions,
  activeExt,
  handleSelectExtension,
  setToast,
  loadHomepage,
  categories,
  loadCategory,
  activeCategory,
  currentView,
  searchQuery,
  profile,
}) {
  const [installUrl, setInstallUrl] = useState("");
  const [installing, setInstalling] = useState(false);

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
      alert("Failed: " + result.message);
    }
    setInstalling(false);
  };

  return (
    <AnimatePresence initial={false}>
      {sidebarOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0, marginLeft: -12 }}
          animate={{ width: 256, opacity: 1, marginLeft: 0 }}
          exit={{ width: 0, opacity: 0, marginLeft: -12 }}
          transition={
            profile?.liteMode
              ? { duration: 0 }
              : { type: "spring", bounce: 0, duration: 0.4 }
          }
          className="bg-black/30 backdrop-blur-[40px] border border-white/10 shadow-2xl rounded-3xl flex flex-col overflow-hidden shrink-0"
        >
          <div className="p-6 border-b border-white/5 bg-black/20 group cursor-default">
            <h2
              className={`text-2xl font-black flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.textGradient}`}
            >
              <PirateIcon
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
              {themes.map((theme) => (
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
  );
}
