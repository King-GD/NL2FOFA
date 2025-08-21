# NL2FOFA - 自然语言转 FOFA 查询工具

一个功能强大的 AI 工具，能够将自然语言转换为精确的 FOFA 查询语法，并自动执行查询返回格式化结果。它支持作为模型上下文协议 (MCP) 服务器运行，也可以作为传统的命令行工具 (CLI) 使用。

## 🌟 核心特性

- **🤖 自然语言驱动**: 使用大语言模型（LLM）将日常语言（如"查找美国的 Nginx 服务器"）转换为精确的 FOFA 查询语法 (`country="US" && app="nginx"`)
- **⚡ 双模式运行**:
  - **MCP 服务器模式**: 可与任何支持 MCP 协议的 AI 客户端（如 Claude Desktop, Cursor）无缝集成，作为其增强工具
  - **CLI 模式**: 提供传统的命令行界面，方便在终端中快速使用和集成到自动化脚本
- **📊 结果美化与洞察**: 将 FOFA 返回的 JSON 数据格式化为易于阅读的表格，并自动生成端口和 IP 段的统计信息，帮助快速分析
- **🛡️ 健壮性设计**: 包含输入验证、完善的错误处理和用户友好的错误提示，确保稳定运行
- **🏗️ 清晰的模块化架构**: 代码结构清晰，分为 LLM 服务、FOFA 服务、编排器和展示层，易于理解和扩展
- **🔧 高度可配置**: 通过 `.env` 文件轻松配置 LLM 和 FOFA 的 API 密钥及端点

## 🏗️ 架构设计

项目采用关注点分离的模块化架构，确保各部分职责单一，易于维护。

```
src/
├── index.ts             # 命令行(CLI)程序入口
├── mcp-server.ts        # MCP服务器程序入口
├── orchestrator.ts      # 核心编排器，负责管理整个工作流程
├── llmService.ts        # LLM服务，处理自然语言到FOFA语法的转换
├── fofaService.ts       # FOFA服务，负责执行查询和API交互
├── resultPresenter.ts   # 结果处理器，美化输出为表格和统计信息
└── types.ts             # 全局TypeScript类型定义
```

### 工作流程:

1. **输入**: CLI 或 MCP 服务器 接收用户请求（自然语言或直接的 FOFA 语法）
2. **编排**: Orchestrator 接收请求
3. **转换 (可选)**: 如果是自然语言，Orchestrator 调用 LLMService 将其转换为 FOFA 语法
4. **执行**: Orchestrator 调用 FofaService 执行查询
5. **输出**: Orchestrator 使用 ResultPresenter 将结果格式化后呈现给用户

## � API 配置详解

### LLM API 配置

本项目支持多种大语言模型服务，根据你的需求选择合适的服务商：

#### 硅基流动（目前使用）

```env
LLM_API_KEY=sk-your_siliconflow_key
LLM_API_URL=https://api.siliconflow.cn/v1/chat/completions
```

- **模型**: `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B`

#### OpenAI

```env
LLM_API_KEY=sk-your_openai_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
```

- **模型**: `gpt-3.5-turbo` (默认),

### FOFA API 配置

```env
FOFA_EMAIL=your_fofa_email@example.com
FOFA_API_KEY=your_fofa_api_key
```

获取 FOFA API 密钥：

1. 注册 FOFA 账户：https://fofa.info
2. 登录后进入个人中心
3. 在 API 管理页面获取 API Key
4. 确保账户有足够的查询次数

## 🚀 快速开始

### 1. 环境准备

- 安装 Node.js (建议 v18.0 或更高版本)
- 获取有效的 FOFA API 密钥 和 LLM API 密钥

#### 支持的大语言模型

本项目支持多种大语言模型服务，通过配置不同的 API 端点即可切换：

**🔥 硅基流动（目前使用）**

- 模型：`deepseek-ai/DeepSeek-R1-Distill-Qwen-7B`
- 优势：性价比高，中文支持好，响应速度快
- 配置：
  ```env
  LLM_API_URL=https://api.siliconflow.cn/v1/chat/completions
  LLM_API_KEY=sk-your_siliconflow_key
  ```

**🤖 OpenAI**

- 模型：`gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- 优势：效果稳定，理解能力强
- 配置：
  ```env
  LLM_API_URL=https://api.openai.com/v1/chat/completions
  LLM_API_KEY=sk-your_openai_key
  ```

> **注意**: 不同模型的效果可能有差异

### 2. 安装

克隆仓库并安装依赖：

```bash
git clone https://github.com/King-GD/NL2FOFA.git
cd NL2FOFA
npm install
```

### 3. 配置环境变量

复制环境变量模板文件：

```bash
cp .env.example .env
```

然后，编辑 `.env` 文件，填入你的 API 密钥和账户信息：

```env
# LLM API 配置 (以硅基流动为例)
LLM_API_KEY=sk-your_llm_api_key_here
LLM_API_URL=https://api.siliconflow.cn/v1/chat/completions

