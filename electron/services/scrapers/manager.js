const gofile = require("./providers/gofile");
const mediafire = require("./providers/mediafire");
const googleDrive = require("./providers/googleDrive");
const buzzheavier = require("./providers/buzzheavier");
const datanodes = require("./providers/datanodes");
const fuckingfast = require("./providers/fuckingfast");
const googledrive = require("./providers/googledrive"); 
const pixeldrain = require("./providers/pixeldrain");

const providers = [gofile, mediafire, googleDrive, buzzheavier, datanodes,fuckingfast, googledrive, pixeldrain];

async function scrapeDirectLink(url) {
  console.log(`[Scraper] Attempting to scrape direct link from: ${url}`);
  for (const provider of providers) {
    if (provider.canHandle(url)) {
      console.log(`[Scraper] Routing to ${provider.name}...`);
      try {
        const link = await provider.extract(url);
        if (link) return link;
      } catch (e) {
        console.error(`[Scraper] ${provider.name} failed.`);
      }
    }
  }
  return null;
}

module.exports = { scrapeDirectLink };