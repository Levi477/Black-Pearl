const axios = require("axios");
const crypto = require("crypto");

module.exports = {
  name: "GoFile",
  canHandle: (url) => url.toLowerCase().includes("gofile"),
  extract: async (url) => {
    try {
      const contentId = url.split('/').filter(Boolean).pop();
      
      const userAgentStr = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0";
      const xbl = "en";

      const auth = await axios.post("https://api.gofile.io/accounts", {}, {
        headers: { "User-Agent": userAgentStr }
      });
      
      if (!auth.data || auth.data.status !== "ok") {
        console.log("[GoFile] Failed to get account token");
        return null;
      }
      const token = auth.data.data.token;

      const timeSlot = Math.floor(Date.now() / 1000 / 14400);
      const rawString = `${userAgentStr}::${xbl}::${token}::${timeSlot}::5d4f7g8sd45fsd`;
      const xwt = crypto.createHash('sha256').update(rawString).digest('hex');

      const contentUrl = `https://api.gofile.io/contents/${contentId}`;
      const res = await axios.get(contentUrl, {
        headers: {
          "User-Agent": userAgentStr,
          "Authorization": `Bearer ${token}`,
          "X-BL": xbl,
          "X-Website-Token": xwt
        }
      });

      if (res.data.status === "ok") {
        const itemData = res.data.data;
        
        const downloadHeaders = [
          `Cookie: accountToken=${token}`,
          `User-Agent: ${userAgentStr}`,
          `Accept: */*`,
          `Referer: https://gofile.io/`
        ];
        
        if (itemData.type === "file" && itemData.link) {
          return { url: itemData.link, headers: downloadHeaders };
        }
        
        if (itemData.type === "folder" && itemData.children) {
          for (const itemId in itemData.children) {
            const child = itemData.children[itemId];
            if (child.type === "file" && child.link) {
              return { url: child.link, headers: downloadHeaders };
            }
          }
        }
      }
      
      return null;
      
    } catch (err) {
      console.error("[GoFile Scraper] Error extracting link:", err.message);
      return null;
    }
  }
};