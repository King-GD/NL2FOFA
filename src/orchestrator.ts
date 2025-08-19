/**
 * Orchestrator - 编排器
 * 项目的核心，负责接收用户输入，按顺序调用LLM Service和FOFA Service，管理整个工作流程
 */

import { LLMService } from './llmService.js';
import { FofaService } from './fofaService.js';
import { ResultPresenter } from './resultPresenter.js';
import { ProcessResult, LLMConfig, FofaConfig } from './types.js';

export class Orchestrator {
  private llmService: LLMService;
  private fofaService: FofaService;

  constructor(llmConfig: LLMConfig, fofaConfig: FofaConfig) {
    this.llmService = new LLMService(llmConfig);
    this.fofaService = new FofaService(fofaConfig);
  }

  /**
   * 处理用户的自然语言输入，完成整个查询流程
   * @param userInput 用户的自然语言输入
   * @param resultSize 返回结果数量，默认50
   * @returns Promise<ProcessResult> 处理结果
   */
  async processUserQuery(userInput: string, resultSize: number = 50): Promise<ProcessResult> {
    try {
      console.log('🤖 正在分析您的查询请求...');
      
      // 第一步：调用LLM服务将自然语言转换为FOFA查询
      const llmResponse = await this.llmService.convertTextToFofaQuery(userInput);
      
      // 检查LLM是否成功生成了查询语句
      if (!llmResponse.fofa_query) {
        return {
          success: false,
          error: `无法理解您的查询请求: "${userInput}"\n${llmResponse.explanation}`,
        };
      }

      console.log(`✅ 查询语句生成成功: ${llmResponse.fofa_query}`);
      console.log(`📝 查询说明: ${llmResponse.explanation}`);
      console.log('🔍 正在执行FOFA查询...');

      // 第二步：调用FOFA服务执行查询
      const fofaResults = await this.fofaService.executeFofaQuery(
        llmResponse.fofa_query, 
        resultSize
      );

      console.log(`✅ 查询执行完成，找到 ${fofaResults.length} 条结果`);

      // 第三步：格式化并显示结果
      ResultPresenter.presentResults(
        fofaResults, 
        llmResponse.fofa_query, 
        llmResponse.explanation
      );

      return {
        success: true,
        data: fofaResults,
        query: llmResponse.fofa_query,
        explanation: llmResponse.explanation
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 显示错误信息
      ResultPresenter.presentError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 直接执行FOFA查询（跳过LLM转换）
   * @param fofaQuery 直接的FOFA查询语句
   * @param resultSize 返回结果数量，默认50
   * @returns Promise<ProcessResult> 处理结果
   */
  async executeDirectQuery(fofaQuery: string, resultSize: number = 50): Promise<ProcessResult> {
    try {
      console.log(`🔍 正在执行FOFA查询: ${fofaQuery}`);

      // 直接调用FOFA服务执行查询
      const fofaResults = await this.fofaService.executeFofaQuery(fofaQuery, resultSize);

      console.log(`✅ 查询执行完成，找到 ${fofaResults.length} 条结果`);

      // 格式化并显示结果
      ResultPresenter.presentResults(fofaResults, fofaQuery, '直接FOFA查询');

      return {
        success: true,
        data: fofaResults,
        query: fofaQuery,
        explanation: '直接FOFA查询'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 显示错误信息
      ResultPresenter.presentError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 验证配置是否正确
   * @returns boolean 配置是否有效
   */
  validateConfiguration(): boolean {
    // 这里可以添加配置验证逻辑
    // 例如检查API密钥格式、网络连接等
    return true;
  }
}
