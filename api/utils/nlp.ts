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
  sources: string[] // 来源帖子ID或内容片段
}

interface KeywordExtraction {
  keywords: string[]
  phrases: string[]
  topics: string[]
}

// 导入真实爬虫数据类型
interface XHSPost {
  id: string;
  title: string;
  content: string;
  author: string;
  publishTime: string;
  likeCount: number;
  commentCount: number;
  tags: string[];
  url: string;
  comments: Array<{
    content: string;
    author: string;
    likeCount: number;
    publishTime: string;
  }>;
}

export class EnhancedNLPAnalyzer {
  // 扩展的负面词汇库，针对三个关键词领域
  private negativeWords = [
    // 通用负面词
    '差', '烂', '坏', '贵', '假', '骗', '垃圾', '失望', '后悔', '难用',
    '不好', '不行', '不推荐', '不值得', '质量差', '服务差', '态度差',
    '太贵', '太慢', '太难用', '不方便', '有问题', '有毒', '过敏',
    
    // 副业相关负面词
    '赚不到钱', '浪费时间', '被骗了', '没收入', '太累了', '没时间',
    '投入太大', '风险高', '不靠谱', '骗人的', '坑人', '血本无归',
    
    // 需求挖掘相关
    '找不到', '没需求', '市场小', '竞争激烈', '没人买', '难推广',
    '成本高', '利润低', '门槛高', '技术难', '资源少',
    
    // 海外产品相关
    '物流慢', '税费高', '语言障碍', '汇率问题', '退货难', '售后差',
    '质量不稳定', '标准不同', '文化差异', '监管严格'
  ]

  private positiveWords = [
    '好', '棒', '赞', '爱', '喜欢', '推荐', '值得', '满意', '惊喜', '完美',
    '很好', '不错', '超棒', '给力', 'amazing', '绝了', 'yyds', '真香',
    '性价比高', '物超所值', '质量好', '服务好', '效果好', '味道好',
    
    // 副业相关正面词
    '赚钱了', '有收入', '时间自由', '轻松', '稳定', '可持续',
    '投入少', '回报高', '很靠谱', '推荐做',
    
    // 需求挖掘正面词
    '市场大', '有需求', '好卖', '利润高', '前景好', '值得做',
    
    // 海外产品正面词
    '质量好', '性价比高', '物流快', '服务好', '值得买'
  ]

  // 针对三个关键词的痛点模式
  private painPointPatterns = [
    // 副业相关痛点
    /副业.*?(赚不到钱|浪费时间|被骗|没收入|太累)/g,
    /做.*?(副业|兼职).*?(失败|亏损|被坑)/g,
    /(投入|成本).*?太(高|大)/g,
    /时间.*?(不够|太少|冲突)/g,
    /(资金|资源).*?(不足|缺乏|有限)/g,
    
    // 需求挖掘相关痛点
    /市场.*?(太小|没需求|饱和)/g,
    /竞争.*?(激烈|太大|残酷)/g,
    /(推广|营销).*?(困难|效果差|成本高)/g,
    /(客户|用户).*?(找不到|获取难|流失)/g,
    /利润.*?(微薄|很低|不够)/g,
    
    // 海外产品相关痛点
    /物流.*?(慢|贵|丢失|损坏)/g,
    /海关.*?(扣留|税费|麻烦)/g,
    /语言.*?(障碍|不通|沟通难)/g,
    /汇率.*?(波动|损失|风险)/g,
    /(退货|售后).*?(困难|麻烦|不方便)/g,
    /质量.*?(不稳定|差异大|标准不同)/g,
    /法规.*?(复杂|严格|难懂)/g
  ]

  // 商业价值关键词
  private businessValueKeywords = {
    high: ['刚需', '市场大', '利润高', '门槛低', '可扩展', '长期', '稳定'],
    medium: ['有需求', '可操作', '有潜力', '值得试试', '还行'],
    low: ['小众', '门槛高', '风险大', '不确定', '难做']
  }

