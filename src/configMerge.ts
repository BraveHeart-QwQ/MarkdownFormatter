//===----------------------------------------------------------------------===//
//
// @desc    : 配置叠加工具
//
//===----------------------------------------------------------------------===//

import type { FormatterConfig } from "./config.js";

export type PartialFormatterConfig = {
    [K in keyof FormatterConfig]?: Partial<FormatterConfig[K]>;
};

function mergeConfigSection<T extends object>(baseSection: T, overrideSection: Partial<T>): T {
    const baseRecord = baseSection as unknown as Record<string, unknown>;
    const overrideRecord = overrideSection as unknown as Record<string, unknown>;
    const mergedSection: Record<string, unknown> = { ...baseRecord };

    for (const key of Object.keys(overrideRecord)) {
        const overrideValue = overrideRecord[key];
        if (overrideValue === undefined) continue;

        const baseValue = baseRecord[key];
        mergedSection[key] = Array.isArray(baseValue) && Array.isArray(overrideValue)
            ? [...baseValue, ...overrideValue]
            : overrideValue;
    }

    return mergedSection as unknown as T;
}

export function mergeConfig(base: FormatterConfig, ...overrides: PartialFormatterConfig[]): FormatterConfig {
    let result = { ...base };

    for (const override of overrides) {
        for (const sectionKey of Object.keys(override) as Array<keyof FormatterConfig>) {
            const overrideSection = override[sectionKey];
            if (overrideSection !== undefined) {
                result = {
                    ...result,
                    [sectionKey]: mergeConfigSection(result[sectionKey], overrideSection),
                };
            }
        }
    }

    return result;
}
