import {build} from "esbuild";
import path from "node:path";
import {fileURLToPath} from "node:url";

const s_formatterRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));  // MarkdownFormatter 源码目录
const s_bundlePath = process.argv[2];  // bundle 输出路径

if (s_bundlePath === undefined) {
    throw new Error("Bundle output path is required");
}

// 通过稳定的 JavaScript API 解析当前平台对应的 esbuild 原生程序
await build({
    entryPoints: [path.join(s_formatterRoot, "src", "main.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: s_bundlePath,
});
