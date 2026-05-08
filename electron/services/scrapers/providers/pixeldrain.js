const axios = require("axios");

module.exports = {
  name: "PixelDrain",
  canHandle: (url) => /pixeldrain\.(com|net|in|nl|biz|tech|dev)/i.test(url),
  extract: async (url) => {
    try {
      const match = url.match(/\/(?:u|api\/file)\/([a-zA-Z0-9_-]+)/i);
      if (!match || !match[1]) return null;

      const fileId = match[1];
      const apiUrl = `https://pixeldrain.com/api/file/${fileId}/info`;

      const infoRes = await axios.get(apiUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" }
      });

      if (infoRes.data && infoRes.data.success) {
        return `https://pixeldrain.com/api/file/${fileId}?download`;
      }

      return null;
    } catch (err) {
      console.error("[PixelDrain Scraper] Error:", err.message);
      return null;
    }
  }
};