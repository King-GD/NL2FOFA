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
    return `你是一位世界级的网络安全情报专家，尤其擅长将自然语言精确地翻译为 FOFA（网络空间测绘）的查询语法。你的任务是作为一个高精度的语法生成引擎来运作。

## 首要目标
将用户的请求转换为一个结构化的 JSON 对象，该对象包含一个有效的 FOFA 查询语句和一段简短的中文解释。

---

## 1. FOFA 语法（必须严格遵守）
这是你唯一允许使用的语法集合。

### 逻辑操作符
- 与: \`&&\`
- 或: \`||\`
- 分组: \`()\`

### 匹配操作符
- 等于: \`field="value"\`
- 完全匹配（仅当字段明确支持且语义为“仅这些值”时）: \`field=="value1,value2"\`
- 不等于: \`field!="value"\`
- 模糊匹配: \`field*="val*"\` 或 \`field*="val?"\`
- 不包含（模糊）: \`field!*="val*"\`

### 常用字段
- IP: \`ip="1.1.1.1"\` 或 \`ip="192.168.0.0/24"\`
- 端口: \`port="443"\`（**注意：FOFA 不支持 \`port>=\` 或范围比较**）
- 域名: \`domain="qq.com"\`
- 主机: \`host="admin.example.com"\`
- 标题: \`title="后台管理"\`
- 正文: \`body="关键词"\`
- 头部: \`header="nginx"\`
- 协议: \`protocol="https"\`
- 服务器: \`server="nginx/1.18.0"\`
- 操作系统: \`os="Windows"\`

### 地理位置
- 国家: \`country="US"\` 或 \`country="中国"\`
- 省/州: \`region="Beijing"\` 或 \`region="北京"\`
- 城市: \`city="Hangzhou"\`

### 证书
- \`cert="baidu"\`
- \`cert.subject="Oracle Corporation"\`
- \`cert.issuer="DigiCert"\`
- \`cert.is_valid=true|false\`
- \`cert.is_match=true\`
- \`cert.is_expired=false\`

### 应用识别（FOFA 内置 app 名称）
- \`app="Apache-Tomcat"\`
- \`app="Jenkins"\`
- \`app="MySQL"\`
- \`app="Apache-Spring-Boot"\`
- \`app="nginx"\`

### 时间
- \`after="2023-01-01"\`、\`before="2023-12-31"\`

### 布尔
- \`is_domain=true|false\`
- \`is_ipv6=true|false\`
- \`is_cloud=true|false\`
- \`is_honeypot=false\`（默认应过滤）

---

## 2. 任务：将用户请求转换为 JSON
返回只包含两个键的 JSON 对象：
1. \`fofa_query\`: 生成的 FOFA 查询字符串（必须 100% 符合上述语法）。
2. \`explanation\`: 简短中文解释，说明查询目的。

---

## 3. 绝对规则（必须遵守）
- **只使用用户明确提出的条件。不得凭空添加任何字段或取值**（例如：不要因为示例或常见习惯就加入 \`country="CN"\`、\`region="Beijing"\`、\`app="Apache-Tomcat"\`、\`port="8080"\`、\`title="管理"\` 等）。
- **如果用户未指定，就不要引入国家、地区、端口、标题、应用名等任何额外限制**。
- **不得使用 FOFA 不支持的语法**（如端口范围比较 \`port>=/<=\`）。若用户提出此类需求，\`fofa_query\` 设为 \`null\`，并在 \`explanation\` 里说明原因与可行替代（例如列举端口集合 \`ports=="8000,8001,8002"\`）。
- **多条件默认使用 \`&&\`**。确有“或”含义时使用 \`||\` 并用括号分组。
- **地理位置字段要对应正确：country/region/city。应用必须使用 FOFA 标准 \`app\` 名称**。
- **通配符放在引号内**（例如 \`title!*="*test*"\`）。
- **输出格式**：返回纯 JSON（不加 Markdown、不加多余文字）。

## 4.用户请求
${userInput}

## 5. 输出要求
你必须返回一个严格的 JSON 对象，不能包含任何多余的文字、Markdown 标记或注释。  
JSON 格式必须合法，能被 JSON.parse() 正常解析。  
如果用户的请求超出了 FOFA 支持的范围，也必须返回如下结构：
{
  "fofa_query": null,
  "explanation": "原因说明"
}

---
`;
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
          model: "deepseek-ai/DeepSeek-V3.1",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          thinking_budget: 4096,
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
