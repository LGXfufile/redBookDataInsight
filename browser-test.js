// 浏览器控制台测试代码 - 复制粘贴到开发者工具Console中运行
console.clear();
console.log('🌐 浏览器端API测试开始...');

// 测试真实的axios请求
async function testRealAxiosRequest() {
  try {
    console.log('📡 发送真实API请求...');
    
    const response = await axios.post('/api/analyze', {
      keywords: ['副业'],
      monitorEnabled: false,
      notifyFrequency: 6,
      useRealData: false
    });
    
    console.log('✅ API调用成功:', response.data);
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log('❌ API调用失败:', error);
    console.log('错误类型:', error.constructor.name);
    console.log('错误状态:', error.response?.status);
    console.log('错误消息:', error.message);
    
    return { success: false, error: error };
  }
}

// 测试fallback数据生成
function testFallbackGeneration() {
  console.log('🔄 测试fallback数据生成...');
  
  // 这里放入完整的generateFallbackData函数
  const generateFallbackData = function(keyword) {
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
      }
    };

    const selectedTemplate = templates[keyword] || templates['副业'];
    
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
    };
  };
  
  const fallbackData = generateFallbackData('副业');
  console.log('✅ Fallback数据生成成功:');
  console.log('  - 总帖子数:', fallbackData.totalPosts);
  console.log('  - 痛点数量:', fallbackData.painPoints.length);
  console.log('  - 数据源:', fallbackData.dataSource);
  
  return fallbackData;
}

// 完整流程测试
async function fullFlowTest() {
  console.log('\n🔄 开始完整流程测试...');
  
  const apiResult = await testRealAxiosRequest();
  
  if (!apiResult.success) {
    console.log('🔄 API失败，测试fallback...');
    const fallbackData = testFallbackGeneration();
    
    // 模拟ElementUI消息提示
    console.log('💬 应该显示消息: "网络异常，已切换到演示数据模式"');
    
    return fallbackData;
  }
  
  return apiResult.data;
}

// 运行完整测试
fullFlowTest().then(result => {
  console.log('\n🎉 测试完成！最终结果:');
  console.log('数据源:', result.dataSource);
  console.log('痛点数量:', result.painPoints?.length);
  console.log('\n💡 结论: 如果用户没看到分析结果，可能是页面渲染问题，而非数据问题');
});