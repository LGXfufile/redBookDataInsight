interface SentimentResult {
  score: number; // -1 到 1 之间，-1最负面，1最正面
  confidence: number; // 0 到 1 之间的置信度
  emotion: 'positive' | 'negative' | 'neutral'
}

interface PainPoint {
  content: string
  frequency: number
  sentiment: number // 0-100，数值越高表示情感越负面
  businessValue: number // 0-100，商业价值评分
}

interface KeywordExtraction {
  keywords: string[]
  phrases: string[]
  topics: string[]
}

export class NLPAnalyzer {
  private negativeWords = [
    '差', '烂', '坏', '贵', '假', '骗', '垃圾', '失望', '后悔', '难用',
    '不好', '不行', '不推荐', '不值得', '质量差', '服务差', '态度差',
    '太贵', '太慢', '太难用', '不方便', '有问题', '有毒', '过敏',
    '掉色', '变质', '发霉', '异味', '刺鼻', '油腻', '粗糙', '松散'
  ]

  private positiveWords = [
    '好', '棒', '赞', '爱', '喜欢', '推荐', '值得', '满意', '惊喜', '完美',
    '很好', '不错', '超棒', '给力', 'amazing', '绝了', 'yyds', '真香',
    '性价比高', '物超所值', '质量好', '服务好', '效果好', '味道好'
  ]

  private painPointPatterns = [
    /价格.*?贵/g,
    /质量.*?差/g,
    /服务.*?差/g,
    /效果.*?不好/g,
    /包装.*?简陋/g,
    /物流.*?慢/g,
    /客服.*?态度.*?差/g,
    /容易.*?坏/g,
    /使用.*?不方便/g,
    /颜色.*?不正/g,
    /尺码.*?不准/g,
    /味道.*?难闻/g,
    /性价比.*?低/g,
    /选择.*?少/g,
    /买不到.*?正品/g
  ]

  analyzeSentiment(text: string): SentimentResult {
    let score = 0
    let positiveCount = 0
    let negativeCount = 0

    // 简单的词典方法进行情感分析
    this.negativeWords.forEach(word => {
      if (text.includes(word)) {
        negativeCount++
        score -= 1
      }
    })

    this.positiveWords.forEach(word => {
      if (text.includes(word)) {
        positiveCount++
        score += 1
      }
    })

    // 标准化分数
    const totalWords = positiveCount + negativeCount
    if (totalWords > 0) {
      score = score / totalWords
    }

    // 限制在 -1 到 1 之间
    score = Math.max(-1, Math.min(1, score))

    const confidence = Math.min(0.9, totalWords * 0.2)
    
    let emotion: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (score > 0.1) emotion = 'positive'
    else if (score < -0.1) emotion = 'negative'

    return {
      score,
      confidence,
      emotion
    }
  }

