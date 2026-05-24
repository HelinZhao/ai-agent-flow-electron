import { TemplateCreationAttributes } from '../models/Template'

export const SEED_TEMPLATES: TemplateCreationAttributes[] = [
  // ======== API 模板 ========
  {
    name: 'Slack 发送消息',
    description: '通过 Incoming Webhook 向 Slack 频道发送消息',
    type: 'api',
    category: '即时通讯',
    icon: '💬',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://hooks.slack.com/services/{{webhookPath}}',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      body: '{"text": "{{$input}}"}',
    }),
  },
  {
    name: '飞书机器人通知',
    description: '通过飞书自定义机器人 webhook 发送群消息',
    type: 'api',
    category: '即时通讯',
    icon: '📘',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://open.feishu.cn/open-apis/bot/v2/hook/{{webhookPath}}',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      body: '{"msg_type": "text","content": {"text": "{{$input}}"}}',
    }),
  },
  {
    name: 'GitHub 创建 Issue',
    description: '在指定仓库创建一个 GitHub Issue',
    type: 'api',
    category: '版本控制',
    icon: '🐙',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.github.com/repos/{{owner}}/{{repo}}/issues',
      method: 'POST',
      headers: '{"Authorization": "Bearer {{$env.GITHUB_TOKEN}}","Content-Type": "application/json"}',
      body: '{"title": "{{$input}}","body": "{{description}}"}',
    }),
  },
  {
    name: 'Telegram 发送消息',
    description: '通过 Telegram Bot API 发送消息',
    type: 'api',
    category: '即时通讯',
    icon: '✈️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendMessage',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      body: '{"chat_id": "{{chatId}}","text": "{{$input}}"}',
    }),
  },
  {
    name: '企业微信机器人',
    description: '通过企业微信机器人 webhook 发送群消息',
    type: 'api',
    category: '即时通讯',
    icon: '💼',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key={{webhookKey}}',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      body: '{"msgtype": "text","text": {"content": "{{$input}}"}}',
    }),
  },
  {
    name: 'DingTalk 机器人',
    description: '通过钉钉机器人 webhook 发送群消息',
    type: 'api',
    category: '即时通讯',
    icon: '🔔',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://oapi.dingtalk.com/robot/send?access_token={{accessToken}}',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      body: '{"msgtype": "text","text": {"content": "{{$input}}"}}',
    }),
  },
  {
    name: 'OpenWeather 查询',
    description: '通过 OpenWeatherMap API 查询实时天气和未来预报',
    type: 'api',
    category: '数据服务',
    icon: '🌤️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.openweathermap.org/data/2.5/weather?q={{city}}&appid={{$env.OPENWEATHER_API_KEY}}&units=metric&lang=zh_cn',
      method: 'GET',
      headers: '',
      body: '',
    }),
  },
  {
    name: 'DeepSeek Chat',
    description: '调用 DeepSeek API 进行对话或文本生成',
    type: 'api',
    category: 'AI 工具',
    icon: '🤖',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.deepseek.com/v1/chat/completions',
      method: 'POST',
      headers: '{"Authorization": "Bearer {{$env.DEEPSEEK_API_KEY}}","Content-Type": "application/json"}',
      body: '{"model": "deepseek-chat","messages": [{"role": "user","content": "{{$input}}"}],"temperature": 0.7}',
    }),
  },
  {
    name: '高德地图地理编码',
    description: '将地址文字转为经纬度坐标，支持反向地理编码',
    type: 'api',
    category: '数据服务',
    icon: '📍',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://restapi.amap.com/v3/geocode/geo?key={{$env.AMAP_KEY}}&address={{$input}}&city={{city}}',
      method: 'GET',
      headers: '',
      body: '',
    }),
  },
  {
    name: '一言（Hitokoto）',
    description: '获取随机一言句子，支持多种分类（动画、文学、哲学等）',
    type: 'api',
    category: '数据服务',
    icon: '💬',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://v1.hitokoto.cn/?c={{category || "a"}}&encode=json',
      method: 'GET',
      headers: '',
      body: '',
    }),
  },
  {
    name: '百度翻译',
    description: '调用百度翻译 API 进行多语种互译',
    type: 'api',
    category: 'AI 工具',
    icon: '🌐',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.fanyi.baidu.com/api/trans/vip/translate?q={{$input}}&from={{from || "auto"}}&to={{to || "zh"}}&appid={{$env.BAIDU_TRANSLATE_APP_ID}}&salt=123456&sign={{sign}}',
      method: 'GET',
      headers: '',
      body: '',
    }),
  },
  {
    name: 'GitHub 用户信息',
    description: '查询 GitHub 用户公开信息，包括仓库数、粉丝、关注等',
    type: 'api',
    category: '版本控制',
    icon: '👤',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.github.com/users/{{username}}',
      method: 'GET',
      headers: '{"Accept": "application/vnd.github.v3+json"}',
      body: '',
    }),
  },
  {
    name: 'IP 信息查询',
    description: '查询 IP 地址的地理位置、运营商等详细信息',
    type: 'api',
    category: '数据服务',
    icon: '🌍',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'http://ip-api.com/json/{{$input}}?lang=zh-CN',
      method: 'GET',
      headers: '',
      body: '',
    }),
  },
  {
    name: 'Pexels 图片搜索',
    description: '搜索免版权高清图片，支持关键词和分页',
    type: 'api',
    category: '数据服务',
    icon: '🖼️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.pexels.com/v1/search?query={{$input}}&per_page={{perPage || 5}}',
      method: 'GET',
      headers: '{"Authorization": "{{$env.PEXELS_API_KEY}}"}',
      body: '',
    }),
  },
  {
    name: 'RSS 订阅解析',
    description: '解析 RSS/Atom 订阅源，获取最新文章列表',
    type: 'api',
    category: '数据服务',
    icon: '📡',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      url: 'https://api.rss2json.com/v1/api.json?rss_url={{$input}}',
      method: 'GET',
      headers: '',
      body: '',
    }),
  },

  // ======== MCP 配置 ========
  {
    name: 'Playwright (浏览器自动化)',
    description: '通过 Playwright 控制浏览器进行网页操作和截图',
    type: 'mcp',
    category: '浏览器',
    icon: '🎭',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['@anthropic-ai/mcp-playwright']),
    }),
  },
  {
    name: 'Filesystem (文件系统)',
    description: '安全的文件系统操作，支持读写、搜索、目录管理',
    type: 'mcp',
    category: '开发工具',
    icon: '📁',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@anthropic-ai/mcp-filesystem', '{{allowedDir}}']),
    }),
  },
  {
    name: 'GitHub MCP',
    description: 'GitHub 仓库管理：PR、Issue、代码搜索等',
    type: 'mcp',
    category: '版本控制',
    icon: '🐙',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@anthropic-ai/mcp-github']),
    }),
  },
  {
    name: 'Sqlite 数据库',
    description: 'SQLite 数据库查询和管理',
    type: 'mcp',
    category: '数据库',
    icon: '🗄️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@anthropic-ai/mcp-sqlite', '{{dbPath}}']),
    }),
  },
  {
    name: '小红书笔记搜索',
    description: '搜索小红书笔记内容，支持关键词搜索和笔记详情获取',
    type: 'mcp',
    category: '社交媒体',
    icon: '📕',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@joker-xiaohongshu/mcp-server-xiaohongshu']),
    }),
  },
  {
    name: '抖音数据采集',
    description: '获取抖音视频数据、用户信息和热门内容',
    type: 'mcp',
    category: '社交媒体',
    icon: '🎵',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@bytedance/mcp-server-douyin']),
    }),
  },
  {
    name: '微信公众平台',
    description: '管理微信公众号文章、素材和粉丝互动',
    type: 'mcp',
    category: '社交媒体',
    icon: '💬',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@wechat-mcp/mcp-server-wechat']),
    }),
  },
  {
    name: '百度搜索',
    description: '通过百度搜索获取网页搜索结果，支持分页和筛选',
    type: 'mcp',
    category: '搜索',
    icon: '🔍',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@baidu/mcp-server-search']),
    }),
  },
  {
    name: '飞书文档',
    description: '创建和编辑飞书文档、表格、多维表格',
    type: 'mcp',
    category: '办公协作',
    icon: '📘',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@feishu/mcp-server-docs']),
    }),
  },
  {
    name: 'Docker 管理',
    description: '管理 Docker 容器、镜像、日志和 Compose 编排',
    type: 'mcp',
    category: '开发工具',
    icon: '🐳',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@docker/mcp-server-docker']),
    }),
  },
  {
    name: 'MySQL 数据库',
    description: '连接 MySQL 数据库执行查询、管理和分析',
    type: 'mcp',
    category: '数据库',
    icon: '🗃️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@mysql/mcp-server-mysql', '--host={{host}}', '--user={{user}}', '--password={{password}}', '--database={{database}}']),
    }),
  },
  {
    name: 'Redis 缓存',
    description: '连接 Redis 进行缓存读写、键值管理和发布订阅',
    type: 'mcp',
    category: '数据库',
    icon: '⚡',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@redis/mcp-server-redis', '--url={{$env.REDIS_URL || "redis://localhost:6379"}}']),
    }),
  },
  {
    name: 'Elasticsearch',
    description: 'Elasticsearch 索引管理、搜索查询和聚合分析',
    type: 'mcp',
    category: '数据库',
    icon: '🔎',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      transportType: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@elastic/mcp-server-elasticsearch', '--url={{$env.ES_URL || "http://localhost:9200"}}']),
    }),
  },

  // ======== 代码片段 ========
  {
    name: 'JSON 转 CSV',
    description: '将 JSON 数组转换为 CSV 格式',
    type: 'code',
    category: '数据处理',
    icon: '📊',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: 'const data = JSON.parse($input)\nif (!Array.isArray(data)) return "需要 JSON 数组输入"\nconst headers = Object.keys(data[0])\nconst rows = data.map(item => headers.map(h => JSON.stringify(item[h] ?? "")).join(","))\nreturn [headers.join(","), ...rows].join("\\n")',
      language: 'javascript',
    }),
  },
  {
    name: '数组聚合统计',
    description: '对数值数组计算总和、平均值、最大值、最小值',
    type: 'code',
    category: '数据处理',
    icon: '📈',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: 'const arr = JSON.parse($input)\nif (!Array.isArray(arr)) return "需要数组输入"\nconst nums = arr.map(Number).filter(n => !isNaN(n))\nreturn JSON.stringify({\n  count: nums.length,\n  sum: nums.reduce((a, b) => a + b, 0),\n  avg: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),\n  min: Math.min(...nums),\n  max: Math.max(...nums),\n}, null, 2)',
      language: 'javascript',
    }),
  },
  {
    name: '文本分块',
    description: '将长文本按指定大小分块，支持重叠',
    type: 'code',
    category: '文本处理',
    icon: '✂️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: 'const size = 500\nconst overlap = 50\nconst text = $input\nconst chunks = []\nlet i = 0\nwhile (i < text.length) {\n  chunks.push(text.slice(i, i + size))\n  i += size - overlap\n}\nreturn JSON.stringify(chunks, null, 2)',
      language: 'javascript',
    }),
  },
  {
    name: '数据去重',
    description: '按指定字段对 JSON 数组去重',
    type: 'code',
    category: '数据处理',
    icon: '🔄',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: 'const data = JSON.parse($input)\nif (!Array.isArray(data)) return "需要数组输入"\nconst field = params?.field || "id"\nconst seen = new Set()\nreturn JSON.stringify(data.filter(item => {\n  const val = item[field]\n  if (seen.has(val)) return false\n  seen.add(val)\n  return true\n}), null, 2)',
      language: 'javascript',
    }),
  },
  {
    name: '日期格式化',
    description: '将各种格式的日期字符串统一格式化',
    type: 'code',
    category: '文本处理',
    icon: '📅',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: 'const format = params?.format || "YYYY-MM-DD"\nconst date = new Date($input)\nif (isNaN(date.getTime())) return "无效日期"\nconst map = {\n  "YYYY": date.getFullYear(),\n  "MM": String(date.getMonth() + 1).padStart(2, "0"),\n  "DD": String(date.getDate()).padStart(2, "0"),\n  "HH": String(date.getHours()).padStart(2, "0"),\n  "mm": String(date.getMinutes()).padStart(2, "0"),\n  "ss": String(date.getSeconds()).padStart(2, "0"),\n}\nreturn Object.entries(map).reduce((s, [k, v]) => s.replace(k, v), format)',
      language: 'javascript',
    }),
  },
  {
    name: 'URL 参数解析',
    description: '解析 URL 查询字符串为对象，支持 decode 和重复 key 合并为数组',
    type: 'code',
    category: '数据处理',
    icon: '🔗',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: 'const url = $input\nconst queryStart = url.indexOf("?")\nif (queryStart === -1) return "{}"\nconst search = url.slice(queryStart + 1)\nconst result = {}\nsearch.split("&").forEach(pair => {\n  if (!pair) return\n  const [k, ...v] = pair.split("=")\n  const key = decodeURIComponent(k)\n  const val = decodeURIComponent(v.join("="))\n  if (result[key]) {\n    result[key] = Array.isArray(result[key]) ? [...result[key], val] : [result[key], val]\n  } else {\n    result[key] = val\n  }\n})\nreturn JSON.stringify(result, null, 2)',
      language: 'javascript',
    }),
  },
  {
    name: 'Base64 编解码',
    description: '对输入文本进行 Base64 编码或解码，自动检测编码方向',
    type: 'code',
    category: '文本处理',
    icon: '🔐',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: 'const input = $input\nconst mode = params?.mode || "auto"\n\nconst isBase64 = (s) => {\n  try {\n    return btoa(atob(s)) === s\n  } catch { return false }\n}\n\nif (mode === "encode" || (mode === "auto" && !isBase64(input.trim()))) {\n  return btoa(unescape(encodeURIComponent(input)))\n} else {\n  return decodeURIComponent(escape(atob(input.trim())))\n}',
      language: 'javascript',
    }),
  },
  {
    name: '文本关键词提取',
    description: '基于词频统计提取文本关键词，支持过滤停用词和自定义词表',
    type: 'code',
    category: '文本处理',
    icon: '🏷️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: `const text = $input
const topK = params?.topK || 10
const stopWords = (params?.stopWords || "的,了,在,是,我,有,和,就,不,人,都,一,一个,上,也,很,到,说,要,去,你,会,着,没有,看,好,自己,这,他,她,它,们,那,些,之,与,及,但,或,又,被,把,对,从,为,以,而,能,于,因为,所以,如果,虽然,但是,而且,不过,然而,因此,以及,不但,不仅,要么,或者,还是,只是,除了,关于,按照,根据,通过,经过").split(",")
const minLen = params?.minWordLength || 2

// 中文分词：按字符和常见双字词进行频率统计
const chars = text.split(/[\\s,，。.！!？?；;：:、""''（）()【】\\[\\]{}《》<>/\\n\\r]+/)
const freq = {}
chars.forEach(c => {
  const word = c.trim()
  if (!word || word.length < minLen || stopWords.includes(word)) return
  freq[word] = (freq[word] || 0) + 1
})

const sorted = Object.entries(freq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, topK)
  .map(([word, count]) => ({ word, count }))

return JSON.stringify({ totalWords: chars.length, keywords: sorted }, null, 2)`,
      language: 'javascript',
    }),
  },
  {
    name: 'HTTP 请求封装',
    description: '使用 fetch 发送 HTTP 请求，支持超时、重试、JSON 自动解析',
    type: 'code',
    category: '数据处理',
    icon: '🌐',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: `const request = async (url, options = {}) => {
  const { method = "GET", headers = {}, body, timeout = 10000, retries = 2 } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timer)
      const text = await resp.text()
      let data
      try { data = JSON.parse(text) } catch { data = text }
      return JSON.stringify({ status: resp.status, ok: resp.ok, data }, null, 2)
    } catch (err) {
      clearTimeout(timer)
      if (i === retries) return \`请求失败(尝试\${retries+1}次): \${err.message}\`
    }
  }
}

// 使用示例：$input 为 URL，可通过 params 传 options
const url = $input
const opts = params?.options ? JSON.parse(params.options) : {}
return await request(url, opts)`,
      language: 'javascript',
    }),
  },
  {
    name: '文本差异对比',
    description: '对两段文本进行逐行差异比较，输出新增/删除/修改的部分',
    type: 'code',
    category: '文本处理',
    icon: '🔍',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: `// 输入格式：两段文本用 === 分隔符隔开
// 或通过 params.oldText / params.newText 传入
const parts = $input.split("===").map(s => s.trim())
const oldLines = (params?.oldText || parts[0] || "").split("\\n")
const newLines = (params?.newText || parts[1] || "").split("\\n")

// 最长公共子序列
const lcs = (a, b) => {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  return dp
}

const dp = lcs(oldLines, newLines)
const result = []
let i = oldLines.length, j = newLines.length
const diff = []
while (i > 0 || j > 0) {
  if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
    diff.unshift({ type: " ", line: oldLines[i - 1] })
    i--; j--
  } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
    diff.unshift({ type: "+", line: newLines[j - 1] })
    j--
  } else {
    diff.unshift({ type: "-", line: oldLines[i - 1] })
    i--
  }
}
return diff.map(d => d.type + " " + d.line).join("\\n")`,
      language: 'javascript',
    }),
  },
  {
    name: '定时任务表达式生成',
    description: '根据自然语言描述生成 6 段 Quartz cron 表达式（含秒）',
    type: 'code',
    category: '数据处理',
    icon: '⏰',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: `const desc = $input.trim().toLowerCase()
const parts = desc.split(/\\s+/)

// 简单规则匹配
if (/^(every|每)\\s*(\\d+)?\\s*(second|秒)/.test(desc)) {
  const n = parseInt(RegExp.$2) || 1
  return n === 1 ? "* * * * * *" : "*/" + n + " * * * * *"
}
if (/^(every|每)\\s*(\\d+)?\\s*(minute|分)/.test(desc)) {
  const n = parseInt(RegExp.$2) || 1
  return "0 */" + n + " * * * *"
}
if (/^(every|每)\\s*(\\d+)?\\s*(hour|小时)/.test(desc)) {
  const n = parseInt(RegExp.$2) || 1
  return "0 0 */" + n + " * * *"
}
if (/^every|每\\s*(day|天)/.test(desc)) {
  const hour = desc.match(/(\\d+)\\s*(:?(\\d+))?\\s*(am|pm|点)/)
  if (hour) {
    const h = parseInt(hour[1])
    const m = parseInt(hour[3]) || 0
    return "0 " + m + " " + h + " * * *"
  }
  return "0 0 9 * * *"
}

return "无法识别的描述，请使用以下格式：\\n- 每5分钟 → */5 * * * * *\\n- 每天9点 → 0 0 9 * * *\\n- 每小时 → 0 0 * * * *"`,
      language: 'javascript',
    }),
  },
  {
    name: 'Markdown 转纯文本',
    description: '去除 Markdown 格式标记，提取纯文本内容，保留段落结构',
    type: 'code',
    category: '文本处理',
    icon: '📄',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: `const md = $input
let text = md
  // 移除代码块
  .replace(/\`\`\`[\\s\\S]*?\`\`\`/g, "")
  // 移除行内代码
  .replace(/\`([^\`]+)\`/g, "$1")
  // 移除图片
  .replace(/!\\[([^\\]]*)\\]\\([^)]+\\)/g, "")
  // 移除链接，保留文本
  .replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, "$1")
  // 移除标题标记
  .replace(/^#{1,6}\\s+/gm, "")
  // 移除粗体和斜体
  .replace(/\\*\\*([^*]+)\\*\\*/g, "$1")
  .replace(/\\*([^*]+)\\*/g, "$1")
  // 移除分割线
  .replace(/^[-*_]{3,}\\s*$/gm, "")
  // 移除引用标记
  .replace(/^>\\s+/gm, "")
  // 移除列表标记
  .replace(/^[\\s]*[-*+]\\s+/gm, "")
  .replace(/^[\\s]*\\d+\\.\\s+/gm, "")
  // 合并多余空行
  .replace(/\\n{3,}/g, "\\n\\n")
  .trim()

return text`,
      language: 'javascript',
    }),
  },
  {
    name: '文本模板渲染',
    description: '使用 {{变量名}} 语法渲染文本模板，支持自定义变量映射',
    type: 'code',
    category: '文本处理',
    icon: '📝',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: `// 输入：包含 {{变量名}} 占位符的模板文本
// params.vars: 变量映射对象 JSON 字符串
// 如 {{name}} 会被 params.vars 中的 name 替换

const template = $input
const vars = params?.vars ? JSON.parse(params.vars) : {}
const now = new Date()

// 内置变量
const builtins = {
  "\\$now": now.toISOString(),
  "\\$now.date": now.toLocaleDateString("zh-CN"),
  "\\$now.time": now.toLocaleTimeString("zh-CN"),
  "\\$now.year": String(now.getFullYear()),
  "\\$now.month": String(now.getMonth() + 1).padStart(2, "0"),
  "\\$now.day": String(now.getDate()).padStart(2, "0"),
}

const allVars = { ...builtins, ...vars }

// 注意转义特殊字符
const result = template.replace(/\\{\\{\\{\\$?(\\w+)\\}\\}\\}/g, (match, key) => {
  // 先匹配最长键（如 $now.date）
  const sorted = Object.keys(allVars).sort((a, b) => b.length - a.length)
  for (const k of sorted) {
    if (match.includes(k)) return allVars[k]
  }
  return allVars[key] !== undefined ? String(allVars[key]) : match
})

return result`,
      language: 'javascript',
    }),
  },
  {
    name: '数据抽样',
    description: '对 JSON 数组进行随机抽样或等距抽样，支持指定抽样数量和种子',
    type: 'code',
    category: '数据处理',
    icon: '🎲',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      code: `const data = JSON.parse($input)
if (!Array.isArray(data)) return "需要数组输入"

const method = params?.method || "random"  // random | systematic
const count = Math.min(parseInt(params?.count) || 10, data.length)
const seed = parseInt(params?.seed) || Date.now()

if (method === "systematic") {
  // 等距抽样
  const step = Math.floor(data.length / count)
  const result = []
  for (let i = 0; i < data.length && result.length < count; i += step) {
    result.push(data[i])
  }
  return JSON.stringify({ method, total: data.length, sampled: result.length, data: result }, null, 2)
}

// 随机抽样（Fisher-Yates 洗牌）
const shuffled = [...data]
let s = seed
const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1))
  ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
}

return JSON.stringify({ method, total: data.length, sampled: count, data: shuffled.slice(0, count) }, null, 2)`,
      language: 'javascript',
    }),
  },

  // ======== 工作流模板 ========
  {
    name: '内容审核工作流',
    description: '对用户输入内容进行自动审核，包含敏感词检测、AI 安全评估，通过则放行，不通过则拒绝',
    type: 'workflow',
    category: '内容处理',
    icon: '🛡️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: { label: '开始' } },
        { id: 'llm-review', type: 'llm', position: { x: 200, y: 0 }, data: { label: 'AI 审核', config: { prompt: '请判断以下用户输入是否包含违规内容（色情、暴力、仇恨言论、广告等）。如果违规请回复 ONLY "REJECT"，否则回复 "APPROVE"。\n\n用户输入: {{$input}}', variables: [], enabledTools: [] } } },
        { id: 'branch', type: 'branch', position: { x: 400, y: 0 }, data: { label: '审核判断', config: { branches: [{ id: 'approve', label: '审核通过', condition: 'LLM 输出包含 APPROVE 时放行' }, { id: 'reject', label: '审核拒绝', condition: 'LLM 输出包含 REJECT 时拒绝并返回错误信息' }] } } },
        { id: 'notify-pass', type: 'text', position: { x: 600, y: -80 }, data: { label: '放行通知', config: { text: '内容审核通过，已放行。原始输入: {{$input}}', variables: [] } } },
        { id: 'notify-reject', type: 'text', position: { x: 600, y: 80 }, data: { label: '拒绝通知', config: { text: '内容审核未通过，已拒绝请求。', variables: [] } } },
        { id: 'end-approve', type: 'end', position: { x: 800, y: -80 }, data: { label: '结束-通过' } },
        { id: 'end-reject', type: 'end', position: { x: 800, y: 80 }, data: { label: '结束-拒绝' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'llm-review' },
        { id: 'e2', source: 'llm-review', target: 'branch' },
        { id: 'e3', source: 'branch', target: 'notify-pass', condition: 'approve', label: '通过' },
        { id: 'e4', source: 'branch', target: 'notify-reject', condition: 'reject', label: '拒绝' },
        { id: 'e5', source: 'notify-pass', target: 'end-approve' },
        { id: 'e6', source: 'notify-reject', target: 'end-reject' },
      ],
      layoutDirection: 'horizontal',
    }),
  },
  {
    name: '每日热点简报',
    description: '自动搜索指定主题的热点内容，汇总生成每日简报。需配置 {{$env.DEEPSEEK_API_KEY}} 环境变量',
    type: 'workflow',
    category: '内容处理',
    icon: '📋',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: { label: '开始', config: { params: [{ name: 'topic', displayName: '搜索主题', type: 'string', required: true, description: '例如：AI 人工智能、科技新闻' }] } } },
        { id: 'search', type: 'api', position: { x: 250, y: 0 }, data: { label: '搜索热点', config: { apiConfig: { url: 'https://api.duckduckgo.com/?q={{$params.topic}}热点&format=json', method: 'GET', headers: '', body: '' } } } },
        { id: 'llm', type: 'llm', position: { x: 500, y: 0 }, data: { label: '生成简报', config: { prompt: '根据以下搜索结果，生成一份关于 "{{$params.topic}}" 的每日热点简报。要求：\n1. 提取 3-5 个关键热点\n2. 每条热点用一句话概括\n3. 格式简洁易读\n\n搜索结果：\n{{$input}}', variables: [], enabledTools: [] } } },
        { id: 'end', type: 'end', position: { x: 750, y: 0 }, data: { label: '结束' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'search' },
        { id: 'e2', source: 'search', target: 'llm' },
        { id: 'e3', source: 'llm', target: 'end' },
      ],
      layoutDirection: 'horizontal',
    }),
  },

  // ======== 技能模板 ========
  {
    name: '代码审查技能',
    description: '对提交的代码进行全面的质量审查，检查代码风格、潜在的 bug、安全漏洞和性能问题',
    type: 'skill',
    category: '开发工具',
    icon: '🔍',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一名资深的代码审查员。审查代码时请从以下几个维度进行分析：\n\n1. **正确性**：是否存在逻辑错误、边界条件未处理、空指针/类型错误\n2. **性能**：是否存在不必要的循环、内存泄漏、冗余计算\n3. **安全性**：是否存在 SQL 注入、XSS、CSRF 等安全风险\n4. **可维护性**：命名是否清晰、函数是否过长、是否有重复代码\n5. **代码风格**：是否遵循语言的常见约定和最佳实践\n\n对于每个发现问题，请指出：问题描述、影响程度（高/中/低）、改进建议。',
    }),
  },
  {
    name: 'Prompt 优化技能',
    description: '帮助优化和改善 LLM 提示词，使其更清晰、结构化、高效',
    type: 'skill',
    category: 'AI 工具',
    icon: '✨',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个 Prompt 工程专家。请帮助用户优化他们的提示词，遵循以下原则：\n\n1. **明确角色**：为 LLM 定义清晰的角色和身份\n2. **结构化指令**：使用步骤编号或列表分解复杂任务\n3. **具体约束**：明确输出格式、长度限制、风格要求\n4. **示例引导**：提供 Few-shot 示例来说明期望的输出\n5. **边界处理**：说明当信息不足或无法完成任务时的应对方式\n\n请分析用户提供的 prompt 并提出具体的优化建议，同时给出优化后的版本。',
    }),
  },
  {
    name: 'SQL 生成技能',
    description: '根据自然语言描述生成对应的 SQL 查询语句，支持多表联查和复杂聚合',
    type: 'skill',
    category: '数据处理',
    icon: '🗄️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个 SQL 专家。请根据用户的自然语言描述生成对应的 SQL 查询语句。\n\n规则：\n1. 默认使用 PostgreSQL 语法\n2. 对于模糊的表结构假设，在注释中标注假设\n3. 优先使用标准 SQL，必要时使用特定数据库的函数\n4. 对复杂查询添加注释说明每个子句的作用\n5. 如果用户的描述不够明确，请指出需要补充的信息\n\n输出格式：\n```sql\n-- 查询说明\nSELECT ...\nFROM ...\nWHERE ...\n```',
    }),
  },
  {
    name: '文章摘要生成',
    description: '自动提取长文核心要点，生成简洁准确的摘要，支持中文和英文内容',
    type: 'skill',
    category: '文本处理',
    icon: '📝',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个专业的文本摘要助手。请对用户提供的文本进行摘要，遵循以下原则：\n\n1. **核心信息**：提取最关键的事实、数据和结论，忽略次要细节\n2. **结构清晰**：按逻辑组织摘要，使用段落或要点列表\n3. **保持原意**：不添加原文没有的信息，不歪曲原意\n4. **长度控制**：短文本(＜500字)摘要控制在原文 30% 以内，长文本控制在 10% 以内\n5. **关键词保留**：保留重要的专有名词、数字、日期\n\n用户提供文本后，先判断语言(中文/英文)，然后用相同语言输出摘要。',
    }),
  },
  {
    name: '翻译助手',
    description: '多语言翻译，支持中英日韩法德等主流语种，保留原文格式和语气',
    type: 'skill',
    category: '文本处理',
    icon: '🌐',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个专业的翻译助手。请根据用户的要求进行翻译，遵循以下原则：\n\n1. **忠实原文**：准确传达原文意思，不增删内容\n2. **通顺自然**：符合目标语言的表达习惯，避免翻译腔\n3. **术语一致**：专业术语保持行业内通用译法\n4. **格式保留**：保留原文的段落结构、列表、标点风格\n5. **文化适配**：对习语、俚语、文化特定表达进行本地化处理\n\n如果用户未指定目标语言，默认翻译为简体中文。对于多段文本，逐段翻译保持对应。',
    }),
  },
  {
    name: '文案润色',
    description: '对文本进行语法修正、风格优化和表达升级，提升可读性和专业度',
    type: 'skill',
    category: '文本处理',
    icon: '✒️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个专业的文案润色专家。请对用户提供的文本进行润色，遵循以下原则：\n\n润色维度：\n1. **语法修正**：检查并修正拼写错误、语法错误、标点符号\n2. **表达优化**：替换冗余啰嗦的表达，使用更精准的词汇\n3. **风格统一**：保持全文语气和风格一致（正式/轻松/技术等）\n4. **逻辑连贯**：优化段落间过渡，确保行文流畅\n5. **长度调整**：如果原文过长则精简，过短则适当丰富\n\n输出格式：先简要说明做了哪些改进，然后给出润色后的完整文本。',
    }),
  },
  {
    name: '数据洞察分析',
    description: '对结构化数据(JSON/CSV)进行多维度分析，发现趋势、异常和关联',
    type: 'skill',
    category: '数据处理',
    icon: '📊',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个数据分析专家。请对用户提供的结构化数据进行分析，输出以下内容：\n\n1. **数据概览**：数据规模、字段类型、缺失值情况\n2. **分布分析**：数值型字段的均值/中位数/极值，类别型字段的频率分布\n3. **趋势发现**：如果有时间维度，指出上升/下降/周期等趋势\n4. **异常检测**：离群值、异常模式、数据质量问题\n5. **关联洞察**：字段之间的相关性、有趣的交叉分析结果\n\n对每条发现标注可信度(高/中/低)。避免过度解读，相关性不等于因果性。\n\n如果数据量超过 100 条，请基于抽样分析并注明。',
    }),
  },
  {
    name: '正则表达式助手',
    description: '根据文本匹配需求生成和解释正则表达式，支持常见正则风格',
    type: 'skill',
    category: '开发工具',
    icon: '🔤',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个正则表达式专家。帮助用户生成、解释和调试正则表达式。\n\n服务范围：\n1. **生成**：根据文本匹配需求编写正则表达式\n2. **解释**：分解复杂正则，逐段说明每个部分的含义\n3. **优化**：改进现有正则的性能和准确性\n4. **调试**：分析为什么某个正则没有按预期匹配\n\n输出规范：\n- 提供正则表达式及其使用的 flags\n- 给出匹配示例和排除示例\n- 标注适用的语言/工具（JavaScript、Python、VSCode 等）\n- 如果正则过于复杂，建议拆分为多步或使用更简单的方法',
    }),
  },
  {
    name: 'API 文档生成',
    description: '根据接口描述或代码生成结构化的 API 文档，支持 OpenAPI/Swagger 格式',
    type: 'skill',
    category: '开发工具',
    icon: '📖',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个 API 文档专家。帮助用户生成和优化 API 文档。\n\n输出格式要求：\n1. **接口概述**：功能描述、请求方法、URL 路径\n2. **请求参数**：参数名、类型、是否必填、说明、示例值\n3. **请求体**：Content-Type、字段结构、示例 JSON\n4. **响应格式**：成功响应结构、状态码说明、示例\n5. **错误码**：常见错误码及其含义\n\n根据用户的输入内容判断生成详细程度：\n- 只有 URL → 推测并生成完整文档（标注推测部分）\n- 有代码(如 Express/Spring 路由) → 从代码注解中提取\n- 已有部分文档 → 补充缺失部分并修正不准确的地方',
    }),
  },
  {
    name: 'SEO 内容优化',
    description: '针对搜索引擎优化文章和网页内容，提供关键词策略和结构建议',
    type: 'skill',
    category: '内容创作',
    icon: '🔍',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个 SEO 内容优化专家。帮助用户优化内容的搜索引擎排名。\n\n优化维度：\n1. **关键词策略**：识别核心关键词和长尾关键词，推荐关键词密度\n2. **标题优化**：H1/H2 标签的关键词布局，标题吸引力和长度\n3. **内容结构**：段落组织、信息层级、内部链接建议\n4. **元数据**：Meta Title、Meta Description 的优化建议\n5. **可读性**：句子长度、段落长度、过渡词使用、被动语态比例\n6. **多媒体**：图片 alt 文本建议、结构化数据标记推荐\n\n针对每个优化点说明优先级（高/中/低）和预期影响。',
    }),
  },
  {
    name: 'JSON 数据处理',
    description: '对 JSON 数据进行查询、转换、合并、过滤等操作，用 JavaScript 实现',
    type: 'skill',
    category: '数据处理',
    icon: '📄',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个 JSON 数据处理专家。帮助用户处理和分析 JSON 数据。\n\n能力范围：\n1. **查询提取**：按条件筛选、按路径提取嵌套字段\n2. **格式转换**：JSON ↔ CSV、JSON ↔ XML、JSON 结构重塑\n3. **数据合并**：多组 JSON 数据合并、关联（类似 JOIN）\n4. **聚合计算**：分组统计、求和、平均值、计数等\n5. **数据清洗**：去重、空值处理、类型转换、字段重命名\n\n输出 JavaScript 代码片段（可在 Code 节点中直接使用），包含以下内容：\n- 完整可执行的代码\n- 输入输出示例\n- 边界情况处理说明',
    }),
  },
  {
    name: '日报周报生成',
    description: '根据工作记录和要点自动生成规范的日报、周报、月报',
    type: 'skill',
    category: '内容创作',
    icon: '📋',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      content: '你是一个工作报告撰写助手。帮助用户根据零散的工作记录生成结构化的报告。\n\n报告结构：\n1. **核心工作**：完成的重点任务及成果，用数据量化\n2. **待办事项**：进行中的工作和下一步计划\n3. **问题与风险**：遇到的问题、解决方案、需要协调的事项\n4. **关键指标**：与目标对比的进度百分比、里程碑完成情况\n\n根据用户输入自动判断报告类型（日报/周报/月报）：\n- 当天工作 → 日报，侧重具体执行\n- 一周工作 → 周报，侧重进度汇总和下周计划\n- 一月工作 → 月报，侧重成果总结和战略调整\n\n风格要求：简洁、客观、结果导向。',
    }),
  },

  // ======== Agent 模板 ========
  {
    name: '客服助手',
    description: '智能客服 Agent，基于知识库回答用户问题，支持多轮对话。需绑定知识库后使用',
    type: 'agent',
    category: '客户服务',
    icon: '🤝',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一个专业的客服助手。请根据以下原则回答用户问题：\n1. 始终礼貌、耐心地回复\n2. 如果问题涉及具体产品信息，引用知识库内容回答\n3. 如果不确定答案，诚实地告诉用户你不知道，并建议转接人工客服\n4. 回答简洁明了，避免冗长\n5. 不要编造信息',
      type: 'assistant',
      skillIds: [],
      enabledTools: [],
    }),
  },
  {
    name: '代码审查员',
    description: '代码审查 Agent，能够分析代码质量、发现潜在 bug 并给出优化建议',
    type: 'agent',
    category: '开发工具',
    icon: '🔍',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一名资深的代码审查员。审查代码时请关注：\n1. 代码正确性：是否存在逻辑错误或边界情况未处理\n2. 性能问题：是否有不必要的计算、内存泄漏等\n3. 代码风格：是否遵循常见的最佳实践\n4. 安全性：是否存在注入、XSS 等安全风险\n5. 可维护性：是否有清晰的命名和结构\n\n对于每个问题，请指出具体行数和改进建议。',
      type: 'assistant',
      skillIds: [],
      enabledTools: ['readFile', 'listDirectory'],
    }),
  },
  {
    name: '写作助手',
    description: '协助撰写和优化各类文案，支持博客、邮件、社交媒体等不同场景',
    type: 'agent',
    category: '内容创作',
    icon: '✍️',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一个专业的写作助手。根据用户需求协助撰写和优化文案：\n\n1. **博客文章**：提供标题建议、文章结构、段落展开\n2. **商务邮件**：正式得体，包含主题、称呼、正文、落款\n3. **社交媒体**：短小精悍，适合对应平台风格（微博、小红书、LinkedIn）\n4. **润色优化**：改进语法、提升可读性、统一风格\n\n每次输出时标注适用的场景和目标读者，帮助用户判断是否合适。',
      type: 'assistant',
      skillIds: [],
      enabledTools: ['webSearch'],
    }),
  },
  {
    name: '数据分析师',
    description: '对上传的数据进行分析和可视化建议，支持统计分析和趋势解读',
    type: 'agent',
    category: '数据处理',
    icon: '📊',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一个数据分析师。帮助用户理解他们的数据并提供见解：\n\n能力范围：\n1. **数据概览**：描述数据规模、字段分布、缺失情况\n2. **统计分析**：计算均值、中位数、标准差等统计指标\n3. **趋势识别**：发现时间序列的趋势、周期、异常点\n4. **可视化建议**：推荐合适的图表类型和展示方式\n5. **业务洞察**：将数据发现转化为可操作的业务建议\n\n注意：\n- 如果数据量较大，先抽样分析再给出完整结论\n- 明确区分"数据事实"和"推测解释"\n- 标注分析的可信度',
      type: 'assistant',
      skillIds: [],
      enabledTools: ['readFile'],
    }),
  },
  {
    name: '学习导师',
    description: '个性化学习辅导 Agent，帮助理解概念、解答问题、提供练习题',
    type: 'agent',
    category: '教育',
    icon: '🎓',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一个耐心的学习导师。帮助用户学习和理解各种知识：\n\n教学方法：\n1. **概念解释**：用简单易懂的语言解释复杂概念，多用类比和实例\n2. **循序渐进**：从基础到高级，确保用户理解前置知识再深入\n3. **苏格拉底式提问**：通过引导性问题帮助用户自己发现答案\n4. **练习巩固**：提供练习题并详细讲解答案\n5. **知识关联**：将新知识与用户已知的知识建立联系\n\n风格：耐心、鼓励、避免说教。如果用户理解有困难，换一种角度重新解释。\n\n输出格式：先确认用户的当前理解水平，再针对性讲解。',
      type: 'assistant',
      skillIds: [],
      enabledTools: ['webSearch'],
    }),
  },
  {
    name: '翻译专员',
    description: '专业翻译 Agent，支持中英日韩法德等多语种互译，保留语境和语气',
    type: 'agent',
    category: '内容创作',
    icon: '🌐',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一个专业翻译专员。擅长多语种翻译，注重质量和准确性：\n\n翻译原则：\n1. **准确传意**：忠实传达原文内容和语气，不增删重要信息\n2. **自然流畅**：确保译文符合目标语言的表达习惯\n3. **术语统一**：专业术语保持行业标准译法\n4. **格式保留**：保留原文的格式、分段、列表结构\n5. **文化适配**：对习语、俚语进行恰当的本地化处理\n\n工作流程：\n1. 先确认源语言和目标语言\n2. 识别文本类型（技术文档/文学/商务/日常）\n3. 根据文本类型调整翻译风格\n4. 对不确定的翻译标注并说明可选方案\n5. 如需，提供简要的翻译说明或术语表',
      type: 'assistant',
      skillIds: [],
      enabledTools: [],
    }),
  },
  {
    name: '技术文档工程师',
    description: '撰写和优化技术文档，支持 API 文档、README、技术博客等格式',
    type: 'agent',
    category: '开发工具',
    icon: '📖',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一个技术文档工程师。帮助用户创建高质量的 technical writing：\n\n擅长格式：\n- README / 项目文档\n- API 参考文档\n- 技术教程 / 操作指南\n- 架构设计文档\n- 变更日志 (Changelog)\n\n文档原则：\n1. **结构清晰**：使用层级标题、目录、导航\n2. **代码示例**：提供可运行的代码片段和预期输出\n3. **场景导向**：按使用场景组织内容而非按功能罗列\n4. **一致性**：术语、语气、格式保持统一\n5. **可维护性**：标注需要定期更新的部分\n\n输出使用 Markdown 格式，适配常见的文档站点（GitHub Wiki、ReadTheDocs、VitePress 等）。',
      type: 'assistant',
      skillIds: [],
      enabledTools: ['readFile', 'listDirectory', 'webSearch'],
    }),
  },
  {
    name: '面试助手',
    description: '模拟面试练习，覆盖技术面试和行为面试，提供反馈和改进建议',
    type: 'agent',
    category: '教育',
    icon: '💼',
    author: 'system',
    version: '1.0.0',
    content: JSON.stringify({
      instructions: '你是一个面试辅导专家。帮助用户准备各类面试：\n\n面试类型：\n1. **技术面试**：算法、系统设计、编程语言基础\n2. **行为面试**：STAR 法则、团队协作、冲突处理\n3. **HR 面试**：职业规划、薪资谈判、自我介绍\n\n工作方式：\n1. 首先确认面试类型和岗位级别\n2. 提出一个面试问题\n3. 等待用户回答后再给出评价\n4. 从以下维度给出反馈：回答完整性、表达清晰度、技术准确性\n5. 提供参考回答要点\n6. 给出一个追问或下一题\n\n风格：专业、建设性、鼓励进步。指出不足时同时给出改进方向。',
      type: 'assistant',
      skillIds: [],
      enabledTools: [],
    }),
  },
]
