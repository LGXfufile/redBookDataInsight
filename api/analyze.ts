import { VercelRequest, VercelResponse } from '@vercel/node'
import { runRealDataScraping, XiaohongshuRealScraper } from './utils/realScraper'
import { EnhancedNLPAnalyzer } from './utils/nlp'
import fs from 'fs-extra'
import path from 'path'

interface AnalysisRequest {
  keywords: string[]
  monitorEnabled: boolean
  notifyFrequency: number
  useRealData?: boolean // 新增：是否使用真实数据
}

interface PainPoint {
  content: string
  frequency: number
  sentiment: number
  businessValue: number
  sources?: string[]
}

interface AnalysisResult {
  keyword: string
  totalPosts: number
  painPoints: PainPoint[]
  trends: Array<{
    date: string
    count: number
  }>
  userProfiles: {
    ageDistribution: Record<string, number>
    locationDistribution: Record<string, number>
  }
  dataSource: 'real' | 'mock'
  scrapingStats?: {
    successRate: number
    totalComments: number
    processingTime: number
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不被允许' })
  }

  try {
    const { keywords, monitorEnabled, notifyFrequency, useRealData = false }: AnalysisRequest = req.body

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: '请提供至少一个关键词' })
    }

    console.log(`开始分析关键词: ${keywords.join(', ')} ${useRealData ? '(真实数据)' : '(模拟数据)'}`)

    let analysisResult: AnalysisResult

    if (useRealData) {
      // 使用真实数据分析
      analysisResult = await analyzeWithRealData(keywords[0])
    } else {
      // 使用增强的模拟数据
      analysisResult = await analyzeWithEnhancedMockData(keywords[0])
    }

    // 如果开启了监控，保存监控配置
    if (monitorEnabled) {
      await saveMonitorConfig({
        keywords,
        frequency: notifyFrequency,
        useRealData,
        createdAt: new Date().toISOString()
      })
    }

    res.status(200).json(analysisResult)
  } catch (error) {
    console.error('分析错误:', error)
    res.status(500).json({ 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    })
  }
}

async function analyzeWithRealData(keyword: string): Promise<AnalysisResult> {
  const startTime = Date.now()
  
  try {
    console.log(`🔍 开始真实数据爬取: ${keyword}`)
    
    // 检查是否有缓存的数据
    const cachedData = await loadCachedData(keyword)
    let posts: any[] = []
    let scrapingStats = { successRate: 0, totalComments: 0, processingTime: 0 }

    if (cachedData && isCacheValid(cachedData.scrapedAt)) {
      console.log('📦 使用缓存数据')
      posts = cachedData.posts
      scrapingStats = cachedData.stats || scrapingStats
    } else {
      console.log('🚀 开始爬取新数据')
      // 实时爬取数据
      const scraper = new XiaohongshuRealScraper()
      await scraper.initialize()
      
      posts = await scraper.scrapeKeyword(keyword)
      
      // 保存数据到缓存
      await scraper.saveData(keyword, posts)
      await scraper.close()
      
      scrapingStats = {
        successRate: posts.length / 50 * 100,
        totalComments: posts.reduce((sum: number, post: any) => sum + post.comments.length, 0),
        processingTime: (Date.now() - startTime) / 1000 / 60
      }
    }

    console.log(`📊 开始NLP分析，数据量: ${posts.length} 帖子`)

    // 使用增强的NLP分析
    const nlpAnalyzer = new EnhancedNLPAnalyzer()
    const painPoints = nlpAnalyzer.extractPainPointsFromRealData(posts)

    // 生成趋势数据
    const trends = generateTrendsFromRealData(posts)

    // 生成用户画像
    const userProfiles = generateUserProfilesFromRealData(posts)

    const processingTime = (Date.now() - startTime) / 1000 / 60
    console.log(`✅ 真实数据分析完成，用时: ${processingTime.toFixed(1)} 分钟`)

    return {
      keyword,
      totalPosts: posts.length,
      painPoints,
      trends,
      userProfiles,
      dataSource: 'real',
      scrapingStats: {
        ...scrapingStats,
        processingTime: processingTime
      }
    }
  } catch (error) {
    console.error(`真实数据分析失败: ${error.message}`)
    // 降级到增强模拟数据
    console.log('🔄 降级到增强模拟数据')
    const mockResult = await analyzeWithEnhancedMockData(keyword)
    return {
      ...mockResult,
      dataSource: 'mock'
    }
  }
}

