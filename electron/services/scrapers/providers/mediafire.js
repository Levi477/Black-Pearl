const axios = require("axios");

module.exports = {
  name: "Mediafire",
  canHandle: (url) => url.toLowerCase().includes("mediafire"),
  extract: async (url) => {
    try {
      const { data } = await axios.get(url);
      const match1 = data.match(/href="([^"]+mediafire\.com\/(?:file|view|download)\/[^"]+\?dkey=[^"]+)"/);
      if (match1) return match1[1].startsWith('//') ? `https:${match1[1]}` : match1[1];

      const match2 = data.match(/href="(https?:\/\/download\d+\.mediafire\.com\/[^"]+)"/);
      if (match2) return match2[1];
      return null;
    } catch (err) {
      return null;
    }
  }
};