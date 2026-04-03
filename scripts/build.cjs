process.env.BROWSERSLIST_IGNORE_OLD_DATA = "true";
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = "true";

require("./silence-baseline-warning.cjs");

process.argv = [
  process.argv[0],
  require.resolve("next/dist/bin/next"),
  "build",
];

require("next/dist/bin/next");