  analyzeSentiment(text: string): SentimentResult {
    let score = 0
    let positiveCount = 0
    let negativeCount = 0

    // 检查负面词汇
    this.negativeWords.forEach(word => {
      const regex = new RegExp(word, 'g');
      const matches = text.match(regex);
      if (matches) {
        negativeCount += matches.length;
        score -= matches.length * 1.5; // 负面词汇权重更高
      }
    })

    // 检查正面词汇
    this.positiveWords.forEach(word => {
      const regex = new RegExp(word, 'g');
      const matches = text.match(regex);
      if (matches) {
        positiveCount += matches.length;
        score += matches.length;
      }
    })

    // 特殊情况处理
    if (text.includes('但是') || text.includes('不过') || text.includes('然而')) {
      score *= 0.7; // 转折词降低情感强度
    }

    if (text.includes('！') || text.includes('？？')) {
      score *= 1.2; // 感叹号增强情感
    }

    // 标准化分数
    const totalWords = positiveCount + negativeCount;
    if (totalWords > 0) {
      score = score / Math.max(totalWords, 1);
    }

    // 限制在 -1 到 1 之间
    score = Math.max(-1, Math.min(1, score));

    const confidence = Math.min(0.95, totalWords * 0.15 + 0.3);
    
    let emotion: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (score > 0.15) emotion = 'positive';
    else if (score < -0.15) emotion = 'negative';

    return {
      score,
      confidence,
      emotion
    }
  }

