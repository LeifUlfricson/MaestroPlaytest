import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/module.js"],
  bundle: true,
  outfile: "dist/module.js",
  format: "esm",
  sourcemap: true,
  target: "es2022",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(options);
  console.log("Built dist/module.js");
}
