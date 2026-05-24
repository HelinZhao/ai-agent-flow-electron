import { Router } from 'express'
import { Op } from 'sequelize'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { KnowledgeBaseModel } from '../models'
import { getUserDataDir } from '../utils/file'
import { ingestDocument, deleteDocumentChunks, deleteAllChunks, getDocumentStats, retrieveContext, retrieveContextDebug, getChunksByDocument, addChunk, updateChunkContent, deleteSingleChunk, toggleChunkEnabled, reconstructDocumentFromChunks } from '../utils/knowledge'
import { UPLOAD_DIR, KB_UPLOAD_EXTENSIONS, DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP, DEFAULT_TOP_K } from '../config'

// 确保 uploads 目录存在
const uploadsDir = getUserDataDir(UPLOAD_DIR)
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {})

const router = Router()

// 文件上传配置
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir)
    },
    filename: (_req, file, cb) => {
      // multer 用 Latin-1 解码 originalname，中文文件名需要还原为 UTF-8
      const realName = Buffer.from(file.originalname, 'latin1').toString('utf-8')
      cb(null, `${Date.now()}-${realName}`)
    }
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (KB_UPLOAD_EXTENSIONS.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`暂不支持 ${ext} 格式的文件，仅支持 txt/md`))
    }
  }
})

