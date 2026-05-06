// hook managing library caching, search logic, and grid pagination.
import { useState, useRef } from "react";

export function useLibrary(activeExt, capabilities, setCurrentView) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const localCache = useRef(new Map());

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

  const clearCache = () => localCache.current.clear();
  const uniqueGames = games.filter(
    (g, i, s) => i === s.findIndex((t) => t.name === g.name),
  );

  return {
    games: uniqueGames,
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
  };
}
