// Hook managing library caching, search logic, streaming, and grid pagination.
import { useState, useRef, useCallback } from "react";

export function useLibrary(activeExt, capabilities, setCurrentView) {
  const [games, setGames]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [streaming, setStreaming]     = useState(false); // true while live stream is in progress
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const localCache        = useRef(new Map());
  const streamSessionRef  = useRef(0);          // incremented each time a new stream starts
  const streamedGamesRef  = useRef([]);         // accumulator for the current stream

  // ── Internal: kick off a streaming scrape ──────────────────────────────────

  const startStream = useCallback(({ type, params = {}, cacheKey }) => {
    // Bump session counter so any stale callbacks from an old stream are ignored
    const sessionId = ++streamSessionRef.current;
    streamedGamesRef.current = [];

    setGames([]);
    setLoading(true);
    setStreaming(true);
    setHasMore(false);

    // Per-item callback — appends game to state immediately
    window.api.onStreamItem((game) => {
      if (streamSessionRef.current !== sessionId) return; // stale stream, discard
      streamedGamesRef.current.push(game);
      setGames((prev) => {
        if (prev.some((g) => g.name === game.name)) return prev; // deduplicate
        return [...prev, game];
      });
      // Remove skeleton as soon as the first item arrives
      setLoading(false);
    });

    // End-of-stream callback
    window.api.onStreamEnd(({ total, hasMore: more, error }) => {
      if (streamSessionRef.current !== sessionId) return;

      setStreaming(false);
      setLoading(false);

      if (typeof more === "boolean") setHasMore(more);

      // Persist to local cache so navigating back is instant
      if (cacheKey && !error && streamedGamesRef.current.length > 0) {
        localCache.current.set(cacheKey, [...streamedGamesRef.current]);
      }

      if (error) console.error("[useLibrary] Stream error:", error);
    });

    window.api.startStream({ type, params });
  }, []);

  // ── Public loaders ─────────────────────────────────────────────────────────

  const loadHomepage = (extName = activeExt) => {
    if (!extName) return;
    setCurrentView("browse");
    setActiveCategory(null);
    setSearchQuery("");
    setPage(1);

    const cacheKey = `home_${extName}`;
    if (localCache.current.has(cacheKey)) {
      setGames(localCache.current.get(cacheKey));
      setLoading(false);
      setStreaming(false);
      setHasMore(false);
      return;
    }

    startStream({ type: "homepage", cacheKey });
  };

  const loadCategory = (cat) => {
    setCurrentView("browse");
    setActiveCategory(cat);
    setSearchQuery("");
    setPage(1);

    const cacheKey = `cat_${activeExt}_${cat}_1`;
    if (localCache.current.has(cacheKey)) {
      const cachedData = localCache.current.get(cacheKey);
      setGames(cachedData);
      setHasMore(cachedData.length > 0 && !!capabilities.hasCategoryPagination);
      setLoading(false);
      setStreaming(false);
      return;
    }

    startStream({
      type: "category",
      params: { category: cat, page: 1 },
      cacheKey,
    });
  };

  const handleSearch = (e) => {
    if (e.key !== "Enter" || !searchQuery.trim()) return;
    setCurrentView("browse");
    setActiveCategory(null);
    setPage(1);

    const cacheKey = `search_${activeExt}_${searchQuery}_1`;
    if (localCache.current.has(cacheKey)) {
      const cachedData = localCache.current.get(cacheKey);
      setGames(cachedData);
      setHasMore(cachedData.length > 0 && !!capabilities.hasSearchPagination);
      setLoading(false);
      setStreaming(false);
      return;
    }

    startStream({
      type: "search",
      params: { query: searchQuery, page: 1 },
      cacheKey,
    });
  };

  // Load-more is always batch (page 2+) and must not fire during a stream
  const loadMore = async () => {
    if (loadingMore || !hasMore || streaming) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    const cacheKey = activeCategory
      ? `cat_${activeExt}_${activeCategory}_${nextPage}`
      : `search_${activeExt}_${searchQuery}_${nextPage}`;

    if (localCache.current.has(cacheKey)) {
      const cachedData = localCache.current.get(cacheKey);
      if (cachedData.length === 0) {
        setHasMore(false);
      } else {
        setGames((prev) => {
          const existingNames = new Set(prev.map((g) => g.name));
          return [...prev, ...cachedData.filter((g) => !existingNames.has(g.name))];
        });
        setPage(nextPage);
      }
      setLoadingMore(false);
      return;
    }

    try {
      const newData = activeCategory
        ? await window.api.getCategory(activeCategory, nextPage)
        : await window.api.searchGames(searchQuery, nextPage);

      localCache.current.set(cacheKey, newData || []);

      if (!newData || newData.length === 0) {
        setHasMore(false);
      } else {
        setGames((prev) => {
          const existingNames = new Set(prev.map((g) => g.name));
          return [...prev, ...newData.filter((g) => !existingNames.has(g.name))];
        });
        setPage(nextPage);
        // If the page came back with fewer items than expected, there may not
        // be another page — keep hasMore true but the next load will clarify.
      }
    } catch (err) {
      console.error("[useLibrary] loadMore error:", err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const clearCache = () => {
    localCache.current.clear();
    // Cancel any in-progress stream by bumping the session
    streamSessionRef.current++;
  };

  // Dedup just in case (safety net on top of inline dedup during streaming)
  const uniqueGames = games.filter(
    (g, i, s) => i === s.findIndex((t) => t.name === g.name),
  );

  return {
    games: uniqueGames,
    loading,
    streaming,
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