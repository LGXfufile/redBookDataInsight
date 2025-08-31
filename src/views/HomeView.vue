<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { provide } from 'vue'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

provide(THEME_KEY, 'light')

interface AnalysisResult {
  keyword: string
  totalPosts: number
  painPoints: Array<{
    content: string
    frequency: number
    sentiment: number
    businessValue: number
  }>
  trends: Array<{
    date: string
    count: number
  }>
  userProfiles: {
    ageDistribution: Record<string, number>
    locationDistribution: Record<string, number>
  }
}

const keyword = ref('')
const loading = ref(false)
const analysisResult = ref<AnalysisResult | null>(null)
const activeTab = ref('painpoints')
const form = reactive({
  keywords: ['副业'],
  monitorEnabled: false,
  notifyFrequency: 6,
  useRealData: false // 新增：是否使用真实数据
})

const addKeyword = () => {
  if (form.keywords.length < 10) {
    form.keywords.push('')
  } else {
    ElMessage.warning('最多支持10个关键词')
  }
}

const removeKeyword = (index: number) => {
  if (form.keywords.length > 1) {
    form.keywords.splice(index, 1)
  }
}

const analyzeKeywords = async () => {
  const validKeywords = form.keywords.filter(k => k.trim())
  if (validKeywords.length === 0) {
    ElMessage.error('请输入至少一个关键词')
    return
  }

  loading.value = true
  
  // 显示不同的加载信息
  const loadingMessage = form.useRealData ? '正在爬取小红书真实数据...' : '正在生成演示数据...'
  ElMessage.info(loadingMessage)

  try {
    const response = await axios.post('/api/analyze', {
      keywords: validKeywords,
      monitorEnabled: form.monitorEnabled,
      notifyFrequency: form.notifyFrequency,
      useRealData: form.useRealData
    })
    
    analysisResult.value = response.data
    
    // 根据数据源显示不同消息
    const successMessage = response.data.dataSource === 'real' 
      ? `✅ 真实数据分析完成！爬取了 ${response.data.totalPosts} 个帖子` 
      : `✅ 演示数据分析完成！(基于 ${validKeywords[0]} 的增强模拟数据)`
    
    ElMessage.success(successMessage)
    
    if (response.data.scrapingStats) {
      console.log('爬取统计:', response.data.scrapingStats)
    }
    
  } catch (error) {
    console.log('API调用失败，使用增强模拟数据', error)
    
    // 关闭之前的loading消息
    ElMessage.closeAll()
    
    // 显示更明显的降级提示
    ElMessage({
      message: '🔄 API连接失败，正在使用本地演示数据...',
      type: 'warning',
      duration: 2000
    })
    
    // 稍微延迟一下，让用户看到提示
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 降级到增强模拟数据
    analysisResult.value = generateFallbackData(validKeywords[0])
    
    // 显示成功消息
    ElMessage({
      message: `✅ 演示数据分析完成！(基于 ${validKeywords[0]} 的增强模拟数据)`,
      type: 'success',
      duration: 3000
    })
    
    console.log('演示数据已生成:', analysisResult.value)
    
  } finally {
    loading.value = false
  }
}

