import { format } from "../src/pipeline.js";
import type { FormatterConfig } from "../src/config.js";

/**
 * 格式化一段 Markdown，返回去除首尾空白的结果。
 * 各 suite 使用自己构造的 FormatterConfig 调用此函数。
 */
export async function fmt(input: string, config: FormatterConfig): Promise<string> {
    return (await format(input, config)).trim();
}
