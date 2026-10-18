# AI Instructions

## Project

- 项目概览、使用方式和配置说明见 [README.md](README.md)
- 本项目使用 TypeScript、Node.js、pnpm 和 remark，包含 CLI、可复用的格式化流程和 VS Code 扩展
- `src/` 为核心实现，`src/plugins/` 和 `src/handlers/` 为格式化插件及序列化处理，`vscode-extension/src/` 为扩展实现，`tests/` 为测试，`tools/` 为辅助脚本
- 默认配置和配置校验见 `src/config.ts`，格式化流程见 `src/pipeline.ts`；修改前先阅读相关实现及测试

## Common

- Do not stage changes
- Do not build the project
- Use UTF-8; preserve existing line endings and avoid unrelated encoding, line-ending, or formatting changes
- Avoid unnecessary changes
- Do not change existing code unrelated to the task even if the code violates the coding style
- 不擅自添加用户未要求的新特性，不把未经确认的假设写成需求
- 不直接修改第三方依赖代码；确有必要时，先说明原因和建议并取得用户明确许可
- Do not manually edit build artifacts or simulate generated output; modify the source files or generation configuration instead
- 本项目禁止构建，不能为更新产物而运行构建或打包流程

## Requirements and Implementation

- 用普通中文说明输入、操作和结果，必要时使用简单例子，避免不必要的抽象术语
- 优先采用可靠、有效且尽可能小的修复，解决问题本身，不通过跳过检查、吞掉错误或修改预期结果来绕过问题
- Keep the solution as simple and direct as possible
- 避免过度设计、低价值冗余和没有明确用途的抽象、状态或扩展机制
- When future requirements are unclear, keep the implementation simple so it can be extended or refactored later
- 需要澄清时指出具体问题，并提供建议
- 遇到会影响行为或需要改变设计的需求缺口、指令冲突或文档问题时，先说明影响和建议，再向用户确认；一般实现细节遵循现有代码和任务目标处理
- 修复问题需要大幅扩大范围或改用其他方案时，先向用户说明取舍并确认，不擅自替换目标
- Avoid unnecessary defensive code; retain meaningful input validation and boundary handling, and let unhandled errors propagate naturally
- Avoid repeated computation and unnecessary allocations, but do not overcomplicate the code for unproven performance concerns

## Coding Conventions

- 遵循所修改文件的现有语言习惯、命名、缩进、括号和导入风格，不移植其他项目的专属规范
- Group related code by functionality and reuse existing utilities; extract general-purpose helpers only when there is a clear reuse requirement
- 修改公共配置、CLI 参数或扩展设置时，检查默认值、校验、配置合并、相关调用方和文档是否需要同步

## Comments

- 注释主要用途是**说明用途**，其次才是提示坑点
- Use concise comments, primarily in Chinese, for new or modified public interfaces and non-obvious logic
- Order declaration comments by meaning: first state what the declared element is or does, then explain its purpose when useful, and finally add necessary details or caveats
- Never let implementation details or cautions replace the basic description; a reader must understand the element's role or behavior from the opening phrase
- Do not translate code line by line, pile up implementation details or migration history, or merely restate names; omit comments that add no information to obvious local variables or statements
- After editing comments, check them against the declarations and implementations for accuracy
- Comments and message strings do not require a trailing period
- Write logs in English and use UTF-8 encoding; follow the existing output style

## Markdown

- No line length limitation, **Do not break logical line**
- 内容较多时优先使用无序列表，只有确实便于比较时才使用表格
- Markdown 测试输入和预期输出属于测试数据，不为满足文档排版习惯而改写

## Validation

- Add necessary behavior tests for new features and regression tests for bug fixes, following the existing test organization
- 格式化用例主要位于 `tests/cases/`，并在需要时通过 `tests/formatter.test.ts` 注册
- 测试应验证输入和结果，不机械重复实现；不要仅为让测试通过而降低断言要求
- 根据改动范围选择验证：根目录 `pnpm test` 运行 Vitest，`pnpm typecheck` 检查核心 TypeScript 类型；扩展类型检查使用 `pnpm -C vscode-extension typecheck`
- 只修改文档时，检查内容、引用路径和差异即可，无需运行代码测试
- 禁止运行根项目或扩展的构建、watch、prepublish 和打包流程，包括 `pnpm build`、esbuild 及会间接触发构建的脚本；类型检查只能使用不生成产物的 `typecheck` 命令
- 完成后检查差异，说明改了什么、验证了什么，以及未完成的检查和原因；不暂存任何改动
