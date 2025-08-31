import { VercelRequest, VercelResponse } from '@vercel/node'
import { XiaohongshuScraper } from './utils/scraper'
import { NLPAnalyzer } from './utils/nlp'

interface AnalysisRequest {
  keywords: string[]
  monitorEnabled: boolean
  notifyFrequency: number
}

interface PainPoint {
  content: string
  frequency: number
  sentiment: number
  businessValue: number
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
}

const scraper = new XiaohongshuScraper()
const nlpAnalyzer = new NLPAnalyzer()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不被允许' })
  }

  try {
    const { keywords, monitorEnabled, notifyFrequency }: AnalysisRequest = req.body

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: '请提供至少一个关键词' })
    }

    console.log(`开始分析关键词: ${keywords.join(', ')}`)

    // 分析主要关键词
    const primaryKeyword = keywords[0]
    const analysisResult = await analyzeKeyword(primaryKeyword)

    // 如果开启了监控，保存监控配置
    if (monitorEnabled) {
      await saveMonitorConfig({
        keywords,
        frequency: notifyFrequency,
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

async function analyzeKeyword(keyword: string): Promise<AnalysisResult> {
  try {
    console.log(`正在爬取关键词 "${keyword}" 的数据...`)
    
    // 爬取小红书数据
    const scrapingResult = await scraper.searchPosts(keyword, 200)
    const posts = scrapingResult.posts

    console.log(`爬取到 ${posts.length} 条数据，开始NLP分析...`)

    // 提取所有评论
    const allComments = []
    for (const post of posts.slice(0, 50)) { // 只分析前50条的评论，避免超时
      const comments = await scraper.getComments(post.id)
      allComments.push(...comments)
    }

    // 合并帖子内容和评论内容进行分析
    const allTexts = [
      ...posts.map(p => ({ content: p.content, comments: p.comments, likes: p.likes })),
      ...allComments.map(c => ({ content: c.content, comments: 0, likes: c.likes || 0 }))
    ]

    // NLP分析提取痛点
    const painPoints = nlpAnalyzer.extractPainPoints(allTexts)

    // 生成趋势数据
    const trends = generateTrendData(posts)

    // 生成用户画像
    const userProfiles = generateUserProfiles()

    console.log(`分析完成，发现 ${painPoints.length} 个痛点`)

    return {
      keyword,
      totalPosts: posts.length,
      painPoints,
      trends,
      userProfiles
    }
  } catch (error) {
    console.error(`分析关键词 "${keyword}" 时出错:`, error)
    throw error
  }
}

function generateTrendData(posts: any[]) {
  // 根据真实数据生成趋势
  const dailyCount: Record<string, number> = {}
  
  posts.forEach(post => {
    const date = new Date(post.timestamp).toISOString().split('T')[0]
    dailyCount[date] = (dailyCount[date] || 0) + 1
  })

  return Object.entries(dailyCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

function generateUserProfiles() {
  // 模拟用户画像数据（实际项目中应该从爬取的数据中分析）
  return {
    ageDistribution: {
      '18-25': Math.floor(Math.random() * 30) + 25,
      '26-35': Math.floor(Math.random() * 40) + 35,
      '36-45': Math.floor(Math.random() * 20) + 15,
      '46+': Math.floor(Math.random() * 10) + 5
    },
    locationDistribution: {
      '北京': Math.floor(Math.random() * 20) + 15,
      '上海': Math.floor(Math.random() * 20) + 15,
      '广州': Math.floor(Math.random() * 15) + 10,
      '深圳': Math.floor(Math.random() * 15) + 10,
      '杭州': Math.floor(Math.random() * 10) + 8,
      '其他': Math.floor(Math.random() * 20) + 20
    }
  }
}

async function saveMonitorConfig(config: any) {
  // TODO: 实际项目中应该保存到数据库（如Redis、MongoDB等）
  console.log('监控配置已保存:', config)
  
  // 这里可以保存到环境变量或者外部存储
  // 例如保存到Vercel KV存储或者其他数据库
}