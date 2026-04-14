// ── 各功能 suite ──────────────────────────────────────────────────────────────
import { blockIndentSuite } from "./cases/blockIndent.js";
import { inlineSuite } from "./cases/inline.js";
import { lineSpacingSuite } from "./cases/lineSpacing.js";
import { listSuite } from "./cases/list.js";
import { otherSuite } from "./cases/other.js";
import { tableSuite } from "./cases/table.js";
import { textCorrectionSuite } from "./cases/textCorrection.js";
import { wordSpacingSuite } from "./cases/wordSpacing.js";

// ── 注册所有测试 ──────────────────────────────────────────────────────────────
textCorrectionSuite();
blockIndentSuite();
lineSpacingSuite();
wordSpacingSuite();
listSuite();
tableSuite();
inlineSuite();
otherSuite();
