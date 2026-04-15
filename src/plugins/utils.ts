/** 循环去除 value 末尾出现的任意指定字符串（可重复去除，直到无变化为止）。 */
export function trimTrailingChars(value: string, chars: string[]): string {
    let changed = true;
    while (changed) {
        changed = false;
        for (const ch of chars) {
            if (value.endsWith(ch)) {
                value = value.slice(0, -ch.length);
                changed = true;
            }
        }
    }
    return value;
}