  extractPainPoints(posts: Array<{ content: string; comments?: number; likes?: number }>): PainPoint[] {
    const painPointMap = new Map<string, { count: number; totalSentiment: number; totalEngagement: number }>()

    posts.forEach(post => {
      const sentiment = this.analyzeSentiment(post.content)
      const engagement = (post.comments || 0) + (post.likes || 0)

      // 只处理负面情绪的帖子
      if (sentiment.emotion === 'negative' || sentiment.score < -0.1) {
        this.painPointPatterns.forEach(pattern => {
          const matches = post.content.match(pattern)
          if (matches) {
            matches.forEach(match => {
              const painPoint = this.normalizePainPoint(match)
              if (painPoint) {
                if (!painPointMap.has(painPoint)) {
                  painPointMap.set(painPoint, { count: 0, totalSentiment: 0, totalEngagement: 0 })
                }
                const data = painPointMap.get(painPoint)!
                data.count++
                data.totalSentiment += Math.abs(sentiment.score) * 100
                data.totalEngagement += engagement
              }
            })
          }
        })

        // 提取其他常见负面词汇
        this.negativeWords.forEach(word => {
          if (post.content.includes(word)) {
            const painPoint = this.extractContext(post.content, word)
            if (painPoint) {
              if (!painPointMap.has(painPoint)) {
                painPointMap.set(painPoint, { count: 0, totalSentiment: 0, totalEngagement: 0 })
              }
              const data = painPointMap.get(painPoint)!
              data.count++
              data.totalSentiment += Math.abs(sentiment.score) * 100
              data.totalEngagement += engagement
            }
          }
        })
      }
    })

    // 转换为数组并排序
    const painPoints: PainPoint[] = Array.from(painPointMap.entries()).map(([content, data]) => ({
      content,
      frequency: data.count,
      sentiment: data.totalSentiment / data.count,
      businessValue: this.calculateBusinessValue(data.count, data.totalSentiment / data.count, data.totalEngagement / data.count)
    }))

    return painPoints
      .filter(p => p.frequency >= 2) // 至少出现2次才算痛点
      .sort((a, b) => b.businessValue - a.businessValue)
      .slice(0, 20) // 返回前20个痛点
  }

  extractKeywords(texts: string[]): KeywordExtraction {
    // 简化的关键词提取
    const wordCount = new Map<string, number>()
    const phrases: string[] = []
    
    texts.forEach(text => {
      // 简单分词（实际项目中应该使用专业的中文分词工具）
      const words = text.match(/[\u4e00-\u9fa5]+/g) || []
      words.forEach(word => {
        if (word.length >= 2) {
          wordCount.set(word, (wordCount.get(word) || 0) + 1)
        }
      })
    })

    const keywords = Array.from(wordCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word)

    const topics = this.identifyTopics(keywords)

    return {
      keywords,
      phrases,
      topics
    }
  }

  private normalizePainPoint(painPoint: string): string | null {
    // 标准化痛点表达
    const normalizedMap: Record<string, string> = {
      '价格太贵': '价格过高',
      '价格贵': '价格过高',
      '太贵了': '价格过高',
      '质量差': '质量问题',
      '质量不好': '质量问题',
      '服务差': '服务质量差',
      '服务不好': '服务质量差',
      '效果不好': '效果不佳',
      '没效果': '效果不佳'
    }

    return normalizedMap[painPoint] || painPoint
  }

  private extractContext(text: string, keyword: string): string | null {
    const index = text.indexOf(keyword)
    if (index === -1) return null

    // 提取关键词前后的上下文
    const start = Math.max(0, index - 10)
    const end = Math.min(text.length, index + keyword.length + 10)
    const context = text.slice(start, end).trim()

    return context.length > keyword.length ? context : null
  }

  private calculateBusinessValue(frequency: number, sentiment: number, engagement: number): number {
    // 商业价值 = 频次权重(40%) + 情感强度权重(40%) + 参与度权重(20%)
    const frequencyScore = Math.min(100, (frequency / 10) * 100) * 0.4
    const sentimentScore = Math.min(100, sentiment) * 0.4
    const engagementScore = Math.min(100, (engagement / 100) * 100) * 0.2

    return Math.round(frequencyScore + sentimentScore + engagementScore)
  }

  private identifyTopics(keywords: string[]): string[] {
    // 简单的主题识别
    const topicKeywords = {
      '质量': ['质量', '做工', '材质', '工艺'],
      '价格': ['价格', '钱', '贵', '便宜', '性价比'],
      '服务': ['服务', '客服', '售后', '物流', '配送'],
      '体验': ['体验', '感觉', '使用', '效果'],
      '外观': ['颜色', '外观', '包装', '设计', '样式']
    }

    const topics: string[] = []
    Object.entries(topicKeywords).forEach(([topic, relatedWords]) => {
      if (relatedWords.some(word => keywords.includes(word))) {
        topics.push(topic)
      }
    })

    return topics
  }
}