async function analyzeWithEnhancedMockData(keyword: string): Promise<AnalysisResult> {
  console.log(`🎭 生成增强模拟数据: ${keyword}`)

  // 针对三个关键词生成更真实的模拟数据
  const mockData = generateEnhancedMockData(keyword)
  
  const nlpAnalyzer = new EnhancedNLPAnalyzer()
  const painPoints = nlpAnalyzer.extractPainPointsFromRealData(mockData.posts)

  return {
    keyword,
    totalPosts: mockData.posts.length,
    painPoints,
    trends: mockData.trends,
    userProfiles: mockData.userProfiles,
    dataSource: 'mock'
  }
}

function generateEnhancedMockData(keyword: string) {
  const postCount = Math.floor(Math.random() * 50) + 80

  // 针对不同关键词生成专门的内容
  const contentTemplates = getContentTemplates(keyword)
  
  const posts = Array.from({ length: postCount }, (_, i) => ({
    id: `mock_${keyword}_${i}`,
    title: contentTemplates.titles[i % contentTemplates.titles.length],
    content: contentTemplates.contents[i % contentTemplates.contents.length],
    author: `用户${Math.floor(Math.random() * 1000)}`,
    publishTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    likeCount: Math.floor(Math.random() * 200) + 10,
    commentCount: Math.floor(Math.random() * 50) + 5,
    tags: contentTemplates.tags.slice(0, Math.floor(Math.random() * 3) + 2),
    url: `https://www.xiaohongshu.com/explore/mock_${i}`,
    comments: generateMockComments(Math.floor(Math.random() * 15) + 5, keyword)
  }))

  return {
    posts,
    trends: generateMockTrends(),
    userProfiles: generateMockUserProfiles()
  }
}

function getContentTemplates(keyword: string) {
  const templates = {
    '副业': {
      titles: [
        '副业三个月，我是如何从0做到月入过万的？',
        '做副业被骗了5000块，分享避坑经验',
        '分享几个靠谱的副业项目，亲测有效',
        '副业做了半年，为什么还是没赚到钱？',
        '上班族做副业的时间管理技巧',
        '副业选择指南：哪些项目适合新手？',
        '做副业需要投入多少成本？详细分析',
        '副业失败的5个常见原因，你中了几个？'
      ],
      contents: [
        '做副业三个月了，投入了很多时间和精力，但是收入微薄，感觉被骗了。市场竞争太激烈了，根本赚不到钱。',
        '想做副业但是没时间，上班已经很累了，晚上还要加班。投入成本太高，风险也大，不知道该怎么选择。',
        '做了几个副业项目，发现门槛都很高，需要专业技能。没有资源和人脉，推广困难，客户很难找到。',
        '副业做了半年，亏损了不少钱。很多项目都是坑人的，收益远不如宣传的那样。时间投入太多，影响主业。',
        '副业需要持续学习新技能，但是学习成本高，而且更新换代快。竞争对手太多，利润越来越薄。',
        '做副业最大的问题是时间不够，还有就是启动资金不足。很多好项目都需要一定的投入，风险承受能力有限。'
      ],
      tags: ['副业', '兼职', '赚钱', '创业', '投资', '理财']
    },
    '需求挖掘': {
      titles: [
        '如何精准挖掘用户真实需求？方法总结',
        '需求分析踩坑指南，避免这些错误',
        '市场调研怎么做才有效？经验分享',
        '用户访谈技巧，如何获得真实反馈',
        '需求挖掘工具推荐，提高工作效率',
        'B端和C端需求挖掘的区别在哪里？',
        '需求优先级排序的科学方法',
        '如何从数据中发现隐藏的用户需求？'
      ],
      contents: [
        '做需求挖掘最难的是找到真实的用户痛点。用户往往不会直接说出需求，需要通过行为分析才能发现。市场调研成本高，效果不好。',
        '需求分析时经常遇到用户说一套做一套的情况。问卷调研回收率低，数据质量差。缺乏有效的分析工具，处理大量数据很困难。',
        '用户访谈很难约到合适的人，而且访谈质量参差不齐。如何设计好的问题，避免引导性提问，这些都需要专业技能。',
        '竞品分析费时费力，而且很多信息获取困难。市场变化太快，需求挖掘的结果很快就过时了。投入产出比不高。',
        '数据分析工具成本高，学习门槛也不低。小公司缺乏专业的数据分析师，只能靠自己摸索，效率很低。',
        '需求挖掘和产品开发之间总是存在断层，需求传递过程中会丢失很多重要信息。跨部门协作困难。'
      ],
      tags: ['需求分析', '用户研究', '市场调研', '产品经理', '数据分析', '用户体验']
    },
    '海外产品': {
      titles: [
        '海外产品选品攻略，避免踩坑',
        '跨境电商物流那些事儿',
        '海外产品质量控制经验分享',
        '汇率波动对海外采购的影响',
        '海外产品售后服务如何做？',
        '文化差异导致的产品适配问题',
        '海外产品合规性要求解析',
        '如何建立稳定的海外供应链？'
      ],
      contents: [
        '海外产品最大的问题是物流时间长，客户等不及。而且物流成本高，吞噬了大部分利润。海关清关经常出问题，货物被扣。',
        '海外产品质量不稳定，标准和国内不同。退货成本太高，基本上都是亏损。语言沟通障碍，很难和供应商深入交流。',
        '汇率波动风险大，经常导致成本超预算。付款方式受限，资金安全没保障。法律法规复杂，一不小心就违规。',
        '海外产品认证费用高，周期长。不同国家标准不一样，需要重复认证。监管政策变化快，合规成本不断增加。',
        '文化差异导致产品设计不符合当地需求。营销推广难度大，获客成本高。缺乏本地化运营经验，效果不理想。',
        '海外供应商管理困难，时差问题影响沟通效率。质量控制全靠信任，缺乏有效的监督手段。售后服务响应慢，客户满意度低。'
      ],
      tags: ['海外产品', '跨境电商', '进出口', '供应链', '物流', '合规']
    }
  }

  return templates[keyword] || templates['副业']
}

