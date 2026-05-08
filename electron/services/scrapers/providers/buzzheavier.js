const axios = require("axios");

module.exports = {
  name: "BuzzHeavier",
canHandle: (url) => /buzzheavier\.com|bzzhr\.co|bzzhr\.to/i.test(url),  extract: async (url) => {
    try {
      const parsedUrl = new URL(url);
      
      const cleanUrl = parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, '');
      const downloadEndpoint = `${cleanUrl}/download`;
      const domain = parsedUrl.origin;

      const response = await axios({
        method: 'HEAD', 
        url: downloadEndpoint,
        headers: {
          "hx-current-url": cleanUrl,
          "hx-request": "true",
          "referer": cleanUrl,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        maxRedirects: 0, 
        validateStatus: function (status) {
          return status >= 200 && status < 400; 
        }
      });

      const hxRedirect = response.headers['hx-redirect'];
      
      if (hxRedirect) {
        const finalUrl = hxRedirect.startsWith('http') ? hxRedirect : domain + hxRedirect;
        return finalUrl;
      }

      const location = response.headers['location'];
      if (location) {
        const finalUrl = location.startsWith('http') ? location : domain + location;
        return finalUrl;
      }

      console.log(`[Buzzheavier] No redirect headers found for: ${cleanUrl}`);
      return null;

    } catch (err) {
      console.error("[Buzzheavier Scraper] Error extracting link:", err.message);
      return null; 
    }
  }
};