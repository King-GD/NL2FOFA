/**
 * Result Presenter - 结果处理器
 * 负责将FOFA API返回的原始JSON数据美化成易于阅读的表格
 */

import { FofaResult } from './types.js';

export class ResultPresenter {
  
  /**
   * 将FOFA查询结果格式化为表格显示
   * @param results FOFA查询结果数组
   * @param query 原始查询语句
   * @param explanation 查询说明
   */
  static presentResults(results: FofaResult[], query?: string, explanation?: string): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 NL2FOFA 查询结果');
    console.log('='.repeat(80));

    if (query) {
      console.log(`📝 FOFA查询语句: ${query}`);
    }
    
    if (explanation) {
      console.log(`💡 查询说明: ${explanation}`);
    }

    console.log(`📊 结果数量: ${results.length} 条`);
    console.log('='.repeat(80));

    if (results.length === 0) {
      console.log('❌ 未找到匹配的结果');
      console.log('💡 建议：');
      console.log('   - 尝试使用更宽泛的搜索条件');
      console.log('   - 检查查询语法是否正确');
      console.log('   - 确认目标服务是否真实存在');
      return;
    }

    // 使用console.table显示结果
    const tableData = results.map((result, index) => ({
      '序号': index + 1,
      'IP地址': result.ip,
      '端口': result.port,
      '标题': this.truncateString(result.title, 40),
      '主机': this.truncateString(result.host, 30)
    }));

    console.table(tableData);

    // 显示统计信息
    this.showStatistics(results);
  }

  /**
   * 显示查询结果的统计信息
   * @param results FOFA查询结果数组
   */
  private static showStatistics(results: FofaResult[]): void {
    console.log('\n📈 统计信息:');
    
    // 端口统计
    const portStats = this.getPortStatistics(results);
    console.log('🔌 常见端口:');
    Object.entries(portStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([port, count]) => {
        console.log(`   ${port}: ${count} 个`);
      });

    // IP段统计
    const ipSegmentStats = this.getIPSegmentStatistics(results);
    console.log('\n🌐 IP段分布:');
    Object.entries(ipSegmentStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([segment, count]) => {
        console.log(`   ${segment}.x.x: ${count} 个`);
      });
  }

  /**
   * 获取端口统计信息
   * @param results FOFA查询结果数组
   * @returns 端口统计对象
   */
  private static getPortStatistics(results: FofaResult[]): Record<string, number> {
    const portStats: Record<string, number> = {};
    
    results.forEach(result => {
      const port = result.port || 'unknown';
      portStats[port] = (portStats[port] || 0) + 1;
    });

    return portStats;
  }

  /**
   * 获取IP段统计信息
   * @param results FOFA查询结果数组
   * @returns IP段统计对象
   */
  private static getIPSegmentStatistics(results: FofaResult[]): Record<string, number> {
    const segmentStats: Record<string, number> = {};
    
    results.forEach(result => {
      if (result.ip) {
        const segments = result.ip.split('.');
        if (segments.length >= 2) {
          const segment = `${segments[0]}.${segments[1]}`;
          segmentStats[segment] = (segmentStats[segment] || 0) + 1;
        }
      }
    });

    return segmentStats;
  }

  /**
   * 截断字符串到指定长度
   * @param str 原始字符串
   * @param maxLength 最大长度
   * @returns 截断后的字符串
   */
  private static truncateString(str: string, maxLength: number): string {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * 显示错误信息
   * @param error 错误信息
   */
  static presentError(error: string): void {
    console.log('\n' + '='.repeat(80));
    console.log('❌ 执行失败');
    console.log('='.repeat(80));
    console.log(`🚫 错误信息: ${error}`);
    console.log('\n💡 可能的解决方案:');
    console.log('   1. 检查网络连接是否正常');
    console.log('   2. 确认API密钥配置是否正确');
    console.log('   3. 验证查询语法是否符合FOFA规范');
    console.log('   4. 检查FOFA账户余额是否充足');
    console.log('='.repeat(80));
  }
}
