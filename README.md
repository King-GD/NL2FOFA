# NL2FOFA - 自然语言转FOFA查询工具

一个基于AI的命令行工具，能够将自然语言转换为精确的FOFA查询语法，并自动执行查询返回格式化结果。

## 🌟 特性

- **自然语言处理**: 使用大语言模型将用户的自然语言描述转换为FOFA查询语法
- **智能映射**: 自动将概念映射到FOFA语法（如Spring Boot → app="Apache-Spring-Boot"）
- **地理位置识别**: 自动将地理位置转换为国家代码（如中国 → country="CN"）
- **结果美化**: 将查询结果格式化为易读的表格，包含统计信息
- **模块化架构**: 采用MCP（模型上下文协议）架构，代码结构清晰
- **错误处理**: 完善的错误处理和用户友好的错误提示

## 🏗️ 架构设计

项目采用模块化的MCP架构：

```
src/
├── index.ts          # 程序入口，处理命令行参数
├── orchestrator.ts   # 编排器，管理整个工作流程
├── llmService.ts     # LLM服务，处理自然语言转换
├── fofaService.ts    # FOFA服务，包含验证器和执行器
├── resultPresenter.ts # 结果处理器，美化输出
└── types.ts          # TypeScript类型定义
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的API密钥：
```env
# LLM API Configuration
LLM_API_KEY=sk-your_siliconflow_api_key_here
LLM_API_URL=https://api.siliconflow.cn/v1/chat/completions

# FOFA API Configuration
FOFA_EMAIL=your_fofa_email@example.com
FOFA_API_KEY=your_fofa_api_key_here
```

**📖 配置说明**:
- 目前使用硅基流动作为LLM服务提供商
- 详细配置说明请参考 [配置指南](./CONFIGURATION.md)

### 3. 构建项目

```bash
npm run build
```

### 4. 运行工具

#### 自然语言查询模式
```bash
npm run dev "帮我找美国的nginx服务器"
npm run dev "查找中国的Spring Boot应用"
npm run dev "搜索开放了22端口的SSH服务"
```

#### 直接FOFA查询模式
```bash
npm run dev --direct 'app="nginx" && country="US"'
npm run dev --direct 'app="Apache-Spring-Boot" && country="CN"'
```

#### 查看帮助
```bash
npm run dev --help
```

## 📖 使用示例

### 自然语言查询示例

**输入：**
```bash
npm run dev "帮我找美国的nginx服务器"
```

**输出：**
```
🚀 NL2FOFA 工具启动
📝 查询模式: 自然语言查询
🔍 查询内容: 帮我找美国的nginx服务器
================================================================================
🤖 正在分析您的查询请求...
✅ 查询语句生成成功: app="nginx" && country="US"
📝 查询说明: 查找位于美国的nginx服务器
🔍 正在执行FOFA查询...
✅ 查询执行完成，找到 50 条结果

================================================================================
🔍 NL2FOFA 查询结果
================================================================================
📝 FOFA查询语句: app="nginx" && country="US"
💡 查询说明: 查找位于美国的nginx服务器
📊 结果数量: 50 条
================================================================================

┌─────────┬──────────────────┬────────┬──────────────────────────────────────────┬────────────────────────────────┐
│ (index) │      IP地址      │  端口  │                   标题                   │              主机              │
├─────────┼──────────────────┼────────┼──────────────────────────────────────────┼────────────────────────────────┤
│    1    │   '192.168.1.1'  │  '80'  │           'Welcome to nginx!'            │        'example.com'           │
│   ...   │       ...        │  ...   │                   ...                    │              ...               │
└─────────┴──────────────────┴────────┴──────────────────────────────────────────┴────────────────────────────────┘

📈 统计信息:
🔌 常见端口:
   80: 35 个
   443: 12 个
   8080: 3 个

🌐 IP段分布:
   192.168.x.x: 15 个
   10.0.x.x: 8 个
   172.16.x.x: 5 个
```

## 🔧 API配置

### LLM API配置

默认使用OpenAI API，您也可以配置其他兼容的API：

```env
LLM_API_KEY=your_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
```

### FOFA API配置

需要有效的FOFA账户和API密钥：

```env
FOFA_EMAIL=your_email@example.com
FOFA_API_KEY=your_fofa_api_key
```

## 🛠️ 开发

### 项目结构

```
NL2FOFA/
├── src/                    # 源代码目录
│   ├── index.ts           # 程序入口
│   ├── orchestrator.ts    # 编排器
│   ├── llmService.ts      # LLM服务
│   ├── fofaService.ts     # FOFA服务
│   ├── resultPresenter.ts # 结果处理器
│   └── types.ts           # 类型定义
├── dist/                  # 编译输出目录
├── .env.example           # 环境变量模板
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript配置
└── README.md              # 项目文档
```

### 可用脚本

```bash
npm run build    # 编译TypeScript代码
npm run start    # 运行编译后的代码
npm run dev      # 开发模式运行
npm run clean    # 清理编译输出
```

### 添加新功能

1. **扩展LLM提示词**: 修改 `src/llmService.ts` 中的 `buildPrompt` 方法
2. **添加新的FOFA字段**: 修改 `src/fofaService.ts` 中的字段配置
3. **自定义结果展示**: 修改 `src/resultPresenter.ts` 中的展示逻辑

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License

## ⚠️ 注意事项

1. 请确保您有有效的FOFA API访问权限
2. 注意API调用频率限制
3. 保护好您的API密钥，不要提交到版本控制系统
4. 本工具仅用于合法的安全研究目的
