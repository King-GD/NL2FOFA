/**
 * FOFA Service - FOFA服务
 * 封装所有与FOFA API相关的逻辑，包括验证器和执行器
 */

import axios from 'axios';
import { FofaConfig, FofaResult, FofaApiResponse, FofaQueryParams } from './types';

export class FofaService {
  private config: FofaConfig;
  private readonly FOFA_API_BASE = 'https://fofa.info';

  constructor(config: FofaConfig) {
    this.config = config;
  }

  /**
   * 验证FOFA查询语法是否合法
   * @param query FOFA查询字符串
   * @returns boolean 是否合法
   */
  private validateQuery(query: string): boolean {
    if (!query || query.trim().length === 0) {
      return false;
    }

    // 基本的语法检查
    // 检查是否包含基本的FOFA语法元素
    const hasValidSyntax = /[=:]/.test(query) || /\w+/.test(query);
    
    // 检查引号是否配对
    const quotes = query.match(/"/g);
    const quotesBalanced = !quotes || quotes.length % 2 === 0;

    // 检查括号是否配对
    const openParens = (query.match(/\(/g) || []).length;
    const closeParens = (query.match(/\)/g) || []).length;
    const parensBalanced = openParens === closeParens;

    return hasValidSyntax && quotesBalanced && parensBalanced;
  }

  /**
   * 执行FOFA查询
   * @param query FOFA查询字符串
   * @param size 返回结果数量，默认100
   * @param page 页码，默认1
   * @returns Promise<FofaResult[]> 查询结果数组
   */
  async executeFofaQuery(query: string, size: number = 100, page: number = 1): Promise<FofaResult[]> {
    // 验证查询语法
    if (!this.validateQuery(query)) {
      throw new Error(`无效的FOFA查询语法: ${query}`);
    }

    try {
      // 将查询字符串转换为Base64编码
      const qbase64 = Buffer.from(query, 'utf-8').toString('base64');

      // 构建查询参数
      const params: FofaQueryParams = {
        email: this.config.email,
        key: this.config.apiKey,
        qbase64: qbase64,
        fields: 'ip,port,title,host', // 只请求这几个字段以提高效率
        size: size,
        page: page
      };

      // 调用FOFA API
      const response = await axios.get<FofaApiResponse>(`${this.FOFA_API_BASE}/api/v1/search/all`, {
        params: params,
        timeout: 30000 // 30秒超时
      });

      // 检查API响应是否有错误
      if (response.data.error) {
        throw new Error('FOFA API返回错误，请检查查询语法或API配置');
      }

      // 转换结果格式
      return this.transformResults(response.data.results);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('FOFA API认证失败，请检查email和API key配置');
        } else if (error.response?.status === 403) {
          throw new Error('FOFA API访问被拒绝，可能是查询配额不足');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('FOFA API请求超时，请稍后重试');
        }
      }
      
      throw new Error(`FOFA查询执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 将FOFA API返回的原始数据转换为结构化对象
   * @param rawResults FOFA API返回的原始结果数组
   * @returns FofaResult[] 结构化的结果数组
   */
  private transformResults(rawResults: string[][]): FofaResult[] {
    if (!rawResults || rawResults.length === 0) {
      return [];
    }

    return rawResults.map(result => ({
      ip: result[0] || '',
      port: result[1] || '',
      title: result[2] || '',
      host: result[3] || ''
    }));
  }
}
