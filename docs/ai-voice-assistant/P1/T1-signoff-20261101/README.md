# AI Voice Assistant P1 · T1 冻结资料与签收后交接

> **当前状态（2026-11-02）：`T1-ACCEPTED_FOR_P0_PLANNING`**，根据本地 Codex 的静态工程签收回执更新。**P0 仅任务包已准备，未授权、未执行；T2/P1 未启动；真实运行和用户验收未做。**
>
> **重要版本边界：** 本地签收针对 **`abbb9e449da59cc4c29f0db8435484d5121d3a97`** 的四份冻结输入。下面新增的签收回执、勘误、P0-01 草案为**签收后的归档**，不能自动视作已工程签收。
>
> 原项目权威进度仍以本地 `doc/开发文档.md`、`doc/交接文档.md` 为准；此 GitHub 文档目录不是第二套项目实时状态，不代表本地已改动。

## V1 一次性本地开发总任务（新增；只有用户在本地 Codex 明确发送后才授权）

- **[V1-one-shot-local-implementation-handoff.md](V1-one-shot-local-implementation-handoff.md)** — 将 P0 数据保护、P1a～P1f 全部功能开发、原生前端集成与 U01～U24 验收整合为一个可连续推进的本地 Codex 任务，不再要求每一子阶段返回网页端。
- 本文是 **2026-11-02 的后续任务交接**，不属于 abbb9e4 当时已签收的原始冻结输入，也不更改 T1-ACCEPTED_FOR_P0_PLANNING 的签收版本界限。
- **GitHub 创建任务文档本身不是实施许可**。用户将该文件第 6 节的限域授权正文亲自发送给本地 Codex 后，才允许其在限定范围内做本地代码开发与虚构数据测试；真实数据库备份/迁移、生产或现有服务操作、实际模型/TTS、依赖安装、Git 写操作和部署仍须额外授权。

## 当前优先阅读

1. **[T1-signoff-receipt-20261102.md](T1-signoff-receipt-20261102.md)** — 2026-11-02 本地最终签收状态与 S01–S14 回执归档
2. **[N1-N4-errata-and-followup.md](N1-N4-errata-and-followup.md)** — 四项非阻断差异的阶段归属、范围与未签收勘误说明
3. **[P0-01-authorization-draft.md](P0-01-authorization-draft.md)** — **仅供用户以后批准**的 P0-01 只读核查文本；现在不得执行

## 已签收的原始冻结输入（历史版本原文不变）

1. [T1-v1.1-contract-frozen.md](T1-v1.1-contract-frozen.md) — D1–D3 已确认的接口及数据契约
2. [D1-D3-decisions.md](D1-D3-decisions.md) — 用户最终确认的三项产品决议
3. [P0-data-protection-v1.0.1.md](P0-data-protection-v1.0.1.md) — P0-01～07 任务包，**未授权实施**
4. [T1-final-signoff-readonly.md](T1-final-signoff-readonly.md) — 原 S01–S14 工程签收指令；文中“签收未完成”是生成时历史状态，不代表目前仍待签收

**原版签收依据的固定提交：**
https://github.com/qianxiaohuaqi-design/ai-voice-assistant/tree/abbb9e449da59cc4c29f0db8435484d5121d3a97/docs/ai-voice-assistant/P1/T1-signoff-20261101

## 基线、安全与协作约束

- 本地项目：`D:\Project\app\ai-voice-assistant`；签收时本地 HEAD：`2830307e9a8b97473b296a55454d0f815768c124`。该值是**历史签收基线**，实施前必须重新核验。
- 当前文件所在独立 GitHub 文档分支：`docs/p1-t1-final-signoff-20261101`，源自早期远端业务提交 `976d28984451b3a14ebe03523f5aae1bdf4a183e`；**不能用该快照覆盖本地真实工作区**。
- 仓库公开可见；仅存设计文字及必要非秘密基线，不上传真实 DB、音频、私聊、凭据、Token。
- 不 checkout/merge/reset/clean 本地项目来取得文档；本地可直接通过 GitHub 读取这些文件。
- `.agentspec/manifest.json` 变更内容与完整性关系已追溯，但触发进程及授权来源未核实，不因此擅自回滚。
- D1–D3 **已确认，无需再次征询**；N1–N4 是非阻断差异，分配到 P0-04 / P1a / 后续 API / 文档整理处理。
- **下一步**：只有用户明确授权某个动作，才可执行。可供选择的最小动作是 [P0-01 的只读保护核查](P0-01-authorization-draft.md)。**此 README 更新和文档归档不是 P0 授权。**

## P0 未来执行顺序（仅计划）

`P0-01 → P0-02 → P0-04 → P0-03 → P0-05 → P0-06 → P0-07`

P0-02 真实数据备份、P0-04 维护切换、P0-03 schema、代码准备、隔离测试、服务启停、Git/部署均须按操作边界单独批准。不能因为 T1 签收通过就启动任何一项。