# FOFA API 配置
FOFA_EMAIL=your_fofa_email@example.com
FOFA_API_KEY=your_fofa_api_key_here
```

### 4. 构建项目

该项目使用 TypeScript 编写，需要先编译成 JavaScript：

```bash
npm run build
```

## 🔧 使用方式

你可以通过两种模式来使用 NL2FOFA：

### 方式一：全局安装（推荐）

#### 1. 安装

```bash
# 全局安装
npm install -g .
```

#### 2. 使用

安装后可以直接使用简洁的命令：

```bash
# 自然语言查询
nl2fofa "帮我找美国的nginx服务器"
nl2fofa "查找中国的Spring Boot应用"

# 直接FOFA查询
nl2fofa --direct "server:Apache"
nl2fofa --direct "port:80 && server:nginx"
nl2fofa -d "title:登录"

# 查看帮助
nl2fofa --help
nl2fofa -h
```

### 方式二：使用 npx（无需安装）

```bash
# 直接运行，无需全局安装
npx nl2fofa "查找Apache服务器"
npx nl2fofa --direct "server:nginx"
npx nl2fofa --help
```

### 方式三：本地开发模式

这是在项目目录中直接开发和测试的方式：

```bash
# 使用npm脚本（自动编译）
npm run query "帮我找美国的nginx服务器"
npm run direct -- "server:Apache"
npm run help

# 直接使用编译后的文件
npm run build
node dist/index.js "查找Apache服务器"
node dist/index.js --direct "server:nginx"
node dist/index.js --help
```

### 方式四：MCP 服务器模式

启动一个本地服务器，使其可以被任何支持 MCP 协议的 AI 客户端调用。

#### 1. 启动服务器

```bash
# 生产模式启动
npm start

# 开发模式启动 (自动编译并启动)
npm run dev
```

服务器启动后，会在标准输入输出流上监听来自 MCP 客户端的请求。

#### 2. MCP 客户端配置 (以 Cursor 为例)

在 Cursor 的配置文件中，添加以下服务器配置：

**方式 A: 使用相对路径（推荐）**

```json
{
  "mcpServers": {
    "nl2fofa": {
      "command": "node",
      "args": ["dist/mcp-server.js"],
      "cwd": "path:/file/NL2FOFA",
      "env": {
        "LLM_API_KEY": "sk-your_llm_api_key_here",
        "LLM_API_URL": "https://api.siliconflow.cn/v1/chat/completions",
        "FOFA_EMAIL": "your_fofa_email@example.com",
        "FOFA_API_KEY": "your_fofa_api_key_here"
      }
    }
  }
}
```

**方式 B: 使用绝对路径**

```json
{
  "mcpServers": {
    "nl2fofa": {
      "command": "node",
      "args": ["path:/file/NL2FOFA/dist/mcp-server.js"],
      "env": {
        "LLM_API_KEY": "sk-your_llm_api_key_here",
        "LLM_API_URL": "https://api.siliconflow.cn/v1/chat/completions",
        "FOFA_EMAIL": "your_fofa_email@example.com",
        "FOFA_API_KEY": "your_fofa_api_key_here"
      }
    }
  }
}
```

**方式 C: 全局安装后使用（最简洁）**

```bash
# 先全局安装
npm install -g .
```

```json
{
  "mcpServers": {
    "nl2fofa": {
      "command": "nl2fofa-mcp",
      "env": {
        "LLM_API_KEY": "sk-your_llm_api_key_here",
        "LLM_API_URL": "https://api.siliconflow.cn/v1/chat/completions",
        "FOFA_EMAIL": "your_fofa_email@example.com",
        "FOFA_API_KEY": "your_fofa_api_key_here"
      }
    }
  }
}
```

> **路径说明**:
>
> - `args` 中的路径是相对于 `cwd` 工作目录的
> - 如果不设置 `cwd`，则相对于 MCP 客户端的工作目录
> - 全局安装后可直接使用命令名，无需指定路径

#### 3. 可用工具

服务器启动后，会向 MCP 客户端提供以下工具：

- `natural_language_query(query: string, size?: number)`: 将自然语言转换为 FOFA 查询并执行
- `direct_fofa_query(fofaQuery: string, size?: number)`: 直接执行 FOFA 查询语法

## 💻 开发与脚本

本项目的所有可用脚本都定义在 `package.json` 中。

- `npm run build`: 编译 TypeScript 源代码到 `dist` 目录
- `npm start`: 在生产模式下启动 MCP 服务器
- `npm run start:cli`: 在生产模式下运行 CLI 工具
- `npm run dev`: 在开发模式下启动 MCP 服务器，会先编译代码
- `npm run dev:cli`: 在开发模式下运行 CLI 工具
- `npm run query -- "..."`: 快捷方式，用于执行自然语言查询
- `npm run direct -- "..."`: 快捷方式，用于执行直接 FOFA 查询
- `npm run clean`: 删除已编译的 `dist` 目录

## ⚠️ 注意事项

- **API 密钥安全**: 保护好你的 `.env` 文件，不要将你的 API 密钥提交到版本控制系统
- **合法使用**: 本工具仅应用于授权的、合法的安全研究和资产测绘目的
- **路径配置**: 在配置 MCP 客户端时，请确保 `cwd` 工作目录指向正确的项目根目录绝对路径

## 📄 许可证

本项目基于 MIT License.
