import * as esbuild from "esbuild";

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile: "dist/extension.js",
    // vscode API is provided by the host at runtime — never bundle it
    external: ["vscode"],
    sourcemap: !isProduction,
    minify: isProduction,
};

if (isWatch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log("esbuild: watching for changes...");
} else {
    await esbuild.build(options);
    console.log("esbuild: build complete →", options.outfile);
}
