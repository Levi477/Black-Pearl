import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import TopNav from "./GameDetail/TopNav";
import GameHeader from "./GameDetail/GameHeader";
import MediaGallery from "./GameDetail/MediaGallery";
import SystemReqs from "./GameDetail/SystemReqs";
import GameSidebar from "./GameDetail/GameSidebar";

export default function GameDetail({
  selectedGame, setSelectedGame, currentTheme, isDownloaded, wishlist,
  setWishlist, detailMenuOpen, setDetailMenuOpen, profile, setCurrentView,
  library, setLibrary, runningGames, setRunningGames
}) {
  const [steamData, setSteamData] = useState(null);
  const [steamLoading, setSteamLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [fetchingLinks, setFetchingLinks] = useState(false);
  const [downloadLinks, setDownloadLinks] = useState(selectedGame.download_links || []);  
  const [downloadedParts, setDownloadedParts] = useState({});

  const isInLibrary = library.some((g) => g.name === selectedGame.name);
  const libraryEntry = library.find((g) => g.name === selectedGame.name);
  const isRunning = runningGames.has(selectedGame.name);
  const hasExe = !!libraryEntry?.exePath;
  const showControls = isDownloaded(selectedGame.name) || hasExe;

  useEffect(() => {
    const fetchSteam = async () => {
      setSteamLoading(true);
      const searchName = selectedGame.clean_name || selectedGame.name;
      const data = await window.api.getSteamMedia(searchName);
      setSteamData(data);
      setSteamLoading(false);
    };
    if (selectedGame) fetchSteam();
  }, [selectedGame]);

  useEffect(() => {
    const fetchLinks = async () => {
      if (selectedGame.url && (!selectedGame.download_links || selectedGame.download_links.length === 0)) {
        setFetchingLinks(true);
        try {
            const details = await window.api.getGameDetails(selectedGame.url);
            setDownloadLinks(details.download_links || []);
            setSelectedGame(prev => ({ ...prev, download_links: details.download_links || [] }));
        } catch (e) {
            console.error("Failed to fetch links", e);
        } finally {
            setFetchingLinks(false);
        }
      } else {
        setDownloadLinks(selectedGame.download_links || []);
      }
    };
    if (selectedGame) fetchLinks();
  }, [selectedGame]);

  useEffect(() => {
    const checkParts = async () => {
      if (!window.api.checkPartExists) return;
      const status = {};
      for (let i = 0; i < downloadLinks.length; i++) {
        const originalLink = downloadLinks[i];
        const link = (Array.isArray(originalLink) && originalLink.length === 1) ? originalLink[0] : originalLink;

        if (Array.isArray(link)) {
          for (let j = 0; j < link.length; j++) {
            status[`${i}-${j}`] = await window.api.checkPartExists(link[j]);
          }
        } else if (typeof link === 'string') {
          status[`${i}`] = await window.api.checkPartExists(link);
        }
      }
      setDownloadedParts(status);
    };
    if (downloadLinks.length > 0) checkParts();
  }, [downloadLinks]);

  const handleDownload = async (link) => {
    window.api.startSmartDownload(link, selectedGame.name);
  };

  const handleChooseLauncher = async () => {
    const exePath = await window.api.selectExe();
    if (exePath) {
      if (!isInLibrary) await window.api.addToLibrary(selectedGame);
      const updated = await window.api.setGameExe(selectedGame.name, exePath);
      setLibrary(updated);
    }
  };

  const handleLaunchGame = async () => {
    if (!libraryEntry?.exePath) return;
    setLaunching(true);
    const result = await window.api.launchGame(selectedGame.name, libraryEntry.exePath, libraryEntry.launchParams || "");
    setLaunching(false);
    if (!result.success) alert(`Failed to launch: ${result.message}`);
  };

  const handleKillGame = async () => {
    await window.api.killGame(selectedGame.name);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-[#030303] flex flex-col overflow-y-auto no-scrollbar">
      
      <TopNav 
        selectedGame={selectedGame} setSelectedGame={setSelectedGame} currentTheme={currentTheme} 
        wishlist={wishlist} setWishlist={setWishlist} isInLibrary={isInLibrary} 
        detailMenuOpen={detailMenuOpen} setDetailMenuOpen={setDetailMenuOpen} 
        profile={profile} setCurrentView={setCurrentView} 
      />

      <GameHeader selectedGame={selectedGame} steamData={steamData} currentTheme={currentTheme} isDownloaded={isDownloaded} />
      
      <MediaGallery steamData={steamData} steamLoading={steamLoading} currentTheme={currentTheme} />

      <div className="relative z-10 bg-[#030303] flex-1 w-full">
        <div className="max-w-[1400px] mx-auto w-full px-12 py-12 flex gap-12">
          
          <SystemReqs steamData={steamData} steamLoading={steamLoading} currentTheme={currentTheme} />
          
          <GameSidebar 
            selectedGame={selectedGame} libraryEntry={libraryEntry} isRunning={isRunning} 
            hasExe={hasExe} showControls={showControls} currentTheme={currentTheme} 
            launching={launching} fetchingLinks={fetchingLinks} downloadLinks={downloadLinks} 
            downloadedParts={downloadedParts} handleChooseLauncher={handleChooseLauncher} 
            handleLaunchGame={handleLaunchGame} handleKillGame={handleKillGame} 
            handleDownload={handleDownload} setLibrary={setLibrary}
          />

        </div>
      </div>
    </motion.div>
  );
}