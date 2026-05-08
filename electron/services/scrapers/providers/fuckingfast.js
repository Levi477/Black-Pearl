const axios = require("axios");

module.exports = {
  name: "FuckingFast",
  canHandle: (url) => /fuckingfast\.(co|net)/i.test(url),
  extract: async (url) => {
    try {
      const res = await axios.get(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" 
        }
      });

      const match = res.data.match(/window\.open\(\s*["'](https:[^"']+)["']/i);
      
      if (match && match[1]) {
        return match[1]; 
      }

      return null;
    } catch (err) {
      console.error("[FuckingFast Scraper] Error:", err.message);
      return null;
    }
  }
};