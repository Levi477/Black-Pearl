const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://steamrip.com";

module.exports = {
  name: "SteamRIP",
  categories: [
    "action",
    "adventure",
    "anime",
    "horror",
    "indie",
    "multiplayer",
    "open-world",
    "racing",
    "shooting",
    "simulation",
    "sports",
    "strategy",
    "vr",
  ],
  capabilities: {
    hasCategoryPagination: true,
    hasSearchPagination: true,
  },

  async get_homepage_games() {
    const { data } = await axios.get(BASE_URL);
    const $ = cheerio.load(data);
    const homepage_games = [];

    const posts = $("li.post").toArray();
    for (const post of posts) {
      const titleTag = $(post).find("h2.post-title a");
      if (!titleTag.length) continue;

      const name = titleTag.text().trim();
      const game_page_link = BASE_URL + "/" + titleTag.attr("href");

      const img = $(post).find("a.post-thumb img");
      const thumbnail_link =
        img.attr("data-src-webp") || img.attr("data-src") || img.attr("src");

      const classes = $(post).attr("class")
        ? $(post).attr("class").split(" ")
        : [];
      const categories = classes
        .filter((c) => c.startsWith("category-"))
        .map((c) => c.replace("category-", ""));

      const res = await axios.get(game_page_link);
      const gameSoup = cheerio.load(res.data);
      const download_links = [];

      gameSoup("a").each((_, el) => {
        if ($(el).text().trim() === "DOWNLOAD HERE") {
          let link = $(el).attr("href");
          if (link.startsWith("//")) link = "https:" + link;
          download_links.push(link);
        }
      });

      homepage_games.push({ name, thumbnail_link, download_links, categories });
    }
    return homepage_games;
  },

  async get_games_by_category(category, page_number = 1) {
    const url =
      page_number === 1
        ? `${BASE_URL}/category/${category}/`
        : `${BASE_URL}/category/${category}/page/${page_number}`;
    return this._scrapeSlideGrid(url, [category]);
  },

  async search_games(query, page_number = 1) {
    const formattedQuery = query.replace(/ /g, "+");
    const url =
      page_number === 1
        ? `${BASE_URL}/?s=${formattedQuery}`
        : `${BASE_URL}/page/${page_number}/?s=${formattedQuery}`;
    return this._scrapeSlideGrid(url, []);
  },

  async _scrapeSlideGrid(url, defaultCategories) {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const results = [];

      const games = $("div.slide").toArray();
      for (const game of games) {
        const titleTag = $(game).find("h2.thumb-title a");
        if (!titleTag.length) continue;

        const name = titleTag.text().trim();
        const link = BASE_URL + "/" + titleTag.attr("href");
        const thumbnail =
          $(game).attr("data-back-webp") || $(game).attr("data-back");

        const res = await axios.get(link);
        const gameSoup = cheerio.load(res.data);
        const download_links = [];

        gameSoup("a").each((_, el) => {
          if ($(el).text().trim() === "DOWNLOAD HERE") {
            let dl = $(el).attr("href");
            if (dl.startsWith("//")) dl = "https:" + dl;
            download_links.push(dl);
          }
        });

        results.push({
          name,
          thumbnail_link: thumbnail,
          categories: defaultCategories,
          download_links,
        });
      }
      return results;
    } catch (e) {
      return []; // Return empty array on 404 (end of pages)
    }
  },
};
