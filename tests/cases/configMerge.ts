import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import { mergeConfig } from "../../src/configMerge.js";

export function configMergeSuite(): void {
    describe("configMerge", () => {
        it("合并列表类型配置，而不是用后一个列表覆盖前一个列表", () => {
            const config = mergeConfig(
                k_defaultFormatterConfig,
                {
                    textCorrection: {
                        replacements: [{ pattern: "foo", replacement: "bar" }],
                    },
                    list: {
                        trimTrailingChars: ["！"],
                    },
                },
                {
                    textCorrection: {
                        replacements: [{ pattern: "bar", replacement: "baz" }],
                    },
                    list: {
                        trimTrailingChars: ["？"],
                    },
                    table: {
                        trimTrailingChars: ["："],
                    },
                },
            );

            expect(config.textCorrection.replacements).toEqual([
                { pattern: "foo", replacement: "bar" },
                { pattern: "bar", replacement: "baz" },
            ]);
            expect(config.list.trimTrailingChars).toEqual(["。", "；", "，", "！", "？"]);
            expect(config.table.trimTrailingChars).toEqual(["。", "；", "，", "："]);
        });

        it("非列表类型配置仍然由后面的配置覆盖前面的配置", () => {
            const config = mergeConfig(
                k_defaultFormatterConfig,
                { list: { enabled: false, unorderedMarker: "*" } },
                { list: { enabled: true } },
            );

            expect(config.list.enabled).toBe(true);
            expect(config.list.unorderedMarker).toBe("*");
        });
    });
}
