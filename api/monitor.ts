import { VercelRequest, VercelResponse } from '@vercel/node'
import { MonitoringService } from './utils/feishu'

interface MonitorRequest {
  action: 'add' | 'remove' | 'list'
  taskId?: string
  config?: {
    webhookUrl: string
    keywords: string[]
    frequency: number
  }
}

const monitorService = MonitoringService.getInstance()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不被允许' })
  }

  try {
    const { action, taskId, config }: MonitorRequest = req.body

    switch (action) {
      case 'add':
        if (!taskId || !config) {
          return res.status(400).json({ error: '缺少必要参数' })
        }
        
        if (!config.webhookUrl || !config.keywords || config.keywords.length === 0) {
          return res.status(400).json({ error: '配置信息不完整' })
        }

        monitorService.addMonitorTask(taskId, {
          webhookUrl: config.webhookUrl,
          keywords: config.keywords,
          frequency: config.frequency,
          lastChecked: new Date().toISOString()
        })

        res.status(200).json({ 
          success: true, 
          message: '监控任务已创建',
          taskId 
        })
        break

      case 'remove':
        if (!taskId) {
          return res.status(400).json({ error: '缺少任务ID' })
        }

        monitorService.removeMonitorTask(taskId)
        res.status(200).json({ 
          success: true, 
          message: '监控任务已移除' 
        })
        break

      case 'list':
        const tasks = monitorService.getAllTasks()
        res.status(200).json({ 
          success: true, 
          tasks 
        })
        break

      default:
        res.status(400).json({ error: '无效的操作类型' })
    }
  } catch (error) {
    console.error('监控API错误:', error)
    res.status(500).json({ 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    })
  }
}