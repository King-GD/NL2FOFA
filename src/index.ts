#!/usr/bin/env node

/**
 * NL2FOFA - 自然语言转FOFA查询工具
 * 程序入口文件
 */

import * as dotenv from 'dotenv';
import { Orchestrator } from './orchestrator';
import { LLMConfig, FofaConfig } from './types';

// 加载环境变量
dotenv.config();

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
🔍 NL2FOFA - 自然语言转FOFA查询工具

用法:
  npm run dev "查询内容"              # 使用自然语言查询
  npm run dev --direct "FOFA语法"     # 直接使用FOFA语法查询
  npm run dev --help                 # 显示帮助信息

示例:
  npm run dev "帮我找美国的nginx服务器"
  npm run dev "查找中国的Spring Boot应用"
  npm run dev --direct 'app="nginx" && country="US"'

环境变量配置:
  LLM_API_KEY      - LLM API密钥
  LLM_API_URL      - LLM API地址 (默认: OpenAI)
  FOFA_EMAIL       - FOFA账户邮箱
  FOFA_API_KEY     - FOFA API密钥

配置文件:
  请复制 .env.example 为 .env 并填入您的API密钥
`);
}

/**
 * 验证环境变量配置
 */
function validateEnvironment(): { llmConfig: LLMConfig; fofaConfig: FofaConfig } | null {
  const requiredEnvVars = {
    LLM_API_KEY: process.env.LLM_API_KEY,
    FOFA_EMAIL: process.env.FOFA_EMAIL,
    FOFA_API_KEY: process.env.FOFA_API_KEY
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ 缺少必要的环境变量配置:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 请检查 .env 文件配置，参考 .env.example');
    return null;
  }

  return {
    llmConfig: {
      apiKey: requiredEnvVars.LLM_API_KEY!,
      apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
    },
    fofaConfig: {
      email: requiredEnvVars.FOFA_EMAIL!,
      apiKey: requiredEnvVars.FOFA_API_KEY!
    }
  };
}

/**
 * 解析命令行参数
 */
function parseArguments(): { mode: 'help' | 'direct' | 'natural'; query: string } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { mode: 'help', query: '' };
  }

  if (args.includes('--direct')) {
    const directIndex = args.indexOf('--direct');
    const query = args[directIndex + 1];
    if (!query) {
      console.error('❌ --direct 参数需要提供FOFA查询语句');
      process.exit(1);
    }
    return { mode: 'direct', query };
  }

  // 自然语言模式
  const query = args.join(' ');
  if (!query.trim()) {
    console.error('❌ 请提供查询内容');
    process.exit(1);
  }

  return { mode: 'natural', query };
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 解析命令行参数
    const { mode, query } = parseArguments();

    if (mode === 'help') {
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
    console.log('🚀 NL2FOFA 工具启动');
    console.log(`📝 查询模式: ${mode === 'direct' ? '直接FOFA查询' : '自然语言查询'}`);
    console.log(`🔍 查询内容: ${query}`);
    console.log('='.repeat(80));

    // 执行查询
    let result;
    if (mode === 'direct') {
      result = await orchestrator.executeDirectQuery(query);
    } else {
      result = await orchestrator.processUserQuery(query);
    }

    // 根据结果设置退出码
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('💥 程序执行出现未预期的错误:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error);
  process.exit(1);
});

// 启动程序
if (require.main === module) {
  main();
}
