#!/usr/bin/env node

/**
 * NL2FOFA MCP Server
 * 符合Model Context Protocol的服务器实现
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { LLMService } from './llmService.js';
import { FofaService } from './fofaService.js';
import {
  LLMConfig,
  FofaConfig,
  NaturalLanguageQueryArgs,
  DirectFofaQueryArgs,
  QueryResult
} from './types.js';

// 加载环境变量
dotenv.config();

/**
 * MCP服务器类
 */
class NL2FOFAMCPServer {
  private server: Server;
  private llmService: LLMService | null = null;
  private fofaService: FofaService | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'nl2fofa-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * 初始化服务
   */
  private initializeServices(): boolean {
    try {
      // 验证环境变量
      const requiredEnvVars = {
        LLM_API_KEY: process.env.LLM_API_KEY,
        FOFA_EMAIL: process.env.FOFA_EMAIL,
        FOFA_API_KEY: process.env.FOFA_API_KEY
      };

      const missingVars = Object.entries(requiredEnvVars)
        .filter(([, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        console.error('❌ 缺少必要的环境变量配置:', missingVars.join(', '));
        return false;
      }

      // 初始化服务
      const llmConfig: LLMConfig = {
        apiKey: requiredEnvVars.LLM_API_KEY!,
        apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
      };

      const fofaConfig: FofaConfig = {
        email: requiredEnvVars.FOFA_EMAIL!,
        apiKey: requiredEnvVars.FOFA_API_KEY!
      };

      this.llmService = new LLMService(llmConfig);
      this.fofaService = new FofaService(fofaConfig);

      return true;
    } catch (error) {
      console.error('❌ 服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 设置工具处理器
   */
  private setupToolHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'natural_language_query',
            description: '将自然语言转换为FOFA查询并执行搜索',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '自然语言查询描述，例如："查找美国的nginx服务器"'
                },
                size: {
                  type: 'number',
                  description: '返回结果数量，默认50，最大1000',
                  default: 50,
                  minimum: 1,
                  maximum: 1000
                }
              },
              required: ['query']
            }
          },
          {
            name: 'direct_fofa_query',
            description: '直接执行FOFA查询语法搜索',
            inputSchema: {
              type: 'object',
              properties: {
                fofaQuery: {
                  type: 'string',
                  description: 'FOFA查询语法，例如：app="nginx" && country="US"'
                },
                size: {
                  type: 'number',
                  description: '返回结果数量，默认50，最大1000',
                  default: 50,
                  minimum: 1,
                  maximum: 1000
                }
              },
              required: ['fofaQuery']
            }
          }
        ] as Tool[]
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // 确保服务已初始化
        if (!this.llmService || !this.fofaService) {
          if (!this.initializeServices()) {
            throw new Error('服务初始化失败，请检查环境变量配置');
          }
        }

        switch (name) {
          case 'natural_language_query': {
            const typedArgs = args as unknown as NaturalLanguageQueryArgs;
            if (!typedArgs.query) {
              throw new Error('缺少必需参数: query');
            }
            return await this.handleNaturalLanguageQuery(typedArgs);
          }

          case 'direct_fofa_query': {
            const typedArgs = args as unknown as DirectFofaQueryArgs;
            if (!typedArgs.fofaQuery) {
              throw new Error('缺少必需参数: fofaQuery');
            }
            return await this.handleDirectFofaQuery(typedArgs);
          }

          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        return {
          content: [
            {
              type: 'text',
              text: `❌ 错误: ${errorMessage}`
            }
          ]
        };
      }
    });
  }

  /**
   * 处理自然语言查询
   */
  private async handleNaturalLanguageQuery(args: NaturalLanguageQueryArgs) {
    const { query, size = 50 } = args;

    try {
      // 第一步：将自然语言转换为FOFA查询
      const llmResponse = await this.llmService!.convertTextToFofaQuery(query);
      
      if (!llmResponse.fofa_query) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 无法理解查询请求: "${query}"\n${llmResponse.explanation}`
            }
          ]
        };
      }

      // 第二步：执行FOFA查询
      const results = await this.fofaService!.executeFofaQuery(llmResponse.fofa_query, size);

      const result: QueryResult = {
        success: true,
        results: results,
        query: llmResponse.fofa_query,
        explanation: llmResponse.explanation,
        count: results.length
      };

      return {
        content: [
          {
            type: 'text',
            text: this.formatQueryResult(result)
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        content: [
          {
            type: 'text',
            text: `❌ 查询失败: ${errorMessage}`
          }
        ]
      };
    }
  }

  /**
   * 处理直接FOFA查询
   */
  private async handleDirectFofaQuery(args: DirectFofaQueryArgs) {
    const { fofaQuery, size = 50 } = args;

    try {
      const results = await this.fofaService!.executeFofaQuery(fofaQuery, size);

      const result: QueryResult = {
        success: true,
        results: results,
        query: fofaQuery,
        explanation: '直接FOFA查询',
        count: results.length
      };

      return {
        content: [
          {
            type: 'text',
            text: this.formatQueryResult(result)
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        content: [
          {
            type: 'text',
            text: `❌ 查询失败: ${errorMessage}`
          }
        ]
      };
    }
  }

  /**
   * 格式化查询结果
   */
  private formatQueryResult(result: QueryResult): string {
    if (!result.success || !result.results) {
      return `❌ 查询失败: ${result.error || '未知错误'}`;
    }

    const { results, query, explanation, count } = result;

    let output = `🔍 FOFA查询结果\n`;
    output += `📝 查询语句: ${query}\n`;
    output += `💡 查询说明: ${explanation}\n`;
    output += `📊 结果数量: ${count} 条\n\n`;

    if (results.length === 0) {
      output += '🔍 未找到匹配的结果';
      return output;
    }

    // 显示前10条结果
    const displayResults = results.slice(0, 10);
    output += '📋 查询结果 (显示前10条):\n\n';

    displayResults.forEach((item, index) => {
      output += `${index + 1}. IP: ${item.ip}:${item.port}\n`;
      output += `   标题: ${item.title || 'N/A'}\n`;
      output += `   主机: ${item.host || 'N/A'}\n\n`;
    });

    if (results.length > 10) {
      output += `... 还有 ${results.length - 10} 条结果\n`;
    }

    return output;
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 NL2FOFA MCP Server started');
  }
}

// 启动服务器
async function main() {
  const server = new NL2FOFAMCPServer();
  await server.start();
}

// 直接启动服务器
main().catch((error) => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});
