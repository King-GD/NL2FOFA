# 配置指南

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-username/NL2FOFA.git
cd NL2FOFA
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
```

然后编辑 `.env` 文件，填入你的API密钥。

## 🔧 LLM服务配置

### 硅基流动
本项目目前使用硅基流动作为LLM服务提供商。

1. 访问 [硅基流动官网](https://cloud.siliconflow.cn/)
2. 注册账号并完成实名认证
3. 在控制台创建API密钥
4. 配置环境变量：

```env
LLM_API_KEY=sk-your_siliconflow_api_key
LLM_API_URL=https://api.siliconflow.cn/v1/chat/completions
```

## 🔍 FOFA配置

### 获取FOFA API
1. 访问 [FOFA官网](https://fofa.info/)
2. 注册账号并登录
3. 进入用户中心 -> API管理
4. 获取你的Email和API Key

### 配置FOFA
```env
FOFA_EMAIL=your_fofa_email@example.com
FOFA_API_KEY=your_fofa_api_key
```

## 🎯 完整配置示例

```env
# LLM配置
LLM_API_KEY=sk-your_siliconflow_api_key
LLM_API_URL=https://api.siliconflow.cn/v1/chat/completions

# FOFA配置
FOFA_EMAIL=your_fofa_email@example.com
FOFA_API_KEY=your_fofa_api_key
```

## 🔒 安全注意事项

1. **永远不要提交 `.env` 文件到版本控制**
2. **定期轮换API密钥**
3. **使用最小权限原则**
4. **监控API使用量和费用**

## 🛠️ 构建和运行

### 构建项目
```bash
npm run build
```

### 运行示例
```bash
# 自然语言查询
npm run dev "查找美国的nginx服务器"

# 直接FOFA语法
npm run dev --direct 'app="nginx" && country="US"'

# 查看帮助
npm run dev --help
```

## 🐛 故障排除

### 常见问题

#### API密钥无效
- 检查密钥格式是否正确
- 确认账户余额充足
- 验证API权限设置

#### 网络连接失败
- 国外服务可能需要代理
- 检查防火墙设置
- 尝试切换到国内服务商

#### 查询语法错误
- 在[FOFA官网](https://fofa.info/)测试语法
- 检查字段名称和操作符

## 📚 更多资源
- [项目README](./README.md)
