const axios = require("axios");

module.exports = {
  name: "GoogleDrive",
  canHandle: (url) => /drive\.google\.com|docs\.google\.com/i.test(url),
  extract: async (url) => {
    try {
      let fileId = null;
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
      const pathMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/i);

      if (idMatch) fileId = idMatch[1];
      else if (pathMatch) fileId = pathMatch[1];

      if (!fileId) return null;

      const exportUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

      const res = await axios.get(exportUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });

      if (res.status >= 300 && res.headers.location) {
        return res.headers.location;
      }

      const confirmMatch = res.data.match(/confirm=([a-zA-Z0-9_-]+)/i);
      
      if (confirmMatch && confirmMatch[1]) {
        const token = confirmMatch[1];
        
        const cookies = res.headers['set-cookie'] 
          ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') 
          : '';

        const finalUrl = `https://drive.google.com/uc?id=${fileId}&export=download&confirm=${token}`;

        return {
          url: finalUrl,
          headers: [
            `Cookie: ${cookies}`,
            `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0`
          ]
        };
      }

      return exportUrl;
    } catch (err) {
      console.error("[GoogleDrive Scraper] Error:", err.message);
      return null;
    }
  }
};