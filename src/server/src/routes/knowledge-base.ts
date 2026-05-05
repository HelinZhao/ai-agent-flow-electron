import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { KnowledgeBaseModel } from '../models'
import { LLMConfigModel } from '../models'
import { getDataDir } from '../utils/file'
import { ingestDocument, deleteDocumentChunks, deleteAllChunks, getDocumentStats, retrieveContext } from '../utils/knowledge'

// 提供商 → 默认 embedding 模型名
const PROVIDER_EMBEDDING_MODEL: Record<string, string> = {
  openai: 'text-embedding-3-small',
  bailian: 'text-embedding-v3',
  longcat: 'text-embedding-3-small',
  anthropic: 'text-embedding-3-small',
  azure: 'text-embedding-3-small',
}

// 确保 uploads 目录存在
const uploadsDir = getDataDir('/uploads')
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {})

const router = Router()

// 文件上传配置
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir)
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`)
    }
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.txt', '.md'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`暂不支持 ${ext} 格式的文件，仅支持 txt/md`))
    }
  }
})

// 获取所有知识库
router.get('/', async (_req, res) => {
  try {
    const knowledgeBases = await KnowledgeBaseModel.findAll({
      order: [['updatedAt', 'DESC']]
    })

    // 为每个知识库附加文档统计
    const result = await Promise.all(knowledgeBases.map(async (kb) => {
      const stats = await getDocumentStats(kb.id)
      return { ...kb.toJSON(), documentCount: stats.documents.length, totalChunks: stats.totalChunks }
    }))

    return res.status(200).json(result)
  } catch (error) {
    console.error('获取知识库列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建知识库
router.post('/', async (req, res) => {
  try {
    const { name, description, type, chunkSize, chunkOverlap, topK, apiUrl, apiKey } = req.body

    if (!name) {
      return res.status(400).json({ error: '知识库名称不能为空' })
    }

    if (type === 'external' && !apiUrl) {
      return res.status(400).json({ error: '外部知识库必须提供 API 地址' })
    }

    // 根据当前活跃 LLM 提供商自动设置 embedding 模型
    const activeConfig = await LLMConfigModel.findOne({ where: { isActive: true } })
    const embeddingModel = activeConfig
      ? (PROVIDER_EMBEDDING_MODEL[activeConfig.provider] || 'text-embedding-3-small')
      : 'text-embedding-3-small'

    const kb = await KnowledgeBaseModel.create({
      name,
      description: description || '',
      type: type || 'internal',
      embeddingModel,
      chunkSize: chunkSize || 500,
      chunkOverlap: chunkOverlap || 50,
      topK: topK || 3,
      apiUrl: apiUrl || '',
      apiKey: apiKey || ''
    })

    return res.status(201).json(kb)
  } catch (error) {
    console.error('创建知识库错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新知识库
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    const { name, description, type, embeddingModel, chunkSize, chunkOverlap, topK, apiUrl, apiKey } = req.body

    await kb.update({
      name,
      description,
      type,
      embeddingModel,
      chunkSize,
      chunkOverlap,
      topK,
      apiUrl,
      apiKey
    })

    return res.status(200).json(kb)
  } catch (error) {
    console.error('更新知识库错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 删除知识库
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    // 删除所有分块及向量
    await deleteAllChunks(id)
    await kb.destroy()

    return res.status(200).json({ message: '知识库删除成功' })
  } catch (error) {
    console.error('删除知识库错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 上传文档到内部知识库
router.post('/:id/documents', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params
    const kb = await KnowledgeBaseModel.findByPk(id as string)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    if (kb.type !== 'internal') {
      return res.status(400).json({ error: '仅内部知识库支持上传文档' })
    }

    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' })
    }

    const chunkCount = await ingestDocument(id as string, req.file.path, req.file.originalname)

    // 处理完成后删除临时上传文件
    try { await fs.unlink(req.file.path) } catch {}

    return res.status(200).json({ message: '文档处理成功', chunkCount })
  } catch (error) {
    console.error('上传文档错误:', error)
    return res.status(500).json({ error: `文档处理失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

// 删除知识库中的某文档
router.delete('/:id/documents/:docName', async (req, res) => {
  try {
    const { id, docName } = req.params
    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    await deleteDocumentChunks(id, docName)

    return res.status(200).json({ message: '文档删除成功' })
  } catch (error) {
    console.error('删除文档错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 检索接口
router.post('/:id/retrieve', async (req, res) => {
  try {
    const { id } = req.params
    const { query } = req.body

    if (!query) {
      return res.status(400).json({ error: '查询内容不能为空' })
    }

    const context = await retrieveContext(id, query)

    return res.status(200).json({ context })
  } catch (error) {
    console.error('检索错误:', error)
    return res.status(500).json({ error: `检索失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

// 获取知识库文档统计
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params
    const stats = await getDocumentStats(id)
    return res.status(200).json(stats)
  } catch (error) {
    console.error('获取统计错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router