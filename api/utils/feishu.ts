interface FeishuMessage {
  msg_type: 'text' | 'rich_text' | 'interactive'
  content: {
    text?: string
    rich_text?: {
      elements: Array<{
        tag: string
        text?: {
          content: string
          tag: string
        }
        href?: string
      }>
    }
  }
}

interface NotificationConfig {
  webhookUrl: string
  keywords: string[]
  frequency: number
  lastChecked?: string
}

export class FeishuNotifier {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async sendPainPointAlert(keyword: string, newPainPoints: Array<{
    content: string
    businessValue: number
    frequency: number
  }>): Promise<boolean> {
    try {
      const message = this.formatPainPointMessage(keyword, newPainPoints)
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      })

      return response.ok
    } catch (error) {
      console.error('发送飞书通知失败:', error)
      return false
    }
  }

  async sendSummaryReport(keyword: string, summary: {
    totalNewPosts: number
    highValuePainPoints: number
    topPainPoint: string
  }): Promise<boolean> {
    try {
      const message = this.formatSummaryMessage(keyword, summary)
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      })

      return response.ok
    } catch (error) {
      console.error('发送飞书通知失败:', error)
      return false
    }
  }

  private formatPainPointMessage(keyword: string, painPoints: Array<{
    content: string
    businessValue: number
    frequency: number
  }>): FeishuMessage {
    const highValuePoints = painPoints.filter(p => p.businessValue > 70)
    
    const content = `🚨 小红书痛点监控警报
    
关键词: ${keyword}
时间: ${new Date().toLocaleString('zh-CN')}

发现 ${painPoints.length} 个新痛点，其中 ${highValuePoints.length} 个高价值机会：

${highValuePoints.slice(0, 3).map((point, index) => 
  `${index + 1}. ${point.content}
     商业价值: ${point.businessValue}分
     提及频次: ${point.frequency}次`
).join('\n\n')}

${highValuePoints.length > 3 ? `\n还有 ${highValuePoints.length - 3} 个高价值痛点...` : ''}

💡 建议立即关注这些商业机会！`

    return {
      msg_type: 'text',
      content: {
        text: content
      }
    }
  }

  private formatSummaryMessage(keyword: string, summary: {
    totalNewPosts: number
    highValuePainPoints: number
    topPainPoint: string
  }): FeishuMessage {
    const content = `📊 小红书监控日报

关键词: ${keyword}
时间: ${new Date().toLocaleString('zh-CN')}

今日数据:
• 新增帖子: ${summary.totalNewPosts} 条
• 高价值痛点: ${summary.highValuePainPoints} 个
• 热门痛点: ${summary.topPainPoint}

💼 持续关注市场动态，把握商机！`

    return {
      msg_type: 'text',
      content: {
        text: content
      }
    }
  }
}

// 监控任务管理
export class MonitoringService {
  private static instance: MonitoringService
  private configs: Map<string, NotificationConfig> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  addMonitorTask(id: string, config: NotificationConfig) {
    this.configs.set(id, config)
    this.scheduleTask(id, config)
    console.log(`监控任务已添加: ${id}, 监控关键词: ${config.keywords.join(', ')}, 频率: ${config.frequency}小时`)
  }

  removeMonitorTask(id: string) {
    const timer = this.timers.get(id)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(id)
    }
    this.configs.delete(id)
    console.log(`监控任务已移除: ${id}`)
  }

  private scheduleTask(id: string, config: NotificationConfig) {
    const intervalMs = config.frequency * 60 * 60 * 1000 // 转换为毫秒

    const timer = setInterval(async () => {
      await this.executeMonitorTask(id, config)
    }, intervalMs)

    this.timers.set(id, timer)
  }

  private async executeMonitorTask(id: string, config: NotificationConfig) {
    try {
      console.log(`执行监控任务: ${id}`)
      
      // 这里应该调用分析API获取最新数据
      const newData = await this.fetchLatestData(config.keywords[0])
      
      if (newData && newData.length > 0) {
        const notifier = new FeishuNotifier(config.webhookUrl)
        
        // 发送痛点警报
        await notifier.sendPainPointAlert(config.keywords[0], newData)
        
        // 更新最后检查时间
        config.lastChecked = new Date().toISOString()
        this.configs.set(id, config)
      }
      
    } catch (error) {
      console.error(`监控任务执行失败: ${id}`, error)
    }
  }

  private async fetchLatestData(keyword: string) {
    // 模拟获取最新数据
    // 实际项目中这里应该调用爬虫和分析服务
    return [
      {
        content: `${keyword}相关的新发现痛点`,
        businessValue: Math.floor(Math.random() * 40) + 60,
        frequency: Math.floor(Math.random() * 20) + 5
      }
    ]
  }

  getAllTasks(): Array<{id: string, config: NotificationConfig}> {
    return Array.from(this.configs.entries()).map(([id, config]) => ({
      id,
      config
    }))
  }
}