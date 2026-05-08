const axios = require("axios");

module.exports = {
  name: "Datanodes",
  canHandle: (url) => url.toLowerCase().includes("datanodes"),
  extract: async (url) => {
    try {
      const fileId = url.split('/').filter(Boolean).pop();
      const formData = new URLSearchParams({
        op: 'download2', id: fileId, rand: '', referer: 'https://datanodes.to/download',
        method_free: 'Free Download >>', __dl: '1'
      });

      const { data } = await axios.post('https://datanodes.to/download', formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": "lang=english", "Referer": "https://datanodes.to/download" }
      });
      return data.url ? decodeURIComponent(data.url) : null;
    } catch (err) {
      return null;
    }
  }
};