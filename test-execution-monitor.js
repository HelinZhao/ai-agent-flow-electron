/**
 * 工作流执行监控功能测试脚本
 * 用于验证执行进度监控和实时反馈功能
 */

const axios = require('axios')

const API_BASE_URL = 'http://localhost:3000/api'

// 测试用的简单工作流
const testWorkflow = {
  id: 'test-workflow-1',
  name: '测试工作流',
  description: '用于测试执行监控功能的工作流',
  nodes: [
    {
      id: 'start-node',
      type: 'start',
      position: { x: 100, y: 100 },
      data: { label: '开始' }
    },
    {
      id: 'llm-node',
      type: 'llm',
      position: { x: 300, y: 100 },
      data: {
        label: 'LLM处理',
        config: {
          prompt: '请分析以下内容并给出建议',
          variables: []
        }
      }
    },
    {
      id: 'end-node',
      type: 'end',
      position: { x: 500, y: 100 },
      data: { label: '结束' }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'start-node',
      target: 'llm-node'
    },
    {
      id: 'edge-2',
      source: 'llm-node',
      target: 'end-node'
    }
  ]
}

async function testWorkflowExecutionMonitoring() {
  console.log('🚀 开始测试工作流执行监控功能...\n')

  try {
    // 1. 测试开始执行
    console.log('1️⃣ 测试开始执行工作流...')
    const startResponse = await axios.post(`${API_BASE_URL}/execute-workflow/monitor`, {
      workflow: testWorkflow,
      input: '这是一个测试输入，请帮我分析当前的市场趋势。',
      agentId: null,
      threadId: 'test-thread-1'
    })

    const executionId = startResponse.data.executionId
    console.log(`✅ 执行已开始，Execution ID: ${executionId}\n`)

    // 2. 测试获取执行进度
    console.log('2️⃣ 测试获取执行进度...')
    let progress = null
    let attempts = 0
    const maxAttempts = 30 // 最多等待15秒

    while (attempts < maxAttempts) {
      try {
        const progressResponse = await axios.get(
          `${API_BASE_URL}/execute-workflow/progress/${executionId}`
        )
        progress = progressResponse.data

        console.log(`📊 进度更新 (${attempts + 1}/${maxAttempts}):`)
        console.log(`   状态: ${progress.metrics.status}`)
        console.log(`   进度: ${progress.metrics.progress}%`)
        console.log(
          `   已完成节点: ${progress.metrics.completedNodes}/${progress.metrics.totalNodes}`
        )
        console.log(`   当前节点: ${progress.currentNodeLabel || '无'}`)
        console.log(`   执行路径: ${progress.executionPath.join(' → ') || '无'}\n`)

        // 如果执行完成或失败，退出循环
        if (progress.metrics.status === 'completed' || progress.metrics.status === 'failed') {
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
        attempts++
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('⏳ 执行记录尚未就绪，等待中...')
          await new Promise((resolve) => setTimeout(resolve, 500))
          attempts++
        } else {
          throw error
        }
      }
    }

    if (attempts >= maxAttempts) {
      console.log('⚠️  执行超时，尝试停止执行...')
      try {
        await axios.post(`${API_BASE_URL}/execute-workflow/stop/${executionId}`)
        console.log('✅ 执行已停止')
      } catch (stopError) {
        console.log('❌ 停止执行失败:', stopError.message)
      }
    }

    // 3. 测试最终执行结果
    console.log('3️⃣ 测试最终执行结果...')
    if (progress) {
      console.log('✅ 执行完成！')
      console.log(`   最终状态: ${progress.metrics.status}`)
      console.log(
        `   总耗时: ${progress.metrics.duration ? `${progress.metrics.duration}ms` : '未知'}`
      )
      console.log(`   节点执行结果数量: ${progress.nodeResults.length}`)
      console.log(`   执行日志数量: ${progress.logs.length}`)

      // 显示节点执行详情
      console.log('\n📋 节点执行详情:')
      progress.nodeResults.forEach((node, index) => {
        console.log(`   ${index + 1}. ${node.metadata?.label || node.nodeId} (${node.nodeType})`)
        console.log(`      状态: ${node.status}`)
        console.log(`      耗时: ${node.duration ? `${node.duration}ms` : '未知'}`)
        if (node.error) {
          console.log(`      错误: ${node.error}`)
        }
      })

      // 显示执行日志
      console.log('\n📝 执行日志:')
      progress.logs.slice(-10).forEach((log, index) => {
        // 只显示最后10条日志
        const time = new Date(log.timestamp).toLocaleTimeString()
        console.log(`   [${time}] ${log.level.toUpperCase()}: ${log.message}`)
      })
    }

    // 4. 测试控制功能
    console.log('\n4️⃣ 测试执行控制功能...')

    // 创建一个新的执行来测试控制功能
    const controlTestResponse = await axios.post(`${API_BASE_URL}/execute-workflow/monitor`, {
      workflow: testWorkflow,
      input: '测试控制功能的输入',
      agentId: null,
      threadId: 'test-control-thread'
    })

    const controlExecutionId = controlTestResponse.data.executionId
    console.log(`✅ 控制测试执行已开始，ID: ${controlExecutionId}`)

    // 等待一下让执行开始
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 测试暂停
    try {
      await axios.post(`${API_BASE_URL}/execute-workflow/pause/${controlExecutionId}`)
      console.log('✅ 执行已暂停')

      // 等待一下
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 测试恢复
      await axios.post(`${API_BASE_URL}/execute-workflow/resume/${controlExecutionId}`)
      console.log('✅ 执行已恢复')

      // 测试停止
      await axios.post(`${API_BASE_URL}/execute-workflow/stop/${controlExecutionId}`)
      console.log('✅ 执行已停止')
    } catch (controlError) {
      console.log('⚠️  控制功能测试失败:', controlError.message)
    }

    console.log('\n🎉 所有测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (error.response) {
      console.error('响应数据:', error.response.data)
      console.error('响应状态:', error.response.status)
    }
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  testWorkflowExecutionMonitoring()
    .then(() => {
      console.log('\n✅ 测试脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ 测试脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { testWorkflowExecutionMonitoring, testWorkflow }
