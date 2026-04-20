import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";

function makeConfig(overrides: any): FormatterConfig {
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

        it("保持分隔符", async () => {
            expect(await fmt("---", config)).toBe("---");
        });

        /*====-------------- List --------------====*/

        // it("- * 不应该被格式化", async () => {
        //     const cfg = makeConfig({ list: { unorderedMarker: "-" } });
        //     expect(await fmt("- * Hello", cfg)).toBe("- * Hello");
        // });

        /*====-------------- Blockquote --------------====*/

        it(">> 不应该被格式化", async () => {
            expect(await fmt(">> Hello", config)).toBe(">> Hello");
        });

        it("- >不应该被格式化", async () => {
            expect(await fmt("- >Hello", config)).toBe("- >Hello");
        });

        it("1. >不应该被格式化", async () => {
            expect(await fmt("1. >Hello", config)).toBe("1. >Hello");
        });

        it("> >不应该被格式化", async () => {
            expect(await fmt("> >Hello", config)).toBe("> >Hello");
        });

        it("- > 不应该被格式化", async () => {
            expect(await fmt("- > Hello", config)).toBe("- > Hello");
        });

        /*====-------------- Escape --------------====*/

        describe("Parse 阶段：自然反转义", () => { // 让 mdast 自然反转义，格式化器不重新转义
            const config = makeConfig({});

            it("各种符号经 parse 反转义后原样输出", async () => {
                expect(await fmt("\\\\ \\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\# \\+ \\- \\. \\! \\| \\~ \\< \\> \\&", config)).toBe("\\ ` * _ { } [ ] ( ) # + - . ! | ~ < > &");
            });

            it("已转义的 \\[ 会被反转义", async () => {
                expect(await fmt("text \\[ end", config)).toBe("text [ end");
            });

            it("已转义的 \\] 会被反转义", async () => {
                expect(await fmt("text \\] end", config)).toBe("text ] end");
            });

            it("\\[&\\] 经 parse 反转义后不被重新转义", async () => {
                expect(await fmt("\\[&\\]", config)).toBe("[&]");
            });

            it("* 号复杂情况下的反转义", async () => {
                expect(await fmt("copy \\*.txt \\*.bak", config)).toBe("copy *.txt *.bak");
            });
        })

        describe("Serialization 阶段：最小转义策略", () => { // 默认不执行保护性转义，仅在必要时转义
            const config = makeConfig({});

            it("链接 URL 中的 & 不被转义为 \\&", async () => {
                expect(await fmt("[link](https://example.com?a=1&b=2)", config))
                    .toBe("[link](https://example.com?a=1&b=2)");
            });

            it("省略号正确", async () => {
                expect(await fmt("...\n\n(...)\n\n[](...)", config))
                    .toBe("...\n\n(...)\n\n[](...)");
            });

            it("~ 符号不产生额外转义", async () => {
                expect(await fmt("C:\\\\PROGRA~2\\\\WINDOW~3\\\\ACCESS~1\\\\wordpad.exe", config))
                    .toBe("C:\\PROGRA~2\\WINDOW~3\\ACCESS~1\\wordpad.exe");
            });

            it("$ 符号不产生额外转义", async () => {
                expect(await fmt("$", config))
                    .toBe("$");
            });

            it("$$ 符号不产生额外转义", async () => {
                expect(await fmt("OKOK\n\n$$\n\nEnd", config))
                    .toBe("OKOK\n\n$$\n\nEnd");
            });

            it("列表中 ( 的转义测试", async () => {
                expect(await fmt("1. [](()", config))
                    .toBe("1. [](()");
            });

            it("公式块复杂测试（一）", async () => {
                expect(await fmt("$$\\begin{array}\nf(x)=ax+b\\\\\n\\end{array}$$", config))
                    .toBe("$$\\begin{array}\nf(x)=ax+b\\\\\n\\end{array}$$");
            });

            it("公式块复杂测试（二）", async () => {
                expect(await fmt("$$\n\\begin{array}\nf(x)=ax+b\\\\\n\\end{array}\n$$", config))
                    .toBe("$$\n\\begin{array}\nf(x)=ax+b\\\\\n\\end{array}\n$$");
            });

            it("公式块复杂测试（三）", async () => {
                expect(await fmt("- Test List\n\n  $$\n  \\begin{array}\n  f(x)=ax+b\\\\\n  \\end{array}\n  $$", config))
                    .toBe("- Test List\n\n  $$\n  \\begin{array}\n  f(x)=ax+b\\\\\n  \\end{array}\n  $$");
            });

            it("公式块复杂测试（四）", async () => {
                expect(await fmt("> Test BlockQuote:\n> $$\n> \\begin{array}\n> f(x)=ax+b\\\\\n> \\end{array}\n> $$", config))
                    .toBe("> Test BlockQuote:\n> $$\n> \\begin{array}\n> f(x)=ax+b\\\\\n> \\end{array}\n> $$");
            });

            it("公式块复杂测试（五）", async () => {
                expect(await fmt("SomeText\n\n$$f(x)=ax+b$$\n\nEndText", config))
                    .toBe("SomeText\n\n$$f(x)=ax+b$$\n\nEndText");
            });

            it("公式块复杂测试（六）", async () => {
                expect(await fmt("Some Equation：\n$$\n\\begin{array}\nf(x)=ax+b\\\\\n\\end{array}\n$$\n\nEndText", config))
                    .toBe("Some Equation：\n$$\n\\begin{array}\nf(x)=ax+b\\\\\n\\end{array}\n$$\n\nEndText");
            });

            it("公式块复杂测试（七）", async () => {
                expect(await fmt("Test List:\n- 计算\n\n  $$f(x) = ax + \\\\\n  b$$\n\nAfter Content", config))
                    .toBe("Test List:\n- 计算\n\n  $$f(x) = ax + \\\\\n  b$$\n\nAfter Content");
            });

            it("公式块不应该影响到后续内容的解析", async () => {
                expect(await fmt("Some Equation：\n$$two line\nequation$$\n* Test List", config))
                    .toBe("Some Equation：\n$$two line\nequation$$\n- Test List");
            });

            it("公式块内的内容不应该被转义影响", async () => {
                expect(await fmt("Before Equation:\n\n$$\\left \\{ \\\\\n\\right.$$\n\nAfter Equation", config))
                    .toBe("Before Equation:\n\n$$\\left \\{ \\\\\n\\right.$$\n\nAfter Equation");
            });

            it(". 符号不产生额外转义", async () => {
                expect(await fmt("stackoverflow.com", config))
                    .toBe("stackoverflow.com");
            });

            it("$ 符号不产生额外转义", async () => {
                expect(await fmt("perl -ne \"$. <= 10 and print\" MyFile.txt", config))
                    .toBe("perl -ne \"$. <= 10 and print\" MyFile.txt");
            });

            it("= 符号不产生额外转义", async () => {
                expect(await fmt("==mark==", config))
                    .toBe("==mark==");
            });

            it("& 符号不产生额外转义", async () => {
                expect(await fmt("- echo 1&echo 2&echo 3", config))
                    .toBe("- echo 1&echo 2&echo 3");
            });

            it("< 符号不产生额外转义", async () => {
                expect(await fmt("set <NUL /p=Output of a command", config))
                    .toBe("set <NUL /p=Output of a command");
            });

            it("图片 URL 中的 & 不被转义为 \\&", async () => {
                expect(await fmt("![img](https://example.com?x=1&y=2)", config))
                    .toBe("![img](https://example.com?x=1&y=2)");
            });

            it("带 title 的链接 URL 中的 & 不被转义为 \\&", async () => {
                expect(await fmt('[link](https://a.com?x=1&y=2 "My Title")', config))
                    .toBe('[link](https://a.com?x=1&y=2 "My Title")');
            });

            it("引用定义 URL 中的 & 不受影响", async () => {
                expect(await fmt("[label]: https://example.com?a=1&b=2", config))
                    .toBe("[label]: https://example.com?a=1&b=2");
            });

            it("内联链接 URL 中的平衡括号不被转义", async () => {
                expect(await fmt("[Command shell overview](https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-xp/bb490954(v=technet.10))", config))
                    .toBe("[Command shell overview](https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-xp/bb490954(v=technet.10))");
            });

            describe("段落文本中的 ] 字符", () => {
                it("单个符号本身不被额外转义", async () => {
                    expect(await fmt("\\ ` * _ { } [ ] ( ) # + - . ! | ~ < > &", config)).toBe("\\ ` * _ { } [ ] ( ) # + - . ! | ~ < > &");
                });

                it("] 不被额外转义为 \\]", async () => {
                    expect(await fmt("text ] end", config)).toBe("text ] end");
                });

                it("多个 ] 均不被转义", async () => {
                    expect(await fmt("a ] b ] c", config)).toBe("a ] b ] c");
                });

                it("[] 对不被转义为 \\[\\]", async () => {
                    expect(await fmt("[]", config)).toBe("[]");
                });
            });

            describe("行内格式中的 ] 不被额外转义", () => {
                it("加粗内的 ] 不被转义", async () => {
                    expect(await fmt("**a ] b**", config)).toBe("**a ] b**");
                });

                it("斜体内的 ] 不被转义", async () => {
                    expect(await fmt("*a ] b*", config)).toBe("*a ] b*");
                });

                it("标题中的 ] 不被转义", async () => {
                    expect(await fmt("## title ] more", config)).toBe("## title ] more");
                });

                it("引用块中的 ] 不被转义", async () => {
                    expect(await fmt("> text ] end", config)).toBe("> text ] end");
                });
            });

            describe("] 在特定上下文中不被转义", () => {
                it("行内代码中的 ] 不被转义", async () => {
                    expect(await fmt("`array[0]`", config)).toBe("`array[0]`");
                });

                it("围栏代码块中的 ] 不被转义", async () => {
                    expect(await fmt("```\n] code\n```", config)).toBe("```\n] code\n```");
                });

                it("带语言标识的代码块中的 ] 不被转义", async () => {
                    expect(await fmt("```js\nfn(c]d);\n```", config)).toBe("```js\nfn(c]d);\n```");
                });

                it("行内数学公式中的 ] 不被转义", async () => {
                    expect(await fmt("$a ] b$", config)).toBe("$a ] b$");
                });

                it("块级数学公式中的 ] 不被转义", async () => {
                    expect(await fmt("$$\na ] b\n$$", config)).toBe("$$\na ] b\n$$");
                });

                it("链接标签内的 \\] 保持转义形式", async () => {
                    // 链接文本中字面量 ] 需保持 \] 以免截断标签
                    expect(await fmt("[te\\]xt](https://a.com)", config))
                        .toBe("[te\\]xt](https://a.com)");
                });

                it("表格单元格中的 ] 不被转义", async () => {
                    const input = "| a ] b | c |\n| --- | --- |\n| x | y |";
                    const result = await fmt(input, config);
                    expect(result).toContain("a ] b");
                    expect(result).not.toContain("\\]");
                });

                it("链接 title 中的 ] 不被转义", async () => {
                    expect(await fmt('[foo](<> "title ] more")', config))
                        .toBe('[foo](<> "title ] more")');
                });
            });

            describe("链接与图片 URL 中的各类特殊字符", () => {
                it("URL 中多个 & 参数均不被转义", async () => {
                    expect(await fmt("[link](https://a.com?x=1&y=2&z=3)", config))
                        .toBe("[link](https://a.com?x=1&y=2&z=3)");
                });

                it("URL 中的 # fragment 不被修改", async () => {
                    expect(await fmt("[link](https://a.com/page#section)", config))
                        .toBe("[link](https://a.com/page#section)");
                });

                it("URL 中的 %20 百分号编码不被修改", async () => {
                    expect(await fmt("[link](https://a.com/path%20file)", config))
                        .toBe("[link](https://a.com/path%20file)");
                });

                it("URL 中的 &amp; 实体经 round-trip 后还原为 &", async () => {
                    // 解析器会将 &amp; 解码为 &，序列化时仍输出 &
                    expect(await fmt("[link](https://a.com?a=1&amp;b=2)", config))
                        .toBe("[link](https://a.com?a=1&b=2)");
                });

                it("带 title 的图片 URL 中的 & 不被转义", async () => {
                    expect(await fmt('![img](https://a.com?x=1&y=2 "Alt")', config))
                        .toBe('![img](https://a.com?x=1&y=2 "Alt")');
                });

                it("带 title 的引用定义中的 & 不被转义", async () => {
                    expect(await fmt('[label]: https://a.com?a=1&b=2 "My Title"', config))
                        .toBe('[label]: https://a.com?a=1&b=2 "My Title"');
                });

                it("自动链接中的 & 不被转义", async () => {
                    expect(await fmt("<https://a.com?x=1&y=2>", config))
                        .toBe("<https://a.com?x=1&y=2>");
                });

                it("裸 URL 自动转换为自动链接后 & 不被转义", async () => {
                    expect(await fmt("Visit https://a.com?x=1&y=2 here", config))
                        .toBe("Visit https://a.com?x=1&y=2 here");
                });
            });

            describe("& 在非链接上下文中不被转义", () => {
                it("段落中的 & 不被转义", async () => {
                    expect(await fmt("text & more", config)).toBe("text & more");
                });

                it("链接文本中的 & 不被转义", async () => {
                    expect(await fmt("[A & B](https://a.com)", config))
                        .toBe("[A & B](https://a.com)");
                });

                it("图片 alt 中的 & 不被转义", async () => {
                    expect(await fmt("![a & b](https://a.com)", config))
                        .toBe("![a & b](https://a.com)");
                });

                it("行内代码中的 & 不被转义", async () => {
                    expect(await fmt("`a & b`", config)).toBe("`a & b`");
                });

                it("围栏代码块中的 & 不被转义", async () => {
                    expect(await fmt("```\na & b\n```", config)).toBe("```\na & b\n```");
                });

                it("行内数学公式中的 & 不被转义", async () => {
                    expect(await fmt("$a & b$", config)).toBe("$a & b$");
                });

                it("块级数学公式中的 & 不被转义", async () => {
                    expect(await fmt("$$\na & b\n$$", config)).toBe("$$\na & b\n$$");
                });

                it("链接 title 中的 & 不被转义", async () => {
                    expect(await fmt('[foo](<> "title & more")', config))
                        .toBe('[foo](<> "title & more")');
                });

                it("&amp; 实体经 round-trip 后变为字面量 &", async () => {
                    expect(await fmt("A &amp; B", config)).toBe("A & B");
                });
            });

            describe("行内 HTML 不被修改", () => {
                it("行内 <br> 标签保持不变", async () => {
                    expect(await fmt("text <br> more", config)).toBe("text <br> more");
                });

                it("带属性的行内 HTML 标签保持不变", async () => {
                    expect(await fmt('<span class="x">text</span>', config))
                        .toBe('<span class="x">text</span>');
                });
            });

            describe("潜在需要保留的转义", () => {
                // it("\\* 保持不变", async () => {
                //     expect(await fmt("\\*not bold\\*", config)).toBe("\\*not bold\\*");
                // });

                // it("\\_ 保持不变", async () => {
                //     expect(await fmt("\\_not italic\\_", config)).toBe("\\_not italic\\_");
                // });

                it("\\\\ 双反斜杠保持不变", async () => {
                    expect(await fmt("\\\\", config)).toBe("\\\\");
                });

                it("\\# 保持不变", async () => {
                    expect(await fmt("\\# not heading", config)).toBe("\\# not heading");
                });

                it("\\` 保持不变", async () => {
                    expect(await fmt("\\`not code\\`", config)).toBe("\\`not code\\`");
                });
            });

            describe("格式符号不产生多余转义", () => {
                it("* 斜体正常显示", async () => {
                    expect(await fmt("它使*计算机系统*能够", config)).toBe("它使*计算机系统*能够");
                });
                it("* 斜体正常显示（英文）", async () => {
                    expect(await fmt("它使*computer system* 能够", config)).toBe("它使 *computer system* 能够");
                });
                it("_ 正常切换为 *", async () => {
                    expect(await fmt("它使_计算机系统_能够", config)).toBe("它使_计算机系统_能够");
                });
                it("_ 在英文时保持正常", async () => {
                    expect(await fmt("ok test_some_code ok", config)).toBe("ok test_some_code ok");
                });
                it("_ 在英文时保持正常（两侧暴露）", async () => {
                    expect(await fmt("ok _some_ ok", config)).toBe("ok _some_ ok");
                });
                it("_ 在英文时保持正常（两侧暴露，双下划线）", async () => {
                    expect(await fmt("ok __DEFINE__ ok", config)).toBe("ok __DEFINE__ ok");
                });
            });

            describe("列表中的转义", () => {
                it("无序列表项中链接 URL 含 & 不被转义", async () => {
                    expect(await fmt("- [link](https://a.com?x=1&y=2)", config))
                        .toBe("- [link](https://a.com?x=1&y=2)");
                });

                it("有序列表项中链接 URL 含 & 不被转义", async () => {
                    expect(await fmt("1. [link](https://a.com?x=1&y=2)", config))
                        .toBe("1. [link](https://a.com?x=1&y=2)");
                });

                it("嵌套列表中链接 URL 含 & 不被转义", async () => {
                    expect(await fmt("- item\n  - [link](https://a.com?x=1&y=2)", config))
                        .toBe("- item\n  - [link](https://a.com?x=1&y=2)");
                });

                it("列表项中独立的 ] 不被转义", async () => {
                    expect(await fmt("- text ] item", config)).toBe("- text ] item");
                });
            });

            describe("表格中的转义", () => {
                it("表格单元格中 & 文本不被转义", async () => {
                    const input = "| a & b | c |\n| --- | --- |\n| x | y |";
                    const result = await fmt(input, config);
                    expect(result).toContain("a & b");
                    expect(result).not.toContain("\\&");
                });

                it("表格单元格中 _ 文本不被转义", async () => {
                    const input = "a   | b\n----|----\n$_  | b";
                    const result = await fmt(input, config);
                    expect(result).toBe("a   | b\n----|----\n$_  | b");
                });

                it("表格单元格中包含链接时 URL & 不被转义", async () => {
                    const input = "| [go](https://a.com?x=1&y=2) | c |\n| --- | --- |\n| x | y |";
                    const result = await fmt(input, config);
                    expect(result).toContain("https://a.com?x=1&y=2");
                    expect(result).not.toContain("\\&");
                });
            });

            describe("引用块中的转义", () => {
                it("引用块中链接 URL 含 & 不被转义", async () => {
                    expect(await fmt("> [link](https://a.com?x=1&y=2)", config))
                        .toBe("> [link](https://a.com?x=1&y=2)");
                });

                it("引用块中带上下文的链接 URL 含 & 不被转义", async () => {
                    expect(await fmt("> See [this](https://a.com?x=1&y=2) for details", config))
                        .toBe("> See [this](https://a.com?x=1&y=2) for details");
                });
            });

            describe("引用式链接与图片中的转义", () => {
                it("引用式链接定义 URL 含 & 不被转义", async () => {
                    const input = "[link][ref]\n\n[ref]: https://a.com?a=1&b=2";
                    expect(await fmt(input, config)).toBe("[link][ref]\n\n[ref]: https://a.com?a=1&b=2");
                });

                it("引用式图片定义 URL 含 & 不被转义", async () => {
                    const input = "![alt][ref]\n\n[ref]: https://a.com?x=1&y=2";
                    expect(await fmt(input, config)).toBe("![alt][ref]\n\n[ref]: https://a.com?x=1&y=2");
                });
            });
        });

        /*====-------------- Link --------------====*/

        it("保持网址不变", async () => {
            expect(await fmt("https://csdiy.wiki/并行与分布式系统/CS149/", config)).toBe("https://csdiy.wiki/并行与分布式系统/CS149/");
        });
    });
}