// 降级数据生成函数
function generateFallbackData(keyword: string) {
  const templates = {
    '副业': {
      painPoints: [
        { content: '收入微薄难以维持', frequency: 28, sentiment: 82, businessValue: 95 },
        { content: '投入时间过多影响主业', frequency: 24, sentiment: 75, businessValue: 88 },
        { content: '市场竞争激烈难突围', frequency: 22, sentiment: 78, businessValue: 85 },
        { content: '启动资金需求高', frequency: 19, sentiment: 70, businessValue: 82 },
        { content: '缺乏专业技能指导', frequency: 17, sentiment: 68, businessValue: 78 },
        { content: '客户获取成本过高', frequency: 15, sentiment: 72, businessValue: 75 },
        { content: '项目风险评估困难', frequency: 13, sentiment: 65, businessValue: 70 },
        { content: '时间管理难以平衡', frequency: 11, sentiment: 62, businessValue: 68 }
      ]
    },
    '需求挖掘': {
      painPoints: [
        { content: '用户真实需求难以识别', frequency: 26, sentiment: 85, businessValue: 92 },
        { content: '市场调研成本过高', frequency: 23, sentiment: 78, businessValue: 89 },
        { content: '数据分析工具门槛高', frequency: 21, sentiment: 75, businessValue: 86 },
        { content: '用户访谈质量不稳定', frequency: 18, sentiment: 72, businessValue: 80 },
        { content: '需求变化速度过快', frequency: 16, sentiment: 70, businessValue: 77 },
        { content: '跨部门协作效率低', frequency: 14, sentiment: 68, businessValue: 73 },
        { content: '竞品分析信息获取难', frequency: 12, sentiment: 65, businessValue: 70 },
        { content: '需求优先级判断困难', frequency: 10, sentiment: 62, businessValue: 65 }
      ]
    },
    '海外产品': {
      painPoints: [
        { content: '物流成本侵蚀利润', frequency: 32, sentiment: 88, businessValue: 94 },
        { content: '质量标准差异大', frequency: 27, sentiment: 82, businessValue: 90 },
        { content: '海关清关程序复杂', frequency: 25, sentiment: 80, businessValue: 87 },
        { content: '汇率波动风险高', frequency: 22, sentiment: 76, businessValue: 83 },
        { content: '语言沟通障碍严重', frequency: 20, sentiment: 74, businessValue: 79 },
        { content: '退货处理成本高', frequency: 18, sentiment: 72, businessValue: 76 },
        { content: '合规认证周期长', frequency: 15, sentiment: 69, businessValue: 72 },
        { content: '文化差异适配困难', frequency: 13, sentiment: 66, businessValue: 68 }
      ]
    }
  }

  const selectedTemplate = templates[keyword as keyof typeof templates] || templates['副业']
  
  return {
    keyword,
    totalPosts: Math.floor(Math.random() * 50) + 100,
    painPoints: selectedTemplate.painPoints,
    trends: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 30) + 40
    })),
    userProfiles: {
      ageDistribution: {
        '18-25': Math.floor(Math.random() * 20) + 25,
        '26-35': Math.floor(Math.random() * 25) + 40,
        '36-45': Math.floor(Math.random() * 15) + 20,
        '46+': Math.floor(Math.random() * 10) + 10
      },
      locationDistribution: {
        '北京': Math.floor(Math.random() * 10) + 18,
        '上海': Math.floor(Math.random() * 10) + 16,
        '广州': Math.floor(Math.random() * 8) + 12,
        '深圳': Math.floor(Math.random() * 8) + 14,
        '杭州': Math.floor(Math.random() * 6) + 8,
        '其他': Math.floor(Math.random() * 15) + 25
      }
    },
    dataSource: 'mock'
  }
}

// 图表配置
const trendChartOption = computed(() => {
  if (!analysisResult.value) return {}
  
  return {
    title: {
      text: '趋势分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: analysisResult.value.trends.map(t => t.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: analysisResult.value.trends.map(t => t.count),
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#667eea'
      },
      areaStyle: {
        color: 'rgba(102, 126, 234, 0.3)'
      }
    }]
  }
})

const painPointChartOption = computed(() => {
  if (!analysisResult.value) return {}
  
  const top10PainPoints = analysisResult.value.painPoints.slice(0, 10)
  
  return {
    title: {
      text: '痛点分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: top10PainPoints.map(p => p.content.length > 10 ? p.content.slice(0, 10) + '...' : p.content)
    },
    series: [{
      name: '商业价值',
      type: 'bar',
      data: top10PainPoints.map(p => p.businessValue),
      itemStyle: {
        color: function(params: any) {
          const value = params.value
          if (value > 70) return '#f56c6c'
          if (value > 40) return '#e6a23c'
          return '#67c23a'
        }
      }
    }]
  }
})

