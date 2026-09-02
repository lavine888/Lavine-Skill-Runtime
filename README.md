<div align="center">

# Lavine Skill Runtime

### Run reviewed Skills as real products.  
### 把审核过的 `SKILL.md`，真正跑成产品。

**Contract-first · LLM + Python · provenance-aware · deliberately small**  
**契约优先 · LLM + Python · 来源可追溯 · 刻意保持小而清晰**

<br />

[![CI](https://github.com/lavine888/Lavine-Skill-Runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/lavine888/Lavine-Skill-Runtime/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node-22-151613?style=flat-square&logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3-151613?style=flat-square&logo=python&logoColor=white)
![Runtime](https://img.shields.io/badge/Runtime-LLM%20%2B%20Python-F16645?style=flat-square)
![Skills](https://img.shields.io/badge/Runnable%20Skills-3-F3EFE6?style=flat-square&labelColor=151613&color=F3EFE6)

<br />

[English](#english) · [中文](#中文) · [Quick Start](#quick-start--快速启动) · [Architecture](#architecture--架构) · [API](#api-v1) · [Docs](#docs--文档)

</div>

---

## Why this exists · 为什么做这个

Most `SKILL.md` files are excellent **instructions**, but they still live inside a repository waiting for an agent to interpret them.

很多 `SKILL.md` 本质上只是优秀的**操作说明**：它们很聪明，但还停留在仓库里，需要 Agent 读懂之后才能执行。

**Lavine Skill Runtime adds the missing execution layer.**  
**Lavine Skill Runtime 补上的，就是中间这层“可运行能力”。**

```text
SKILL.md
   │
   │  reviewed instructions / 审核后的规则
   ▼
Manifest + JSON Schema
   │
   ▼
Runtime Core
   │
   ├───────────────┐
   ▼               ▼
LLM Runner     Python Runner
   │               │
   └───────┬───────┘
           ▼
   Validated Run
           │
      ┌────┴────┐
      ▼         ▼
     Web       API
```

> **If a capability is listed here, it runs. If it does not run, it is not part of the contract.**  
> **这里写出来的能力，就必须真的能跑；不能跑的，就不进入协议。**

---

## English

### The 10-second mental model

Lavine Skill Runtime is a deliberately small execution layer that turns **reviewed Agent Skills** into schema-driven web/API products without teaching the Runtime Core their business logic.

Think of it as:

```text
Skill definition  →  contract  →  runner  →  validated result
```

The Runtime owns **execution semantics**. The Skill owns **business meaning**.

### What runs today

| Skill | What it does | Runtime | Execution |
| --- | --- | --- | --- |
| `career-alpha-proof` | Audits career claims and proof strength | LLM | OpenAI-compatible provider or deterministic demo |
| `career-alpha-position` | Generates evidence-aware career positioning | LLM | OpenAI-compatible provider or deterministic demo |
| `buffett-moat-rule-check` | Applies Buffett-style hard rules to supplied metrics | Python | reviewed repo-local subprocess |

The Buffett integration is intentionally narrow. It evaluates supplied metrics only; it does **not** duplicate the source repository's PandaData ingestion, point-in-time reconstruction, Parquet generation, or backtesting pipeline.

### What the Runtime guarantees

- **Schema-valid I/O** — JSON Schema 2020-12 on every Skill input and output.
- **Immutable provenance** — repository, source path, ref, and exact 40-character commit SHA travel with the Run.
- **Shared lifecycle** — `queued → running → completed | failed | timed_out`.
- **Atomic idempotency** — same Skill + key + canonical input resolves to the same Run.
- **Typed failures** — stable error codes plus retryability instead of parsing message strings.
- **Bounded execution** — input/output byte limits, concurrency limits, and timeout policy.
- **Real runner separation** — LLM execution belongs to the LLM runner; Python execution belongs to the Python runner.
- **Reproducible CI** — committed lockfile, `npm ci`, tests, evals, build, and production audit.

---

## 中文

### 10 秒理解这个项目

Lavine Skill Runtime 是一个刻意保持轻量的执行层：把**审核过的 Agent Skill** 变成可以通过网页或 API 直接运行的小产品，同时不把具体业务逻辑塞进 Runtime Core。

你可以把它理解成：

```text
Skill 定义  →  标准契约  →  Runner 执行  →  结构化结果
```

Runtime 负责的是**怎么稳定执行**；Skill 负责的是**到底要做什么**。

### 现在真的能跑什么

| Skill | 能力 | Runtime | 执行方式 |
| --- | --- | --- | --- |
| `career-alpha-proof` | 检查职业经历中的 claim 与证据强度 | LLM | OpenAI-compatible Provider 或 deterministic demo |
| `career-alpha-position` | 基于证据生成职业定位 | LLM | OpenAI-compatible Provider 或 deterministic demo |
| `buffett-moat-rule-check` | 对输入指标执行 Buffett 风格硬规则检查 | Python | 仓库内审核过的 Python subprocess |

Buffett 这一条是**故意做窄**的：它只处理你传入的财务指标，不会在 Runtime 里重复建设原仓库的 PandaData 数据抓取、点时重建、Parquet 或回测系统。

### Runtime 真正保证什么

- **输入输出有契约**：每个 Skill 都经过 JSON Schema 2020-12 校验。
- **来源可追溯**：Repo、路径、ref、完整 commit SHA 会进入每一次 Run。
- **状态统一**：`queued → running → completed | failed | timed_out`。
- **幂等执行**：相同 Skill + 相同 key + 相同输入，不会重复制造昂贵任务。
- **错误可编程处理**：有稳定错误码和 `retryable`，不用解析自然语言报错。
- **执行有边界**：限制输入输出大小、并发数和 timeout。
- **Runner 真分层**：LLM 和 Python 是两条真实执行路径，不是假接口。
- **CI 可复现**：lockfile + `npm ci` + tests + evals + build + production audit。

---

## Architecture · 架构

```text
                  Reviewed SKILL.md
                         │
                         ▼
                 ┌─────────────────┐
                 │ Manifest Schema │
                 ├─────────────────┤
                 │ input.schema    │
                 │ output.schema   │
                 │ adapter         │
                 └────────┬────────┘
                          │
                          ▼
                   Skill Registry
                          │
                          ▼
                    Runtime Core
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
        LLM Runner                Python Runner
             │                         │
             ▼                         ▼
 OpenAI-compatible Provider       fixed runner.py
             │                         │
             └────────────┬────────────┘
                          ▼
                 schema validation
                          │
                          ▼
                       RunStore
                          │
                   ┌──────┴──────┐
                   ▼             ▼
                  Web           API
```

| Layer | Owns / 负责 |
| --- | --- |
| **Skill** | Domain behavior / 业务语义 |
| **Runtime Core** | Validation, lifecycle, idempotency, provenance / 校验、状态、幂等、来源 |
| **Runner** | Execution environment / 执行环境 |
| **Provider** | Vendor API / 模型厂商接口 |
| **RunStore** | Run persistence semantics / Run 存储语义 |

> **Core invariant / 核心原则:** business domains belong in Skills; execution environments belong in runners; vendors belong in providers; persistence belongs in stores.  
> **业务放 Skill，执行环境放 Runner，厂商放 Provider，持久化放 Store。**

---

## Quick Start · 快速启动

**Requirements / 环境要求**

- Node.js 22
- npm 10
- Python 3 — required only for Python Skills / 仅 Python Skill 需要

```bash
npm ci
cp .env.example .env.local
npm run skill:validate
npm test
npm run evals
npm run dev
```

Open / 打开：`http://localhost:3000`

### Optional LLM provider · 可选模型配置

```env
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=gpt-5-mini
LLM_PROVIDER=openai-compatible

# Optional Python executable override
# 可选：指定 Python 可执行文件
PYTHON_BIN=python3
```

Without an LLM key, reviewed LLM Skills still run through deterministic demo adapters and the **same Runtime pipeline**.  
没有 LLM Key 时，LLM Skill 仍然会通过 deterministic demo 跑完整条 Runtime 链路。

Python Skills always execute their reviewed local Python entrypoint.  
Python Skill 则始终执行仓库内审核过的本地 Python entrypoint。

---

## API v1

```text
GET  /api/v1/health
GET  /api/v1/skills
GET  /api/v1/skills/:id
POST /api/v1/skills/:id/run
GET  /api/v1/runs
GET  /api/v1/runs/:runId
```

<details>
<summary><b>Example: idempotent LLM Run / 示例：幂等 LLM Run</b></summary>

<br />

```bash
curl -X POST http://localhost:3000/api/v1/skills/career-alpha-proof/run \
  -H "content-type: application/json" \
  -H "idempotency-key: proof-demo-001" \
  -d '{
    "target_role":"AI Product Manager",
    "resume":"Built an AI agent product and coordinated delivery.",
    "evidence":"GitHub repo, demo deployment, benchmark notes"
  }'
```

</details>

<details>
<summary><b>Example: Python Buffett rule check / 示例：Python Buffett 规则检查</b></summary>

<br />

```bash
curl -X POST http://localhost:3000/api/v1/skills/buffett-moat-rule-check/run \
  -H "content-type: application/json" \
  -d '{
    "symbol":"600519.SH",
    "roe_latest_pct":30,
    "roe_10y_min_pct":18,
    "gross_margin_latest_pct":90,
    "gross_margin_volatility_pp":3,
    "net_profit_positive":true,
    "capex_to_net_profit_pct":12,
    "debt_to_net_profit_ratio":0.5,
    "pe_ttm":20
  }'
```

</details>

---

## Skill Tooling · Skill 工具链

```bash
npm run skill:list
npm run skill:validate
```

Scaffold a reviewed LLM Skill / 初始化一个审核过的 LLM Skill：

```bash
npm run skill:init -- \
  my-skill \
  owner/repository \
  skills/my-skill/SKILL.md \
  0123456789abcdef0123456789abcdef01234567 \
  llm
```

Use `python` as the final argument for a Python Skill. Generated Skills still require human review and explicit registration in `skills/registry.ts`.  
如果是 Python Skill，把最后一个参数改成 `python`。脚手架生成后仍然需要人工审核，并显式注册到 `skills/registry.ts`。

---

## Security Boundary · 安全边界

> The Python runner is **not an arbitrary-code sandbox**.  
> Python Runner **不是任意代码沙箱**。

It only executes an entrypoint declared by a reviewed Skill manifest under:

```text
skills/<skill-id>/
```

Current guarantees / 当前保证：

- no user-provided executable path / 不接受用户指定执行路径；
- no user-provided source code / 不执行用户上传源码；
- `shell: false` / 不经过 shell；
- repo-local fixed entrypoint / 入口必须位于当前 Skill 目录；
- environment allowlist / 子进程环境变量使用白名单；
- JSON stdin/stdout / 输入输出协议固定为 JSON；
- timeout aborts the subprocess / timeout 会终止子进程；
- output size is bounded / stdout 有大小限制。

For the full trust model, see [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md).

---

## CI Contract · CI 验收

Every push must pass / 每次 push 必须通过：

```text
npm ci
      ↓
skill contract validation
      ↓
TypeScript typecheck
      ↓
Runtime tests (LLM + Python)
      ↓
behavior evals
      ↓
Next.js production build
      ↓
production dependency audit
```

A green README badge means the current repository boundary has passed this complete chain.  
顶部 CI Badge 为绿色，代表当前仓库边界已经完整通过这条链路。

---

## Deliberate Non-goals · 刻意不做

This repository is **not trying to become a giant AI platform**.  
这个仓库**不打算为了“完整”而变成一个巨型 AI 平台**。

| Not included / 当前不包含 | Why / 原因 |
| --- | --- |
| Arbitrary third-party Skill uploads / 任意第三方 Skill 上传 | would require a real sandbox / 需要真正的沙箱体系 |
| Marketplace, billing, accounts / 市场、计费、账户 | unrelated to proving the Runtime thesis / 与当前 Runtime 核心命题无关 |
| Distributed queue/workers / 分布式队列 | no concrete workload requires it yet / 当前没有真实负载需求 |
| Image/browser runners / 图像、浏览器 Runner | not part of the current runnable boundary / 当前边界不需要 |
| Artifact/object storage / 文件对象存储 | JSON output is enough for current Skills / 当前 Skill 用 JSON 足够 |
| Full Buffett data pipeline / 完整 Buffett 数据工程 | belongs in the source quant repository / 应该留在原量化仓库 |

These are **non-goals, not unfinished checkboxes**.  
这些是当前阶段的 **non-goals，而不是“还没来得及做的 TODO”**。

---

## Docs · 文档

| Document | Purpose / 用途 |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture invariants / 架构边界 |
| [`docs/ADDING_A_SKILL.md`](docs/ADDING_A_SKILL.md) | Add a reviewed Skill / 接入新 Skill |
| [`docs/API.md`](docs/API.md) | HTTP API contract / API 契约 |
| [`docs/RUNTIME_CONTRACT.md`](docs/RUNTIME_CONTRACT.md) | Runtime semantics / 运行语义 |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Trust & security boundary / 信任与安全边界 |
| [`SECURITY.md`](SECURITY.md) | Security policy / 安全政策 |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution workflow / 贡献流程 |

---

<div align="center">

### Done means / 什么叫“做完”

A reviewed LLM Skill **and** a reviewed Python Skill both execute through the same  
`manifest → schema → registry → runtime → validated Run` contract — from Web and API — with CI green.

一个审核过的 LLM Skill 和一个审核过的 Python Skill，能够通过同一套  
`manifest → schema → registry → runtime → validated Run` 契约，从网页和 API 真实运行，并且 CI 全绿。

<br />

**Small runtime. Real execution. Clear boundaries.**  
**小 Runtime，真执行，边界清楚。**

</div>
