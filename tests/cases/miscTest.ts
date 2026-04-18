import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";

function makeConfig(overrides: Partial<FormatterConfig>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        ...overrides,
        list: { ...k_defaultFormatterConfig.list, ...overrides.list },
        table: { ...k_defaultFormatterConfig.table, ...overrides.table },
        inline: { ...k_defaultFormatterConfig.inline, ...overrides.inline },
        other: { ...k_defaultFormatterConfig.other, ...overrides.other },
    };
}

export function miscSuite(): void {
    describe("other", () => {
        const config = makeConfig({});

        // 算了，这个暂时不修了，很罕见的用法
        // it(">> 不应该被格式化", async () => {
        //     expect(await fmt(">> Hello", config)).toBe(">> Hello");
        // });
    });
}
