#!/usr/bin/env node

/**
 * NL2FOFA CLI工具
 * 程序入口文件
 */

import * as dotenv from "dotenv";
import { parseArgs } from "util";
import { Orchestrator } from "./orchestrator.js";
import { LLMConfig, FofaConfig } from "./types.js";

// 加载环境变量
dotenv.config();

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
🔍 NL2FOFA - 自然语言转FOFA查询工具

用法:
  nl2fofa [查询内容]                       # 自然语言查询
  nl2fofa --direct [FOFA查询语句]          # 直接FOFA查询
  nl2fofa [选项] [查询内容]

选项:
  -h, --help                          显示帮助信息
  -d, --direct                        直接FOFA查询模式

示例:
  # 自然语言查询
  nl2fofa "查找所有Apache服务器"
  nl2fofa "查找运行在80端口的nginx服务器"

  # 直接FOFA查询
  nl2fofa --direct "server:Apache"
  nl2fofa --direct "port:80 && server:nginx"
  nl2fofa -d "title:登录"

环境变量:
  LLM_API_KEY                         大语言模型API密钥
  LLM_API_URL                         大语言模型API地址
  FOFA_EMAIL                          FOFA账户邮箱
  FOFA_API_KEY                        FOFA API密钥

更多信息请查看 README.md
`);
}

/**
 * 验证环境变量配置
 */
function validateEnvironment(): {
  llmConfig: LLMConfig;
  fofaConfig: FofaConfig;
} | null {
  const requiredEnvVars = {
    LLM_API_KEY: process.env.LLM_API_KEY,
    FOFA_EMAIL: process.env.FOFA_EMAIL,
    FOFA_API_KEY: process.env.FOFA_API_KEY,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error(" 缺少必要的环境变量配置:");
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error("\n 请检查 .env 文件配置，参考 .env.example");
    return null;
  }

  return {
    llmConfig: {
      apiKey: requiredEnvVars.LLM_API_KEY!,
      apiUrl:
        process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions",
    },
    fofaConfig: {
      email: requiredEnvVars.FOFA_EMAIL!,
      apiKey: requiredEnvVars.FOFA_API_KEY!,
    },
  };
}

/**
 * 解析命令行参数
 */
function parseArguments(): {
  mode: "help" | "direct" | "natural";
  query: string;
} {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
      direct: {
        type: "boolean",
        short: "d",
        default: false,
      },
    },
    allowPositionals: true,
  });

  // 显示帮助信息
  if (values.help || (positionals.length === 0 && !values.direct)) {
    return { mode: "help", query: "" };
  }

  // 直接FOFA查询模式
  if (values.direct) {
    const query = positionals.join(" ");
    if (!query.trim()) {
      console.error(" --direct 参数需要提供FOFA查询语句");
      process.exit(1);
    }
    return { mode: "direct", query };
  }

  // 自然语言模式
  const query = positionals.join(" ");
  if (!query.trim()) {
    console.error(" 请提供查询内容");
    process.exit(1);
  }

  return { mode: "natural", query };
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 解析命令行参数
    const { mode, query } = parseArguments();

    if (mode === "help") {
      showHelp();
      return;
    }

    // 验证环境变量
    const config = validateEnvironment();
    if (!config) {
      process.exit(1);
    }

    // 创建编排器实例
    const orchestrator = new Orchestrator(config.llmConfig, config.fofaConfig);

    // 显示启动信息
    console.log(" NL2FOFA 工具启动");
    console.log(
      ` 查询模式: ${mode === "direct" ? "直接FOFA查询" : "自然语言查询"}`
    );
    console.log(` 查询内容: ${query}`);
    console.log("=".repeat(80));

    // 执行查询
    let result;
    if (mode === "direct") {
      result = await orchestrator.executeDirectQuery(query);
    } else {
      result = await orchestrator.processUserQuery(query);
    }

    // 根据结果设置退出码
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(" 程序执行出现未预期的错误:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on("unhandledRejection", (reason, promise) => {
  console.error(" 未处理的Promise拒绝:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error(" 未捕获的异常:", error);
  process.exit(1);
});

// 启动程序
main();
