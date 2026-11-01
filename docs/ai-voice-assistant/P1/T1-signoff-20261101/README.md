# AI Voice Assistant P1 · T1 最终工程签收资料

> **只读交付资料（2026-11-01）**。用于本地 Codex 对照现有工程进行 T1 工程签收。
> **绝不是实施授权**：P0 未执行；不得因此修改代码、数据库、配置、服务、提交、部署或调用真实模型/TTS。
> 本目录只是归档的交接输入，不替代项目本地 `doc/开发文档.md` 和 `doc/交接文档.md` 的权威状态。

## 文档索引

1. [T1-v1.1-contract-frozen.md](T1-v1.1-contract-frozen.md) — 冻结版 T1 接口与数据契约（包含 D1–D3）
2. [D1-D3-decisions.md](D1-D3-decisions.md) — 用户已确认的三项产品决议
3. [P0-data-protection-v1.0.1.md](P0-data-protection-v1.0.1.md) — 仅供审查的 P0 数据保护任务包，**未授权执行**
4. [T1-final-signoff-readonly.md](T1-final-signoff-readonly.md) — S01–S14 定点签收任务单，**本轮仅只读审查**

## 工程基线与分支隔离

- 远端设计资料分支：`docs/p1-t1-final-signoff-20261101`
- 该分支建立自远端 `codex/agentspec-migration-20261023` 的 `976d28984451b3a14ebe03523f5aae1bdf4a183e`（**不是**本地 HEAD）。
- 本地此前审计 HEAD：`2830307e9a8b97473b296a55454d0f815768c124`，含未推送 / 未跟踪更改，**以本地实际状态为准**。
- 不要因为审阅本目录而 checkout、reset、clean、merge、rebase、覆盖文档或调整本地 Git 状态。
- 此分支只上传设计文本，不含实际数据库、凭据、私人聊天、项目源文件或 ZIP 二进制；仓库目前为公开可见。

## 给本地 Codex 的使用说明

请直接读取上述四份 Markdown 的 **GitHub URL / raw URL**，对照本地真实源码和 AGENTS.md 进行 S01–S14 核查。报告三选一：`T1-ACCEPTED_FOR_P0_PLANNING`、`T1-CONDITIONAL`、`T1-BLOCKED`，给出逐项证据。不能把这次只读签收当成任何 P0 实施授权。

参考：文档中的“本文件不写入项目仓库”等表述是 **首次生成时的历史状态**；本次因用户要求而另存到了独立文档分支，不表示项目主线已经采纳、合并或实施。
