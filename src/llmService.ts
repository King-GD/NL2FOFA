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
    // 使用模板字符串构建一个结构清晰的Prompt
    return `你是一位世界级的网络安全情报专家，尤其擅长将自然语言精确地翻译为FOFA（网络空间测绘）的查询语法。你的任务是作为一个高精度的语法生成引擎来运作。

## 首要目标
将用户的请求转换为一个结构化的JSON对象，该对象包含一个有效的FOFA查询语句和一段简短的中文解释。

---

## 1. 上下文：FOFA语法参考
这是你唯一允许使用的语法。请严格遵守。

-   **逻辑操作符**: \`&&\` (与), \`||\` (或), \`()\` 用于分组。
-   **等于**: \`field="value"\` (例如: \`country="CN"\`)
-   **不等于**: \`field!="value"\` (例如: \`protocol!="http"\`)
-   **包含 (模糊匹配)**: \`field*="value"\` (例如: \`title*="后台管理"\`)
-   **不包含**: \`field!*="value"\` (例如: \`title!*="test"\`)
-   **数值范围**: \`field>=value\` 和 \`field<=value\` (例如: \`port>=8000 && port<=9000\`)
-   **布尔值**: \`field=true\` 或 \`field=false\` (例如: \`cert.is_valid=true\`)
-   **CIDR网段**: \`ip="192.168.0.0/24"\`
-   **常用字段**: \`ip\`, \`port\`, \`title\`, \`body\`, \`header\`, \`host\`, \`cert\`, \`app\`, \`country\`, \`region\`, \`protocol\`。
-   **关键映射规则**:
    -   地理位置: \`country="[两位国家代码]"\`, \`region="[城市或省份名]"\`
    -   SSL/TLS证书: \`cert.is_valid=true\`
    -   常见应用: \`app="Apache-Tomcat"\`, \`app="Jenkins"\`, \`app="nginx"\`, \`app="Apache-Spring-Boot"\`, \`app="MySQL"\`

---

## 2. 任务：转换用户请求
分析用户的请求，并生成一个包含以下两个键的JSON对象：
1.  \`fofa_query\`: 生成的FOFA查询字符串。它必须100%符合上述参考语法。
2.  \`explanation\`: 一句简明扼要的中文，用于解释这个查询的目的。

---

## 3. 约束与规则 (严格遵守)
-   **一步一步思考**: 首先，识别所有实体（如地点、端口、应用、关键词）。其次，将它们映射到正确的FOFA字段和值。第三，识别逻辑关系（与、或、非）。最后，使用正确的操作符和括号来构建查询。
-   **禁止假设**: 如果用户说“Tomcat”，你必须使用准确的应用名 \`app="Apache-Tomcat"\`。如果用户提到城市，你必须使用 \`region=\`，而不是 \`city=\`。
-   **默认使用 \`&&\`**: 如果用户在两个条件之间没有明确指定逻辑关系，默认它们是“与”(\`&&\`)的关系。
-   **处理模糊请求**: 如果用户的请求过于模糊或无法转换（例如“帮我找一些很酷的网站”），请将 \`fofa_query\` 的值设为 \`null\`。
-   **输出格式**: 你的全部响应必须是一个单一、原始的JSON对象。不要用Markdown的 \`\`\`json ... \`\`\` 符号包裹它，也不要在前后添加任何额外的文字。

---

## 4. 示例 (Examples)
-   **用户请求**: "帮我查找一下，所有在中国的北京或者上海地区的服务器，要求它们开放的端口在8000到9000之间，并且上面运行的应用是Apache-Tomcat或者Jenkins。"
-   **你的输出**:
    \`\`\`json
    {
      "fofa_query": "(country=\\"CN\\" && (region=\\"Beijing\\" || region=\\"Shanghai\\")) && (port>=8000 && port<=9000) && (app=\\"Apache-Tomcat\\" || app=\\"Jenkins\\")",
      "explanation": "查询位于中国北京或上海地区、开放8000至9000端口且运行Apache-Tomcat或Jenkins应用的资产。"
    }
    \`\`\`

-   **用户请求**: "Find me nginx servers in the US with a valid SSL certificate but exclude any titles that contain the word 'test'."
-   **你的输出**:
    \`\`\`json
    {
      "fofa_query": "app=\\"nginx\\" && country=\\"US\\" && cert.is_valid=true && title!*=\\"test\\"",
      "explanation": "查询位于美国、运行nginx、拥有有效SSL证书且标题不包含'test'的资产。"
    }
    \`\`\`

---

## 需要处理的用户请求:
${userInput}`;
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
