const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  name: "BuzzHeavier",
  canHandle: (url) => /buzzheavier\.com|bzzhr\.co|bzzhr\.to/i.test(url),
  extract: async (url) => {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.origin;
      const cleanUrl = parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, "");

      const pageResponse = await axios.get(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const $ = cheerio.load(pageResponse.data);

      // Find the "Server 1" download link
      let downloadEndpoint = "";

      $("a[hx-get]").each((_, el) => {
        const hxGet = $(el).attr("hx-get");
        const text = $(el).text().trim();

        // Grab the first valid download token, prioritizing Server 1
        if (hxGet && hxGet.includes("/download?t=")) {
          if (text === "Server 1" || !downloadEndpoint) {
            downloadEndpoint = hxGet;
          }
        }
      });

      if (!downloadEndpoint) {
        console.log(
          `[Buzzheavier] Could not find download token/endpoint on page: ${cleanUrl}`,
        );
        return null;
      }

      const fullDownloadUrl = downloadEndpoint.startsWith("http")
        ? downloadEndpoint
        : domain + downloadEndpoint;

      const response = await axios({
        method: "GET",
        url: fullDownloadUrl,
        headers: {
          "hx-current-url": cleanUrl,
          "hx-request": "true",
          referer: cleanUrl,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        },
      });

      const hxRedirect = response.headers["hx-redirect"];

      if (hxRedirect) {
        return hxRedirect.startsWith("http") ? hxRedirect : domain + hxRedirect;
      }

      const location = response.headers["location"];
      if (location) {
        return location.startsWith("http") ? location : domain + location;
      }

      console.log(
        `[Buzzheavier] No redirect headers found for: ${fullDownloadUrl}`,
      );
      return null;
    } catch (err) {
      console.error(
        "[Buzzheavier Scraper] Error extracting link:",
        err.message,
      );
      return null;
    }
  },
};
