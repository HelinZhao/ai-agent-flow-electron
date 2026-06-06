import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import CustomButton from './CustomButton'
import Modal from './Modal'
import { createPortal } from 'react-dom'

interface AvatarCropperProps {
  open: boolean
  imageUrl: string
  onCropComplete: (croppedDataUrl: string) => void
  onClose: () => void
}

/** 将 Canvas 裁剪结果转 base50 data URL */
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

export default function AvatarCropper({
  open,
  imageUrl,
  onCropComplete,
  onClose,
}: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropShape, setCropShape] = useState<'round' | 'rect'>('round')
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const dataUrl = await getCroppedImg(imageUrl, croppedAreaPixels)
      onCropComplete(dataUrl)
    } catch (err) {
      console.error('裁剪失败:', err)
    } finally {
      setSaving(false)
    }
  }, [imageUrl, croppedAreaPixels, onCropComplete])

  return createPortal(
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            </svg>
          </div>
          <span className="text-base font-semibold">裁剪头像</span>
        </div>
      }
      footer={
        <div className="flex items-center gap-2 ml-auto">
          <CustomButton onClick={onClose} variant="secondary" size="sm">取消</CustomButton>
          <CustomButton onClick={handleConfirm} variant="primary" loading={saving} size="sm">确认</CustomButton>
        </div>
      }
    >
      {/* 裁剪形状切换 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">裁剪形状</span>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setCropShape('round')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              cropShape === 'round'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
            </svg>
            圆形
          </button>
          <button
            type="button"
            onClick={() => setCropShape('rect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              cropShape === 'rect'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
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
      {/* 缩放滑条 */}
      <div className="flex items-center gap-3 mt-4 px-1">
        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M8 11h6" />
        </svg>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
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