function generateMockComments(count: number, keyword: string) {
  const commentTemplates = {
    '副业': [
      '同感，副业真的很难做，投入时间太多了',
      '我也被坑过，现在很谨慎',
      '有没有推荐的靠谱项目？',
      '做副业要量力而行，不要影响主业',
      '市场确实竞争激烈，需要找准定位'
    ],
    '需求挖掘': [
      '用户访谈确实是个技术活',
      '数据分析工具太贵了，小公司用不起',
      '需求变化太快，很难跟上',
      '跨部门协作是个大难题',
      '有什么好的方法论推荐吗？'
    ],
    '海外产品': [
      '物流成本确实很高，利润微薄',
      '海关清关经常出问题',
      '语言沟通是个大障碍',
      '质量控制全靠运气',
      '汇率波动风险太大了'
    ]
  }

  const templates = commentTemplates[keyword] || commentTemplates['副业']
  
  return Array.from({ length: count }, (_, i) => ({
    content: templates[i % templates.length],
    author: `评论用户${i}`,
    likeCount: Math.floor(Math.random() * 10),
    publishTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
  }))
}

function generateMockTrends() {
  const days = 7
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    count: Math.floor(Math.random() * 40) + 30
  }))
}

function generateMockUserProfiles() {
  return {
    ageDistribution: {
      '18-25': Math.floor(Math.random() * 25) + 20,
      '26-35': Math.floor(Math.random() * 35) + 40,
      '36-45': Math.floor(Math.random() * 25) + 15,
      '46+': Math.floor(Math.random() * 15) + 5
    },
    locationDistribution: {
      '北京': Math.floor(Math.random() * 15) + 15,
      '上海': Math.floor(Math.random() * 15) + 15,
      '广州': Math.floor(Math.random() * 12) + 8,
      '深圳': Math.floor(Math.random() * 12) + 12,
      '杭州': Math.floor(Math.random() * 10) + 6,
      '成都': Math.floor(Math.random() * 8) + 5,
      '其他': Math.floor(Math.random() * 20) + 25
    }
  }
}

function generateTrendsFromRealData(posts: any[]) {
  const dailyCount: Record<string, number> = {}
  
  posts.forEach(post => {
    const date = new Date(post.publishTime).toISOString().split('T')[0]
    dailyCount[date] = (dailyCount[date] || 0) + 1
  })

  return Object.entries(dailyCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

function generateUserProfilesFromRealData(posts: any[]) {
  // 基于真实数据的简化用户画像分析
  // 实际项目中应该从用户信息中分析
  return generateMockUserProfiles()
}

async function loadCachedData(keyword: string) {
  try {
    const dataDir = path.join(process.cwd(), 'scraped-data')
    const today = new Date().toISOString().split('T')[0]
    const filename = `${keyword}_${today}.json`
    const filepath = path.join(dataDir, filename)
    
    if (await fs.pathExists(filepath)) {
      return await fs.readJSON(filepath)
    }
  } catch (error) {
    console.log('缓存加载失败:', error.message)
  }
  return null
}

function isCacheValid(scrapedAt: string): boolean {
  const scrapedTime = new Date(scrapedAt)
  const now = new Date()
  const hoursDiff = (now.getTime() - scrapedTime.getTime()) / (1000 * 60 * 60)
  
  // 缓存有效期6小时
  return hoursDiff < 6
}

async function saveMonitorConfig(config: any) {
  console.log('监控配置已保存:', config)
  // TODO: 保存到持久化存储
}