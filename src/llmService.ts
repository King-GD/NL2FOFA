/**
 * LLM Service - 大模型服务
 * 唯一职责：与LLM API通信，将自然语言转换为FOFA查询语法
 */

import axios from "axios";
import { LLMResponse, LLMConfig } from "./types.js";

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * 将用户的自然语言转换为FOFA查询语法
   * @param userInput 用户的自然语言输入
   * @returns Promise<LLMResponse> 包含fofa_query和explanation的对象
   */
  async convertTextToFofaQuery(userInput: string): Promise<LLMResponse> {
    const prompt = this.buildPrompt(userInput);

    try {
      // 检测API类型并构建相应的请求
      const { requestData, headers } = this.buildRequest(prompt);

      const response = await axios.post(this.config.apiUrl, requestData, {
        headers: headers,
        timeout: 300000, // 5分钟超时
      });

      const content = this.extractContent(response.data);

      // 尝试解析JSON响应
      try {
        // 清理响应内容，移除可能的markdown代码块标记
        let cleanContent = content.trim();

        // 移除markdown代码块标记
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "");
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        // 尝试解析清理后的JSON
        const parsedResponse = JSON.parse(cleanContent);
        return {
          fofa_query: parsedResponse.fofa_query,
          explanation: parsedResponse.explanation,
        };
      } catch (parseError) {
        console.error("Failed to parse LLM response as JSON:", content);

        // 如果JSON解析失败，尝试从文本中提取信息
        const fallbackResult = this.extractFromText(content);
        if (fallbackResult.fofa_query) {
          return fallbackResult;
        }

        return {
          fofa_query: null,
          explanation: "无法解析LLM响应",
        };
      }
    } catch (error) {
      console.error("LLM API调用失败:", error);
      throw new Error(
        `LLM服务调用失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 构建发送给LLM的Prompt
   * @param userInput 用户输入
   * @returns 完整的prompt字符串
   */
  private buildPrompt(userInput: string): string {
    return `你是一位世界级的网络安全情报专家，尤其擅长将自然语言精确地翻译为FOFA（网络空间测绘）的查询语法。你的任务是作为一个高精度的语法生成引擎来运作。

## 首要目标
将用户的请求转换为一个结构化的JSON对象，该对象包含一个有效的FOFA查询语句和一段简短的中文解释。

---

## 1. 上下文：FOFA语法参考
这是你唯一允许使用的语法。请严格遵守。

### 逻辑操作符
- **与**: \`&&\`
- **或**: \`||\`
- **分组**: \`()\` 用于控制查询优先级

### 匹配操作符
- **等于**: \`field="value"\` (例如: \`country="CN"\`)
- **完全匹配**: \`field=="value"\` (例如: \`ports=="80,443"\` 只开放这些端口)
- **不等于**: \`field!="value"\` (例如: \`protocol!="http"\`)
- **模糊匹配**: \`field*="val*"\` 或 \`field*="val?"\` (例如: \`host*="*.baidu.com"\`, \`banner*="mysql5.?.*"\`)
  - \`*\` 表示零个或多个字符
  - \`?\` 表示单个字符
- **不包含模糊匹配**: \`field!*="val*"\` (例如: \`title!*="test*"\`)

### 基础字段
- **IP地址**: \`ip="1.1.1.1"\` 或 \`ip="192.168.0.0/24"\` (支持CIDR)
- **端口**: \`port="443"\`
- **域名**: \`domain="qq.com"\` (根域名)
- **主机**: \`host="admin.example.com"\` (完整主机名)
- **标题**: \`title="后台管理"\`
- **正文**: \`body="网络空间测绘"\`
- **HTTP头**: \`header="nginx"\`
- **协议**: \`protocol="https"\`
- **服务器**: \`server="nginx/1.18.0"\`
- **操作系统**: \`os="Windows"\`

### 地理位置字段
- **国家**: \`country="CN"\` 或 \`country="中国"\`
- **省份/地区**: \`region="Beijing"\` 或 \`region="北京"\`
- **城市**: \`city="Hangzhou"\`

### 证书字段
- **证书内容**: \`cert="baidu"\`
- **证书持有者**: \`cert.subject="Oracle Corporation"\`
- **证书颁发者**: \`cert.issuer="DigiCert"\`
- **证书有效性**: \`cert.is_valid=true\` 或 \`cert.is_valid=false\`
- **证书匹配性**: \`cert.is_match=true\`
- **证书过期状态**: \`cert.is_expired=false\`

### 应用和产品识别
- **应用指纹**: \`app="Apache-Tomcat"\`, \`app="Jenkins"\`, \`app="nginx"\`
- **产品名**: \`product="NGINX"\`
- **产品分类**: \`category="服务"\`
- **站点指纹**: \`fid="sSXXGNUO2FefBTcCLIT/2Q=="\`

### 时间字段
- **时间范围**: \`after="2023-01-01"\` 和 \`before="2023-12-31"\`

### 布尔字段
- **是否有域名**: \`is_domain=true\` 或 \`is_domain=false\`
- **IPv6资产**: \`is_ipv6=true\` 或 \`is_ipv6=false\`
- **云服务**: \`is_cloud=true\` 或 \`is_cloud=false\`
- **蜜罐**: \`is_honeypot=false\` (默认已过滤)

### 常见应用映射
- Tomcat: \`app="Apache-Tomcat"\`
- Jenkins: \`app="Jenkins"\`
- MySQL: \`app="MySQL"\` 或通过banner识别
- Spring Boot: \`app="Apache-Spring-Boot"\`
- Nginx: \`app="nginx"\`

---

## 2. 任务：转换用户请求
分析用户的请求，并生成一个包含以下两个键的JSON对象：
1. \`fofa_query\`: 生成的FOFA查询字符串。必须100%符合上述语法。
2. \`explanation\`: 简明扼要的中文解释，说明查询目的。

---

## 3. 约束与规则 (严格遵守)
- **逐步分析**: 识别实体 → 映射到FOFA字段 → 确定逻辑关系 → 构建查询
- **精确映射**: 
  - 地理位置使用正确字段：country(国家)、region(省份)、city(城市)
  - 应用名称使用FOFA标准名称
  - 模糊匹配的通配符放在引号内
- **默认逻辑**: 多条件间无明确关系时使用 \`&&\`
- **错误处理**: 请求过于模糊时，\`fofa_query\` 设为 \`null\`
- **输出格式**: 返回纯JSON对象，无Markdown包装

---

## 4. 示例
**用户请求**: "查找中国北京或上海地区的Apache Tomcat服务器，端口在8000到9000之间，要求SSL证书有效"
**输出**:
{
  "fofa_query": "country=\"CN\" && (region=\"Beijing\" || region=\"Shanghai\") && app=\"Apache-Tomcat\" && (port>=8000 && port<=9000) && cert.is_valid=true",
  "explanation": "查询位于中国北京或上海地区、运行Apache Tomcat、开放8000至9000端口且SSL证书有效的资产。"
}

**用户请求**: "Find nginx servers in the US with valid SSL certificates, excluding any with 'test' in the title"
**输出**:
{
  "fofa_query": "app=\"nginx\" && country=\"US\" && cert.is_valid=true && title!*=\"*test*\"",
  "explanation": "查询位于美国、运行nginx、拥有有效SSL证书且标题不包含'test'的资产。"
}

---`
}

  /**
   * 根据API类型构建请求数据和头部
   * @param prompt 提示词
   * @returns 请求数据和头部信息
   */
  private buildRequest(prompt: string): { requestData: any; headers: any } {
    const url = this.config.apiUrl.toLowerCase();

    // 硅基流动 API
    if (url.includes("siliconflow.cn")) {
      return {
        requestData: {
          model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        },
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
      };
    }

    // 默认使用OpenAI格式（兼容其他服务）
    return {
      requestData: {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      },
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
    };
  }

  /**
   * 从不同API响应中提取内容
   * @param responseData API响应数据
   * @returns 提取的文本内容
   */
  private extractContent(responseData: any): string {
    // Google Gemini API响应格式
    if (responseData.candidates && responseData.candidates[0]) {
      return responseData.candidates[0].content.parts[0].text.trim();
    }

    // OpenAI API响应格式
    if (responseData.choices && responseData.choices[0]) {
      return responseData.choices[0].message.content.trim();
    }

    throw new Error("无法解析API响应格式");
  }

  /**
   * 从文本中提取FOFA查询信息（备用解析方案）
   * @param text LLM返回的文本
   * @returns LLMResponse
   */
  private extractFromText(text: string): LLMResponse {
    try {
      // 尝试提取fofa_query
      const queryMatch = text.match(/"fofa_query"\s*:\s*"([^"]+)"/);
      const explanationMatch = text.match(/"explanation"\s*:\s*"([^"]+)"/);

      if (queryMatch && explanationMatch) {
        return {
          fofa_query: queryMatch[1],
          explanation: explanationMatch[1],
        };
      }

      // 如果没有找到标准格式，尝试其他模式
      const lines = text.split("\n");
      let fofaQuery = null;
      let explanation = "";

      for (const line of lines) {
        if (line.includes("fofa_query") && line.includes(":")) {
          const match = line.match(/:\s*"([^"]+)"/);
          if (match) {
            fofaQuery = match[1];
          }
        }
        if (line.includes("explanation") && line.includes(":")) {
          const match = line.match(/:\s*"([^"]+)"/);
          if (match) {
            explanation = match[1];
          }
        }
      }

      return {
        fofa_query: fofaQuery,
        explanation: explanation || "从文本中提取的查询",
      };
    } catch (error) {
      return {
        fofa_query: null,
        explanation: "文本解析失败",
      };
    }
  }
}
