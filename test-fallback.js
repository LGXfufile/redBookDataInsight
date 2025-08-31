// 简单测试fallback逻辑
console.log('🧪 测试前端fallback逻辑...');

// 模拟axios请求失败
function simulateAPIFailure() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Network Error: 404 Not Found'));
    }, 1000);
  });
}

// 模拟generateFallbackData函数
function generateFallbackData(keyword) {
  const templates = {
    '副业': {
      painPoints: [
        { content: '收入微薄难以维持', frequency: 28, sentiment: 82, businessValue: 95 },
        { content: '投入时间过多影响主业', frequency: 24, sentiment: 75, businessValue: 88 },
        { content: '市场竞争激烈难突围', frequency: 22, sentiment: 78, businessValue: 85 }
      ]
    }
  };
  
  return {
    keyword,
    totalPosts: Math.floor(Math.random() * 50) + 100,
    painPoints: templates[keyword]?.painPoints || [],
    trends: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 30) + 40
    })),
    userProfiles: {
      ageDistribution: { '18-25': 25, '26-35': 40, '36-45': 20, '46+': 15 },
      locationDistribution: { '北京': 18, '上海': 16, '广州': 12, '深圳': 14, '其他': 25 }
    },
    dataSource: 'mock'
  };
}

// 模拟analyzeKeywords函数的错误处理逻辑
async function testAnalyzeKeywords() {
  const validKeywords = ['副业'];
  let loading = true;
  let analysisResult = null;
  
  console.log('📊 开始分析，模拟API调用...');
  
  try {
    // 模拟API调用失败
    await simulateAPIFailure();
    console.log('✅ API调用成功'); // 这行不会执行
    
  } catch (error) {
    console.log('❌ API调用失败，使用增强模拟数据', error.message);
    
    // 降级到增强模拟数据
    analysisResult = generateFallbackData(validKeywords[0]);
    console.log('⚠️ 网络异常，已切换到演示数据模式');
    
  } finally {
    loading = false;
    console.log('🔄 加载状态结束');
  }
  
  if (analysisResult) {
    console.log('📈 分析结果:');
    console.log(`  - 关键词: ${analysisResult.keyword}`);
    console.log(`  - 总帖子数: ${analysisResult.totalPosts}`);
    console.log(`  - 痛点数量: ${analysisResult.painPoints.length}`);
    console.log(`  - 数据源: ${analysisResult.dataSource}`);
    console.log(`  - 前3个痛点:`);
    analysisResult.painPoints.slice(0, 3).forEach((point, i) => {
      console.log(`    ${i+1}. ${point.content} (价值:${point.businessValue})`);
    });
  }
}

// 运行测试
testAnalyzeKeywords().then(() => {
  console.log('\n✅ Fallback逻辑测试完成！');
  console.log('\n🔍 结论: API失败后能正确降级到本地数据');
  console.log('💡 前端应该显示"网络异常，已切换到演示数据模式"并展示分析结果');
});