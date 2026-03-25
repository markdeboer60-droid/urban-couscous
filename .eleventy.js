import pluginRss from "@11ty/eleventy-plugin-rss";

export default function (eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(pluginRss);

  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("site/assets");
  eleventyConfig.addPassthroughCopy("site/robots.txt");
  eleventyConfig.addPassthroughCopy({ "site/favicon.ico": "favicon.ico" });

  // Collections
  eleventyConfig.addCollection("nieuws", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("site/content/nieuws/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("columns", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("site/content/columns/*.md")
      .sort((a, b) => b.date - a.date);
  });

  // Filters
  eleventyConfig.addFilter("dateNL", function (date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  });

  eleventyConfig.addFilter("isoDate", function (date) {
    if (!date) return "";
    return new Date(date).toISOString();
  });

  eleventyConfig.addFilter("limit", function (arr, limit) {
    return arr ? arr.slice(0, limit) : [];
  });

  eleventyConfig.addFilter("dienstLabel", function (slug) {
    const labels = {
      "jaarrekening": "Jaarrekening",
      "belastingaangifte": "Belastingaangifte",
      "loonadministratie": "Loonadministratie",
      "fiscaal-advies": "Fiscaal advies",
      "bedrijfsoverdracht": "Bedrijfsoverdracht",
      "administratie": "Administratie",
      "financieringsadvies": "Financieringsadvies",
      "startersbegeleiding": "Startersbegeleiding",
      "erf-en-schenkbelasting": "Erf- en schenkbelasting",
    };
    return labels[slug] || slug;
  });

  // Global data
  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());

  // Watch targets
  eleventyConfig.addWatchTarget("site/assets/css/");
  eleventyConfig.addWatchTarget("site/assets/js/");

  return {
    dir: {
      input: "site",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
