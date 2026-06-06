import { useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper, { Area } from 'react-easy-crop'
import CustomButton from './CustomButton'
import CustomFileUpload from './CustomFileUpload'
import Modal from './Modal'
import Avatar from './Avatar'
import ImagePreview from './ImagePreview'

// ─── 工具函数 ───

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context 不可用')); return }
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height,
      )
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error('图片加载失败'))
  })
}

// ─── 裁剪模态框 ───

function CropModal({
  imageUrl,
  onConfirm,
  onClose,
}: {
  imageUrl: string
  onConfirm: (dataUrl: string) => void
  onClose: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropShape, setCropShape] = useState<'round' | 'rect'>('round')
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const handleCropComplete = (_croppedArea: Area, pixels: Area) => setCroppedAreaPixels(pixels)

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const dataUrl = await getCroppedImg(imageUrl, croppedAreaPixels)
      onConfirm(dataUrl)
    } catch (err) {
      console.error('裁剪失败:', err)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <Modal
      open
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            </svg>
          </div>
          <span className="text-base font-semibold">裁剪图片</span>
        </div>
      }
      footer={
        <div className="flex items-center gap-2 ml-auto">
          <CustomButton onClick={onClose} variant="secondary" size="sm">取消</CustomButton>
          <CustomButton onClick={handleConfirm} variant="primary" loading={saving} size="sm">确认</CustomButton>
        </div>
      }
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">裁剪形状</span>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setCropShape('round')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${cropShape === 'round'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
            圆形
          </button>
          <button
            type="button"
            onClick={() => setCropShape('rect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${cropShape === 'rect'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
            方形
          </button>
        </div>
      </div>
      <div className="relative w-full h-[360px] bg-gray-900 rounded-lg overflow-hidden">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape={cropShape}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>
      <div className="flex items-center gap-3 mt-4 px-1">
        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M8 11h6" />
        </svg>
        <input
          type="range" min={1} max={3} step={0.05} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer accent-blue-500"
        />
        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6" /><path d="M8 11h6" />
        </svg>
      </div>
    </Modal>,
    document.body,
  )
}

// ─── 图片上传组件 ───

export interface ImageUploadProps {
  /** 当前图片 URL */
  value?: string | null
  /** 图片变更回调：返回裁剪后的 data URL 或空字符串（移除） */
  onChange?: (dataUrl: string) => void
  /** 尺寸预设，默认 lg */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 是否为系统 Agent */
  isSystem?: boolean
  /** 兜底图标 */
  fallbackIcon?: React.ReactNode
  /** 组件名称（用于空状态首字母兜底） */
  name?: string
}

/**
 * 集成图片上传组件
 * - 点击「上传图片」选择文件 → 弹出裁剪框（圆形/方形）→ 确认后显示预览
 * - 悬浮预览图显示「查看大图」和「移除」按钮
 * - 空状态显示 Avatar 兜底
 */
export default function ImageUpload({
  value,
  onChange,
  size = 'lg',
  isSystem,
  fallbackIcon,
  name = '',
}: ImageUploadProps) {
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperImage, setCropperImage] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setCropperImage(dataUrl)
      setCropperOpen(true)
    } catch (err) {
      console.error('读取图片文件失败:', err)
    }
    e.target.value = ''
  }

  const handleCropConfirm = (dataUrl: string) => {
    onChange?.(dataUrl)
    setCropperOpen(false)
    setCropperImage('')
  }

  const handleCropClose = () => {
    setCropperOpen(false)
    setCropperImage('')
  }

  return (
    <div className="flex items-end gap-4">
      {/* 图片预览 */}
      {value ? (
        <ImagePreview
          src={value}
          alt="头像"
          className="rounded-xl"
          actions={[
            {
              icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              ),
              label: '移除头像',
              onClick: () => onChange?.(''),
            },
          ]}
        >
          <Avatar src={value} name={name} size={size} isSystem={isSystem} fallbackIcon={fallbackIcon} className="border border-gray-200 dark:border-gray-600" />
        </ImagePreview>
      ) : (
        <CustomFileUpload accept="image/*" onChange={handleFileSelect} size="sm" variant="ghost" icon={false} buttonClassName="!p-0">
          <div className="h-16 w-16 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <div>上传</div>
          </div>
        </CustomFileUpload>
      )}

      {/* 裁剪模态框 */}
      {cropperOpen && cropperImage && (
        <CropModal imageUrl={cropperImage} onConfirm={handleCropConfirm} onClose={handleCropClose} />
      )}
    </div>
  )
}