// 获取所有知识库（支持 ?name= 按名称搜索）
router.get('/', async (req, res) => {
  try {
    const where: any = {}
    if (req.query.name) {
      where.name = { [Op.like]: `%${req.query.name}%` }
    }
    if (req.query.createdAfter || req.query.createdBefore) {
      where.createdAt = {}
      if (req.query.createdAfter) where.createdAt[Op.gte] = new Date(req.query.createdAfter as string)
      if (req.query.createdBefore) where.createdAt[Op.lte] = new Date(req.query.createdBefore as string)
    }
    if (req.query.updatedAfter || req.query.updatedBefore) {
      where.updatedAt = {}
      if (req.query.updatedAfter) where.updatedAt[Op.gte] = new Date(req.query.updatedAfter as string)
      if (req.query.updatedBefore) where.updatedAt[Op.lte] = new Date(req.query.updatedBefore as string)
    }
    const knowledgeBases = await KnowledgeBaseModel.findAll({
      where,
      order: [['updatedAt', 'DESC']]
    })

    // 为每个知识库附加文档统计
    const result = await Promise.all(knowledgeBases.map(async (kb) => {
      const stats = await getDocumentStats(kb.id)
      return { ...kb.toJSON(), documents: stats.documents, documentCount: stats.documents.length, totalChunks: stats.totalChunks }
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
    const { name, description, type, chunkSize, chunkOverlap, topK, vectorStore, vectorConfig, provider, apiUrl, apiKey, providerConfig } = req.body

    if (!name) {
      return res.status(400).json({ error: '知识库名称不能为空' })
    }

    if (type === 'external' && !apiUrl) {
      return res.status(400).json({ error: '外部知识库必须提供 API 地址' })
    }

    const kb = await KnowledgeBaseModel.create({
      name,
      description: description || '',
      type: type || 'internal',
      chunkSize: chunkSize || DEFAULT_CHUNK_SIZE,
      chunkOverlap: chunkOverlap || DEFAULT_CHUNK_OVERLAP,
      topK: topK || DEFAULT_TOP_K,
      vectorStore: vectorStore || 'sqlite-vec',
      vectorConfig: vectorConfig || '',
      provider: provider || 'generic',
      providerConfig: providerConfig || '',
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

    const { name, description, type, chunkSize, chunkOverlap, topK, vectorStore, vectorConfig, provider, providerConfig, apiUrl, apiKey } = req.body

    await kb.update({
      name,
      description,
      type,
      chunkSize,
      chunkOverlap,
      topK,
      vectorStore,
      vectorConfig,
      provider,
      providerConfig,
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

    const chunkCount = await ingestDocument(id as string, req.file.path, Buffer.from(req.file.originalname, 'latin1').toString('utf-8'))

    // 处理完成后删除临时上传文件
    try { await fs.unlink(req.file.path) } catch {}

    return res.status(200).json({ message: '文档处理成功', chunkCount })
  } catch (error) {
    console.error('上传文档错误:', error)
    return res.status(500).json({ error: `文档处理失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

// 通过附件URL上传文档到知识库（供LLM工具内部调用，JSON格式而非multipart）
router.post('/:id/attachment-upload', async (req, res) => {
  try {
    const { id } = req.params
    const { attachmentUrl } = req.body

    if (!attachmentUrl) {
      return res.status(400).json({ error: 'attachmentUrl 不能为空' })
    }

    // 解析 URL: /api/attachments/{attachmentId}/{filename}
    const match = attachmentUrl.match(/\/api\/attachments\/([^/]+)\/(.+)/)
    if (!match) {
      return res.status(400).json({ error: '无效的附件URL格式' })
    }

    const [, attId, rawFilename] = match
    const filename = decodeURIComponent(rawFilename)

    // 拼接附件在磁盘上的路径（与 /api/attachments/:id/:filename 路由一致）
    const attachmentsDir = path.resolve(getUserDataDir('/attachments'))
    const filePath = path.resolve(attachmentsDir, `${attId}-${filename}`)

    // 验证文件存在
    try { await fs.access(filePath) } catch {
      return res.status(404).json({ error: '附件文件不存在，请确认附件尚未被清理' })
    }

    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }
    if (kb.type !== 'internal') {
      return res.status(400).json({ error: '仅内部知识库支持上传文档' })
    }

    const chunkCount = await ingestDocument(id, filePath, filename)
    // 不删除附件文件，聊天历史可能仍需引用

    return res.status(200).json({ message: '文档上传成功', chunkCount })
  } catch (error) {
    console.error('附件上传知识库错误:', error)
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

// 检索调试接口（返回结构化结果，含距离分数）
router.post('/:id/retrieve-debug', async (req, res) => {
  try {
    const { id } = req.params
    const { query, topK } = req.body

    if (!query) {
      return res.status(400).json({ error: '查询内容不能为空' })
    }

    const results = await retrieveContextDebug(id, query, topK || undefined)

    return res.status(200).json({ results })
  } catch (error) {
    console.error('检索调试错误:', error)
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

// 获取指定文档的分块列表
router.get('/:id/chunks/:docName', async (req, res) => {
  try {
    const { id, docName } = req.params
    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    const chunks = await getChunksByDocument(id, docName)
    return res.status(200).json(chunks.map(c => ({
      id: c.id,
      knowledgeBaseId: c.knowledgeBaseId,
      content: c.content,
      source: c.source,
      chunkIndex: c.chunkIndex,
      enabled: c.enabled,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    })))
  } catch (error) {
    console.error('获取分块列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 新增一个分块
router.post('/:id/chunks', async (req, res) => {
  try {
    const { id } = req.params
    const { content, source } = req.body

    if (!content || !source) {
      return res.status(400).json({ error: '内容和来源文档名不能为空' })
    }

    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    if (kb.type !== 'internal') {
      return res.status(400).json({ error: '仅内部知识库支持手动管理分块' })
    }

    const chunk = await addChunk(id, source, content)
    return res.status(201).json({
      id: chunk.id,
      knowledgeBaseId: chunk.knowledgeBaseId,
      content: chunk.content,
      source: chunk.source,
      chunkIndex: chunk.chunkIndex,
      enabled: chunk.enabled,
      createdAt: chunk.createdAt,
      updatedAt: chunk.updatedAt
    })
  } catch (error) {
    console.error('新增分块错误:', error)
    return res.status(500).json({ error: `新增分块失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

// 更新分块内容
router.put('/:id/chunks/:chunkId', async (req, res) => {
  try {
    const { id, chunkId } = req.params
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: '内容不能为空' })
    }

    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    await updateChunkContent(chunkId, content)
    return res.status(200).json({ message: '分块更新成功' })
  } catch (error) {
    console.error('更新分块错误:', error)
    return res.status(500).json({ error: `更新分块失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

// 删除单个分块
router.delete('/:id/chunks/:chunkId', async (req, res) => {
  try {
    const { id, chunkId } = req.params

    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    await deleteSingleChunk(chunkId)
    return res.status(200).json({ message: '分块删除成功' })
  } catch (error) {
    console.error('删除分块错误:', error)
    return res.status(500).json({ error: `删除分块失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

// 切换分块启用/停用状态
router.patch('/:id/chunks/:chunkId/toggle', async (req, res) => {
  try {
    const { id, chunkId } = req.params

    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    const chunk = await toggleChunkEnabled(chunkId)
    return res.status(200).json({
      id: chunk.id,
      enabled: chunk.enabled,
      message: chunk.enabled ? '分块已启用' : '分块已停用'
    })
  } catch (error) {
    console.error('切换分块状态错误:', error)
    return res.status(500).json({ error: `切换状态失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

// 重新下载文档（从分块拼接重建）
router.get('/:id/documents/:docName/download', async (req, res) => {
  try {
    const { id, docName } = req.params

    const kb = await KnowledgeBaseModel.findByPk(id)
    if (!kb) {
      return res.status(404).json({ error: '知识库不存在' })
    }

    const content = await reconstructDocumentFromChunks(id, docName)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${docName}"`)
    return res.send(content)
  } catch (error) {
    console.error('下载文档错误:', error)
    return res.status(500).json({ error: `下载失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

export default router