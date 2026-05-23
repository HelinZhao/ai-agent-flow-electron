import { useState, useEffect, useMemo } from 'react'

interface CronBuilderProps {
  value: string
  onChange: (value: string) => void
  className?: string
  includeSeconds?: boolean  // 是否包含秒字段
}

type CronTabType = 'seconds' | 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export default function CronBuilder({ value, onChange, className = '', includeSeconds = false }: CronBuilderProps) {
  const [activeTab, setActiveTab] = useState<CronTabType>('daily')
  const [cronParts, setCronParts] = useState<string[]>(includeSeconds ? ['0', '0', '9', '*', '*', '*'] : ['0', '9', '*', '*', '*'])

  // 解析cron表达式
  useEffect(() => {
    const parts = value.trim().split(/\s+/)
    const expectedLength = includeSeconds ? 6 : 5
    if (parts.length === expectedLength || parts.length > 0) {
      setCronParts(parts)
    }
  }, [value, includeSeconds])

  // 根据cron表达式计算应该显示哪个选项卡
  const calculatedTab = useMemo(() => {
    const parts = value.trim().split(/\s+/)
    const expectedLength = includeSeconds ? 6 : 5
    if (parts.length !== expectedLength) return 'custom'

    // 根据字段数量确定解析方式
    let min: string, hour: string, dom: string, month: string, dow: string
    if (includeSeconds) {
      const [, minVal, hourVal, domVal, monthVal, dowVal] = parts
      min = minVal
      hour = hourVal
      dom = domVal
      month = monthVal
      dow = dowVal
    } else {
      [min, hour, dom, month, dow] = parts
    }

    // 检查是否为每5分钟模式
    if (min === '*/5' && hour === '*') return 'minutes'

    // 检查是否为每秒模式（只有当includeSeconds为true时才可能）
    if (includeSeconds) {
      const [sec] = parts
      if (sec === '*/1' || sec === '*') return 'seconds'
      if (sec.startsWith('*/') && min === '*' && hour === '*') return 'seconds'
    }

    if (min === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*') return 'hourly'
    if (min === '0' && dow === '*' && month === '*') return 'daily'
    if (min === '0' && dom === '*' && month === '*') return 'weekly'
    if (min === '0' && hour === '9' && dow === '*') return 'monthly'
    return 'custom'
  }, [value, includeSeconds])

  // 当计算出的选项卡与当前选项卡不同时更新
  useEffect(() => {
    setActiveTab(calculatedTab)
  }, [calculatedTab])

  // 更新cron表达式
  const updateCron = (newParts: string[]) => {
    setCronParts(newParts)
    onChange(newParts.join(' '))
  }

  // 选项卡配置
  const tabs = [
    { key: 'seconds' as const, label: '秒' },
    { key: 'minutes' as const, label: '分钟' },
    { key: 'hourly' as const, label: '小时' },
    { key: 'daily' as const, label: '天' },
    { key: 'weekly' as const, label: '周' },
    { key: 'monthly' as const, label: '月' },
    { key: 'custom' as const, label: '自定义' }
  ]

  // 渲染每秒配置
  const renderSecondsTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <span>每</span>
        <input
          type="number"
          min="1"
          max="59"
          value={includeSeconds ? cronParts[0].replace('*/', '') : '0'}
          onChange={(e) => {
            const interval = e.target.value || '1'
            if (includeSeconds) {
              updateCron([`*/${interval}`, '*', '*', '*', '*', '*'])
            } else {
              // 如果不支持秒，则设置每分钟的第0秒
              updateCron(['0', '*', '*', '*', '*'])
            }
          }}
          className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
        />
        <span>秒执行一次</span>
      </div>
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        适合需要极高频执行的任务
      </div>
    </div>
  )

  // 渲染每5分钟配置
  const renderMinutesTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <span>每</span>
        <input
          type="number"
          min="1"
          max="59"
          value={includeSeconds ? cronParts[1].replace('*/', '') : cronParts[0].replace('*/', '')}
          onChange={(e) => {
            const interval = e.target.value || '5'
            if (includeSeconds) {
              updateCron([cronParts[0], `*/${interval}`, '*', '*', '*', '*'])
            } else {
              updateCron([`*/${interval}`, '*', '*', '*', '*'])
            }
          }}
          className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
        />
        <span>分钟执行一次</span>
      </div>
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        适合需要频繁执行的任务
      </div>
    </div>
  )

  // 渲染每小时配置
  const renderHourlyTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <span>每小时的第</span>
        <input
          type="number"
          min="0"
          max="59"
          value={includeSeconds ? cronParts[1] : cronParts[0]}
          onChange={(e) => {
            const minute = e.target.value || '0'
            if (includeSeconds) {
              updateCron([cronParts[0], minute, '*', '*', '*', '*'])
            } else {
              updateCron([minute, '*', '*', '*', '*'])
            }
          }}
          className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
        />
        <span>分钟执行</span>
      </div>
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        例如：每小时的第0分钟（:00）或第30分钟（:30）
      </div>
    </div>
  )

  // 渲染每天配置
  const renderDailyTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <span>每天</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="23"
            value={includeSeconds ? cronParts[2] : cronParts[1]}
            onChange={(e) => {
              const hour = e.target.value || '9'
              if (includeSeconds) {
                updateCron([cronParts[0], cronParts[1], hour, '*', '*', '*'])
              } else {
                updateCron([cronParts[0], hour, '*', '*', '*'])
              }
            }}
            className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
          />
          <span className="text-gray-400">:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={includeSeconds ? cronParts[1] : cronParts[0]}
            onChange={(e) => {
              const minute = e.target.value || '0'
              if (includeSeconds) {
                updateCron([cronParts[0], minute, cronParts[2], '*', '*', '*'])
              } else {
                updateCron([minute, cronParts[1], '*', '*', '*'])
              }
            }}
            className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
          />
        </div>
        <span>执行</span>
      </div>
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        例如：每天9:00（上午9点）或18:30（下午6点半）
      </div>
    </div>
  )

  // 渲染每周配置
  const renderWeeklyTab = () => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 flex-wrap">
          <span>每周</span>
          <select
            value={includeSeconds ? cronParts[5] : cronParts[4]}
            onChange={(e) => {
              const day = e.target.value
              if (includeSeconds) {
                updateCron([cronParts[0], cronParts[1], cronParts[2], '*', '*', day])
              } else {
                updateCron([cronParts[0], cronParts[1], '*', '*', day])
              }
            }}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
          >
            {weekdays.map((day, index) => (
              <option key={index} value={index}>{day}</option>
            ))}
          </select>
          <span>的</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="23"
              value={includeSeconds ? cronParts[2] : cronParts[1]}
              onChange={(e) => {
                const hour = e.target.value || '9'
                if (includeSeconds) {
                  updateCron([cronParts[0], cronParts[1], hour, '*', '*', cronParts[5]])
                } else {
                  updateCron([cronParts[0], hour, '*', '*', cronParts[4]])
                }
              }}
              className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
            />
            <span className="text-gray-400">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={includeSeconds ? cronParts[1] : cronParts[0]}
              onChange={(e) => {
                const minute = e.target.value || '0'
                if (includeSeconds) {
                  updateCron([cronParts[0], minute, cronParts[2], '*', '*', cronParts[5]])
                } else {
                  updateCron([minute, cronParts[1], '*', '*', cronParts[4]])
                }
              }}
              className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
            />
          </div>
          <span>执行</span>
        </div>
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          例如：每周一9:00（周一早上）或每周五18:00（周五下班）
        </div>
      </div>
    )
  }

  // 渲染每月配置
  const renderMonthlyTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 flex-wrap">
        <span>每月</span>
        <input
          type="number"
          min="1"
          max="31"
          value={includeSeconds ? cronParts[3] : cronParts[2]}
          onChange={(e) => {
            const day = e.target.value || '1'
            if (includeSeconds) {
              updateCron([cronParts[0], cronParts[1], cronParts[2], day, '*', '*'])
            } else {
              updateCron([cronParts[0], cronParts[1], day, '*', '*'])
            }
          }}
          className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
        />
        <span>号的</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="23"
            value={includeSeconds ? cronParts[2] : cronParts[1]}
            onChange={(e) => {
              const hour = e.target.value || '9'
              if (includeSeconds) {
                updateCron([cronParts[0], cronParts[1], hour, cronParts[3], '*', '*'])
              } else {
                updateCron([cronParts[0], hour, cronParts[2], '*', '*'])
              }
            }}
            className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
          />
          <span className="text-gray-400">:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={includeSeconds ? cronParts[1] : cronParts[0]}
            onChange={(e) => {
              const minute = e.target.value || '0'
              if (includeSeconds) {
                updateCron([cronParts[0], minute, cronParts[2], cronParts[3], '*', '*'])
              } else {
                updateCron([minute, cronParts[1], cronParts[2], '*', '*'])
              }
            }}
            className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
          />
        </div>
        <span>执行</span>
      </div>
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        例如：每月1号9:00（月初）或每月15号18:00（月中）
      </div>
    </div>
  )

  // 渲染自定义配置
  const renderCustomTab = () => {
    const fields = includeSeconds ? [
      { key: 'second', label: '秒', range: '(0-59)', index: 0, placeholder: '0' },
      { key: 'minute', label: '分钟', range: '(0-59)', index: 1, placeholder: '0' },
      { key: 'hour', label: '小时', range: '(0-23)', index: 2, placeholder: '9' },
      { key: 'day', label: '日期', range: '(1-31)', index: 3, placeholder: '*' },
      { key: 'month', label: '月份', range: '(1-12)', index: 4, placeholder: '*' },
      { key: 'weekday', label: '星期', range: '(0-6)', index: 5, placeholder: '*' }
    ] : [
      { key: 'minute', label: '分钟', range: '(0-59)', index: 0, placeholder: '0' },
      { key: 'hour', label: '小时', range: '(0-23)', index: 1, placeholder: '9' },
      { key: 'day', label: '日期', range: '(1-31)', index: 2, placeholder: '*' },
      { key: 'month', label: '月份', range: '(1-12)', index: 3, placeholder: '*' },
      { key: 'weekday', label: '星期', range: '(0-6)', index: 4, placeholder: '*' }
    ]

    return (
      <div className="space-y-3">
        <div className="text-center">
          <div className={`grid grid-cols-${fields.length} gap-3 mb-3 max-w-md mx-auto`}>
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
                <input
                  type="text"
                  value={cronParts[field.index]}
                  onChange={(e) => {
                    const newValue = e.target.value
                    const newParts = [...cronParts]
                    newParts[field.index] = newValue
                    updateCron(newParts)
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-sm"
                  placeholder={field.placeholder}
                />
                <div className="text-xs text-gray-400 dark:text-gray-500">{field.range}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">高级模式：</span>手动输入cron表达式的{includeSeconds ? '6' : '5'}个字段
            <br/>
            <span className="text-gray-400">(0=周日, 1=周一...6=周六; *=任意; /=间隔; ,=多个值)</span>
          </div>
        </div>
      </div>
    )
  }

  // 根据当前选项卡渲染内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'seconds':
        return renderSecondsTab()
      case 'minutes':
        return renderMinutesTab()
      case 'hourly':
        return renderHourlyTab()
      case 'daily':
        return renderDailyTab()
      case 'weekly':
        return renderWeeklyTab()
      case 'monthly':
        return renderMonthlyTab()
      case 'custom':
        return renderCustomTab()
      default:
        return renderDailyTab()
    }
  }

  return (
    <div className={`${className}`}>
      {/* 选项卡 */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 选项卡内容 */}
      <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/50">
        {renderTabContent()}
      </div>

      {/* 当前cron表达式预览 */}
      <div className="text-center mt-3">
        <div className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-mono rounded px-4 py-1.5">
          {cronParts.join(' ')}  
        </div>
      </div>
    </div>
  )
}