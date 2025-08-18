/**
 * 共享的TypeScript类型定义
 */

// LLM服务相关类型
export interface LLMResponse {
  fofa_query: string | null;
  explanation: string;
}

export interface LLMConfig {
  apiKey: string;
  apiUrl: string;
}

// FOFA服务相关类型
export interface FofaConfig {
  email: string;
  apiKey: string;
}

export interface FofaQueryParams {
  email: string;
  key: string;
  qbase64: string;
  fields: string;
  size?: number;
  page?: number;
}

export interface FofaResult {
  ip: string;
  port: string;
  title: string;
  host: string;
}

export interface FofaApiResponse {
  error: boolean;
  consumed_fpoint: number;
  required_fpoints: number;
  size: number;
  page: number;
  mode: string;
  query: string;
  results: string[][];
}

// 编排器相关类型
export interface ProcessResult {
  success: boolean;
  data?: FofaResult[];
  error?: string;
  query?: string;
  explanation?: string;
}
