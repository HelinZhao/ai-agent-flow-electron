import React, { useCallback, useState } from 'react'
import CustomSelect from '../../ui/CustomSelect'
import CustomInput from '../../ui/CustomInput'
import ExpressionInput from '../ExpressionInput'
import TemplatePickerModal from '../TemplatePickerModal'

interface DatabaseConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const DB_TYPES = [
  { value: 'sqlite', label: 'SQLite' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mssql', label: 'SQL Server' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
]

const MONGO_OPS = [
  { value: 'find', label: 'find (查询)' },
  { value: 'findOne', label: 'findOne (单条)' },
  { value: 'aggregate', label: 'aggregate (聚合)' },
  { value: 'count', label: 'count (计数)' },
  { value: 'insertOne', label: 'insertOne (插入)' },
  { value: 'updateOne', label: 'updateOne (更新)' },
  { value: 'deleteOne', label: 'deleteOne (删除)' },
]

const CONFIG_META: Record<string, { placeholder: string; hint: string; label: string }> = {
  sqlite: { placeholder: '{"path":"/data/mydb.db"} 或 {"path":":memory:"}', hint: 'SQLite 文件路径 JSON，支持 {{$env.DB_PATH}}', label: '连接配置' },
  postgres: { placeholder: '{"connectionString":"postgresql://user:pass@host:5432/db"}', hint: 'PostgreSQL 连接串 JSON，支持 {{$env.PG_URL}}', label: '连接配置' },
  mysql: { placeholder: '{"connectionString":"mysql://user:pass@host:3306/db"}', hint: 'MySQL 连接串 JSON，支持 {{$env.MYSQL_URL}}', label: '连接配置' },
  mssql: { placeholder: '{"connectionString":"mssql://user:pass@host:1433/db"}', hint: 'SQL Server 连接串 JSON，支持 {{$env.MSSQL_URL}}', label: '连接配置' },
  mongodb: { placeholder: '{{$env.MONGO_URI}} 或 mongodb://...', hint: 'JSON 格式，如 {"uri":"mongodb://...","database":"mydb"}', label: '连接 URI' },
  redis: { placeholder: '{"url":"redis://:password@localhost:6379"} 或 redis://localhost:6379', hint: 'Redis 连接串，支持 {{$env.REDIS_URL}}', label: '连接配置' },
}

function detectDbTypeFromConfig(config: string): string | null {
  if (!config) return null
  const lower = config.toLowerCase()
  if (lower.includes('postgresql://') || lower.includes('postgres://')) return 'postgres'
  if (lower.includes('mysql://')) return 'mysql'
  if (lower.includes('mssql://') || lower.includes('sqlserver://')) return 'mssql'
  if (lower.includes('mongodb://') || lower.includes('mongodb+srv://')) return 'mongodb'
  if (lower.includes('redis://') || lower.includes('rediss://')) return 'redis'
  if (lower.includes('.db') || lower.includes('"path"') || lower.includes('sqlite')) return 'sqlite'
  return null
}

const DatabaseConfig: React.FC<DatabaseConfigProps> = ({ config, onConfigChange }) => {
  const [showPicker, setShowPicker] = useState(false)
  const dbType = config.dbType || 'sqlite'
  const mode = config.mode || 'query'
  const meta = CONFIG_META[dbType] || CONFIG_META.sqlite

  const CommandLabel = useCallback(({ label }: { label: string }) => (
    <div className="flex justify-between items-center mb-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <button onClick={() => setShowPicker(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
        + 从模板导入
      </button>
    </div>
  ), [])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">数据库类型</label>
        <CustomSelect
          size="sm"
          value={dbType}
          onChange={(v) => onConfigChange({ ...config, dbType: v })}
          options={DB_TYPES}
        />
      </div>

      {dbType === 'mongodb' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">连接 URI</label>
            <ExpressionInput
              value={config.connectionConfig || ''}
              onChange={(v) => onConfigChange({ ...config, connectionConfig: v })}
              placeholder={meta.placeholder}
              size="sm"
              minHeight="36px"
            />
            <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">操作类型</label>
            <CustomSelect
              size="sm"
              value={config.operation || 'find'}
              onChange={(v) => onConfigChange({ ...config, operation: v })}
              options={MONGO_OPS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">集合名称</label>
            <CustomInput size="sm" value={config.collection || ''} onChange={e => onConfigChange({ ...config, collection: e.target.value })} placeholder="users" />
          </div>
          <div>
            <CommandLabel label='查询条件' />
            <ExpressionInput
              value={config.query || ''}
              onChange={(v) => onConfigChange({ ...config, query: v })}
              placeholder='{"name": "{{$input}}"}'
              size="sm"
              minHeight="60px"
            />
            <p className="text-xs text-gray-400 mt-1">JSON 格式的查询条件，支持模板变量</p>
          </div>
        </>
      ) : dbType === 'redis' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{meta.label}</label>
            <ExpressionInput value={config.connectionConfig || ''} onChange={(v) => onConfigChange({ ...config, connectionConfig: v })} placeholder={meta.placeholder} size="sm" minHeight="36px" />
            <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>
          </div>
          <div>
            <CommandLabel label='Redis 命令' />
            <ExpressionInput value={config.sql || ''} onChange={(v) => onConfigChange({ ...config, sql: v })} placeholder="GET key 或 SET key value" size="sm" minHeight="60px" />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{meta.label}</label>
            <ExpressionInput
              value={config.connectionConfig || ''}
              onChange={(v) => onConfigChange({ ...config, connectionConfig: v })}
              placeholder={meta.placeholder}
              size="sm"
              minHeight="56px"
            />
            <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>
          </div>
          <div>
            <CommandLabel label='SQL 语句' />
            <ExpressionInput
              value={config.sql || ''}
              onChange={(v) => onConfigChange({ ...config, sql: v })}
              placeholder="SELECT * FROM users WHERE id = {{$input}}"
              size="sm"
              minHeight="60px"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">执行模式</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => onConfigChange({ ...config, mode: 'query' })}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${mode === 'query' ? 'bg-violet-500 text-white border-violet-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
            查询 (SELECT)
          </button>
          <button type="button" onClick={() => onConfigChange({ ...config, mode: 'execute' })}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${mode === 'execute' ? 'bg-violet-500 text-white border-violet-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
            执行 (INSERT/UPDATE/DELETE)
          </button>
        </div>
      </div>

      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2.5 text-xs text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50">
        查询结果将以 JSON 格式传递给下游节点。SQLite 默认使用内存数据库，需指定文件路径。
      </div>

      <TemplatePickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        type="sql"
        onSelect={(t) => {
          try {
            const content = JSON.parse(t.content)
            const command = content.command || ''
            const updates: Record<string, any> = {}
            if (t.type === 'sql' && content.dbType === 'mongodb') {
              updates.query = command
            } else {
              updates.sql = command
            }
            if (content.dbType) updates.dbType = content.dbType
            if (content.connectionConfig && detectDbTypeFromConfig(config.connectionConfig) !== content.dbType) updates.connectionConfig = content.connectionConfig
            onConfigChange({ ...config, ...updates })
          } catch { }
        }}
      />
    </div>
  )
}

export default DatabaseConfig