const userProfileChartOption = computed(() => {
  if (!analysisResult.value) return {}
  
  return {
    title: {
      text: '用户画像',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      name: '年龄分布',
      type: 'pie',
      radius: '50%',
      data: Object.entries(analysisResult.value.userProfiles.ageDistribution).map(([age, count]) => ({
        value: count,
        name: age
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
})
</script>

<template>
  <div class="home-container">
    <el-card class="main-card">
      <div class="input-section">
        <h2>关键词分析</h2>
        <p class="description">输入您想要分析的关键词，发现小红书用户的真实痛点和商业机会</p>
        
        <el-form :model="form" label-width="120px">
          <el-form-item label="关键词">
            <div v-for="(keyword, index) in form.keywords" :key="index" class="keyword-input">
              <el-select
                v-model="form.keywords[index]"
                filterable
                allow-create
                placeholder="请选择或输入关键词"
                style="width: 300px; margin-right: 10px"
              >
                <el-option label="副业" value="副业" />
                <el-option label="需求挖掘" value="需求挖掘" />
                <el-option label="海外产品" value="海外产品" />
                <el-option label="跨境电商" value="跨境电商" />
                <el-option label="内容创作" value="内容创作" />
                <el-option label="社群运营" value="社群运营" />
              </el-select>
              <el-button 
                v-if="form.keywords.length > 1" 
                @click="removeKeyword(index)"
                type="danger"
                size="small"
                :icon="'Delete'"
              />
            </div>
            <el-button 
              @click="addKeyword" 
              type="primary" 
              plain 
              size="small" 
              :icon="'Plus'"
              style="margin-top: 10px"
            >
              添加关键词
            </el-button>
          </el-form-item>

          <el-form-item label="数据模式">
            <el-radio-group v-model="form.useRealData">
              <el-radio :value="false">
                <span>演示模式</span>
                <el-text type="info" size="small" style="margin-left: 8px;">快速体验，基于真实场景的模拟数据</el-text>
              </el-radio>
              <el-radio :value="true">
                <span>真实数据</span>
                <el-text type="warning" size="small" style="margin-left: 8px;">爬取小红书真实数据，需要3-5分钟</el-text>
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="定时监控">
            <el-switch v-model="form.monitorEnabled" />
            <span class="form-help">开启后将定期检测新的用户反馈</span>
          </el-form-item>

          <el-form-item v-if="form.monitorEnabled" label="监控频率">
            <el-select v-model="form.notifyFrequency" style="width: 200px">
              <el-option label="每2小时" :value="2" />
              <el-option label="每6小时" :value="6" />
              <el-option label="每12小时" :value="12" />
              <el-option label="每24小时" :value="24" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button 
              type="primary" 
              @click="analyzeKeywords"
              :loading="loading"
              size="large"
            >
              {{ loading ? (form.useRealData ? '爬取分析中...' : '生成中...') : '开始分析' }}
            </el-button>
            
            <el-text v-if="form.useRealData" type="warning" size="small" style="margin-left: 15px;">
              💡 真实数据模式将打开浏览器进行数据爬取，请保持网络畅通
            </el-text>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-card v-if="analysisResult" class="result-card" style="margin-top: 20px">
      <h3>分析结果</h3>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-statistic title="总帖子数" :value="analysisResult.totalPosts" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="发现痛点" :value="analysisResult.painPoints.length" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="商业机会" :value="analysisResult.painPoints.filter(p => p.businessValue > 70).length" />
        </el-col>
      </el-row>

      <el-divider />

      <!-- 数据可视化图表 -->
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="痛点分析" name="painpoints">
          <el-row :gutter="20">
            <el-col :span="16">
              <VChart :option="painPointChartOption" style="height: 400px;" />
            </el-col>
            <el-col :span="8">
              <h4>主要痛点详情</h4>
              <el-table :data="analysisResult.painPoints.slice(0, 5)" style="width: 100%" size="small">
                <el-table-column prop="content" label="痛点内容" show-overflow-tooltip />
                <el-table-column prop="businessValue" label="价值" width="80">
                  <template #default="scope">
                    <el-tag 
                      :type="scope.row.businessValue > 70 ? 'danger' : scope.row.businessValue > 40 ? 'warning' : 'success'"
                      size="small"
                    >
                      {{ scope.row.businessValue }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="趋势分析" name="trends">
          <VChart :option="trendChartOption" style="height: 400px;" />
        </el-tab-pane>

        <el-tab-pane label="用户画像" name="userprofile">
          <el-row :gutter="20">
            <el-col :span="12">
              <VChart :option="userProfileChartOption" style="height: 400px;" />
            </el-col>
            <el-col :span="12">
              <h4>地域分布</h4>
              <el-table :data="Object.entries(analysisResult.userProfiles.locationDistribution).map(([location, count]) => ({ location, count }))" style="width: 100%" size="small">
                <el-table-column prop="location" label="地区" />
                <el-table-column prop="count" label="用户数" />
                <el-table-column label="占比" width="100">
                  <template #default="scope">
                    {{ ((scope.row.count / Object.values(analysisResult!.userProfiles.locationDistribution).reduce((a, b) => a + b, 0)) * 100).toFixed(1) }}%
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="详细表格" name="table">
          <el-table :data="analysisResult.painPoints" style="width: 100%">
            <el-table-column prop="content" label="痛点内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="frequency" label="提及频次" width="100" sortable />
            <el-table-column prop="sentiment" label="情感强度" width="120" sortable>
              <template #default="scope">
                <el-progress 
                  :percentage="scope.row.sentiment" 
                  :color="scope.row.sentiment > 70 ? '#f56c6c' : scope.row.sentiment > 40 ? '#e6a23c' : '#67c23a'"
                  :show-text="false"
                />
                <span style="margin-left: 10px; font-size: 12px;">{{ scope.row.sentiment.toFixed(1) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="businessValue" label="商业价值" width="120" sortable>
              <template #default="scope">
                <el-tag 
                  :type="scope.row.businessValue > 70 ? 'danger' : scope.row.businessValue > 40 ? 'warning' : 'success'"
                >
                  {{ scope.row.businessValue }}分
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <div class="feature-cards" v-if="!analysisResult">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>精准痛点挖掘</h3>
            <p>AI智能分析用户评论，识别高频痛点和情感强度</p>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>商业价值评估</h3>
            <p>基于市场需求和竞争情况，量化每个痛点的商业价值</p>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="feature-card">
            <div class="feature-icon">🔔</div>
            <h3>实时监控通知</h3>
            <p>定时监控新增内容，第一时间发现市场机会</p>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.input-section h2 {
  color: #333;
  margin-bottom: 8px;
}

.description {
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
}

.keyword-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.form-help {
  margin-left: 10px;
  color: #999;
  font-size: 12px;
}

.result-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feature-cards {
  margin-top: 40px;
}

.feature-card {
  text-align: center;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  margin-bottom: 12px;
  color: white;
}

.feature-card p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}
</style>