  extractPainPointsFromRealData(posts: XHSPost[]): PainPoint[] {
    const painPointMap = new Map<string, { 
      count: number; 
      totalSentiment: number; 
      totalEngagement: number;
      sources: Set<string>;
    }>>();

    // 分析所有帖子和评论
    posts.forEach(post => {
      const allTexts = [
        post.title,
        post.content,
        ...post.comments.map(c => c.content)
      ];

      allTexts.forEach(text => {
        if (!text || text.length < 10) return;

        const sentiment = this.analyzeSentiment(text);
        const engagement = post.likeCount + post.commentCount;

        // 只处理负面或中性偏负的内容
        if (sentiment.emotion === 'negative' || sentiment.score < -0.1) {
          // 使用模式匹配提取痛点
          this.painPointPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const painPoint = this.normalizePainPoint(match);
                if (painPoint && painPoint.length > 4 && painPoint.length < 50) {
                  if (!painPointMap.has(painPoint)) {
                    painPointMap.set(painPoint, { 
                      count: 0, 
                      totalSentiment: 0, 
                      totalEngagement: 0,
                      sources: new Set()
                    });
                  }
                  const data = painPointMap.get(painPoint)!;
                  data.count++;
                  data.totalSentiment += Math.abs(sentiment.score) * 100;
                  data.totalEngagement += engagement;
                  data.sources.add(`${post.title.substring(0, 30)}...`);
                }
              });
            }
          });

          // 关键词分析提取痛点
          const painKeywords = this.extractPainKeywords(text);
          painKeywords.forEach(keyword => {
            const painPoint = this.generatePainPointFromKeyword(text, keyword);
            if (painPoint) {
              if (!painPointMap.has(painPoint)) {
                painPointMap.set(painPoint, { 
                  count: 0, 
                  totalSentiment: 0, 
                  totalEngagement: 0,
                  sources: new Set()
                });
              }
              const data = painPointMap.get(painPoint)!;
              data.count++;
              data.totalSentiment += Math.abs(sentiment.score) * 100;
              data.totalEngagement += engagement;
              data.sources.add(`${post.title.substring(0, 30)}...`);
            }
          });
        }
      });
    });

    // 转换为痛点数组并排序
    const painPoints: PainPoint[] = Array.from(painPointMap.entries())
      .map(([content, data]) => ({
        content,
        frequency: data.count,
        sentiment: Math.min(100, data.totalSentiment / data.count),
        businessValue: this.calculateEnhancedBusinessValue(
          content,
          data.count, 
          data.totalSentiment / data.count, 
          data.totalEngagement / data.count
        ),
        sources: Array.from(data.sources).slice(0, 3)
      }))
      .filter(p => p.frequency >= 2) // 至少出现2次
      .sort((a, b) => b.businessValue - a.businessValue)
      .slice(0, 25); // 返回前25个痛点

    return painPoints;
  }

  private extractPainKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // 使用负面词汇作为痛点关键词
    this.negativeWords.forEach(word => {
      if (text.includes(word)) {
        keywords.push(word);
      }
    });

    return keywords;
  }

  private generatePainPointFromKeyword(text: string, keyword: string): string | null {
    // 提取包含关键词的句子或短语
    const sentences = text.split(/[。！？\n]/);
    const relevantSentence = sentences.find(s => s.includes(keyword));
    
    if (relevantSentence && relevantSentence.length > 10 && relevantSentence.length < 100) {
      return this.normalizePainPoint(relevantSentence.trim());
    }
    
    return null;
  }

  private normalizePainPoint(painPoint: string): string | null {
    // 清理和标准化痛点表达
    let normalized = painPoint
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 移除特殊字符
      .replace(/\s+/g, ' ') // 标准化空格
      .trim();

    // 标准化映射
    const normalizedMap: Record<string, string> = {
      '价格太贵': '价格过高',
      '价格贵': '价格过高',
      '太贵了': '价格过高',
      '成本太高': '成本过高问题',
      '质量差': '质量问题',
      '质量不好': '质量问题',
      '服务差': '服务质量差',
      '服务不好': '服务质量差',
      '效果不好': '效果不佳',
      '没效果': '效果不佳',
      '物流慢': '物流速度慢',
      '配送慢': '物流速度慢',
      '赚不到钱': '盈利困难',
      '没收入': '盈利困难',
      '竞争激烈': '市场竞争激烈',
      '竞争太大': '市场竞争激烈',
      '门槛高': '进入门槛高',
      '难做': '执行困难'
    };

    normalized = normalizedMap[normalized] || normalized;

    // 过滤无效痛点
    if (normalized.length < 4 || normalized.length > 30) return null;
    if (normalized.includes('的话') || normalized.includes('如果')) return null;

    return normalized;
  }

  private calculateEnhancedBusinessValue(
    content: string, 
    frequency: number, 
    sentiment: number, 
    engagement: number
  ): number {
    // 基础分数计算
    const frequencyScore = Math.min(100, (frequency / 5) * 100) * 0.3;
    const sentimentScore = Math.min(100, sentiment) * 0.3;
    const engagementScore = Math.min(100, (engagement / 50) * 100) * 0.2;

    // 商业价值关键词加权
    let keywordBonus = 0;
    this.businessValueKeywords.high.forEach(kw => {
      if (content.includes(kw)) keywordBonus += 15;
    });
    this.businessValueKeywords.medium.forEach(kw => {
      if (content.includes(kw)) keywordBonus += 8;
    });
    this.businessValueKeywords.low.forEach(kw => {
      if (content.includes(kw)) keywordBonus -= 10;
    });

    // 特定领域加权
    let domainBonus = 0;
    if (content.includes('副业') || content.includes('兼职')) domainBonus += 10;
    if (content.includes('需求') || content.includes('市场')) domainBonus += 8;
    if (content.includes('海外') || content.includes('跨境')) domainBonus += 12;

    const finalScore = frequencyScore + sentimentScore + engagementScore + keywordBonus * 0.15 + domainBonus * 0.05;
    
    return Math.round(Math.max(0, Math.min(100, finalScore)));
  }

  extractKeywords(texts: string[]): KeywordExtraction {
    const wordCount = new Map<string, number>();
    const phrases: string[] = [];
    
    texts.forEach(text => {
      // 中文分词（简化版）
      const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
      words.forEach(word => {
        if (word.length >= 2 && word.length <= 6) {
          wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
      });

      // 提取常见短语
      const commonPhrases = text.match(/[\u4e00-\u9fa5]{3,8}/g) || [];
      phrases.push(...commonPhrases.slice(0, 5));
    });

    const keywords = Array.from(wordCount.entries())
      .filter(([word, count]) => count >= 3) // 至少出现3次
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([word]) => word);

    const topics = this.identifyTopicsFromKeywords(keywords);

    return {
      keywords,
      phrases: [...new Set(phrases)].slice(0, 20),
      topics
    };
  }

  private identifyTopicsFromKeywords(keywords: string[]): string[] {
    const topicKeywords = {
      '副业赚钱': ['副业', '兼职', '赚钱', '收入', '投资', '创业'],
      '需求分析': ['需求', '市场', '用户', '痛点', '机会', '分析'],
      '海外贸易': ['海外', '跨境', '出口', '外贸', '国际', '全球'],
      '产品质量': ['质量', '做工', '材质', '工艺', '品质', '标准'],
      '价格成本': ['价格', '成本', '费用', '投入', '预算', '性价比'],
      '服务体验': ['服务', '客服', '售后', '物流', '配送', '体验'],
      '技术门槛': ['技术', '难度', '门槛', '专业', '学习', '掌握'],
      '市场竞争': ['竞争', '对手', '差异', '优势', '策略', '定位']
    };

    const topics: string[] = [];
    Object.entries(topicKeywords).forEach(([topic, relatedWords]) => {
      const matchCount = relatedWords.filter(word => 
        keywords.some(keyword => keyword.includes(word))
      ).length;
      
      if (matchCount >= 2) {
        topics.push(topic);
      }
    });

    return topics.slice(0, 5);
  }
}