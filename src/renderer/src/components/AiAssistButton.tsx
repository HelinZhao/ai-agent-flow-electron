import { useRef, useEffect } from "react"
import { EditingContext } from "@renderer/lib/editingContext"
import { FrontendAction, frontendActionBus } from "@renderer/lib/frontendActionBus"
import { useBudingStore } from "@renderer/store/budingStore"
import { assistContextApi } from "@renderer/lib/api"

function syncContextToBackend(ctx: EditingContext | null) {
    if (ctx) {
        assistContextApi.set(ctx).catch(() => { })
    } else {
        assistContextApi.clear().catch(() => { })
    }
}

interface AiAssistButtonProps {
    onAction?: (action: FrontendAction) => void
    context: EditingContext
}
export default function AiAssistButton(props: AiAssistButtonProps) {
    const callbackRef = useRef(props.onAction)
    callbackRef.current = props.onAction
    const activeAssist = useBudingStore(s => s.assistContext)
    const isActive = activeAssist?.contextId === props.context.contextId

    // 组件卸载时清除协助上下文
    useEffect(() => {
        return () => {
            if (isActive) {
                useBudingStore.getState().setAssistContext(null)
                syncContextToBackend(null)
            }
        }
    }, [isActive])

    useEffect(() => {
        if (!callbackRef.current) return
        return frontendActionBus.register(props.context.contextType, (action) => {
            console.log('action,', action)
            callbackRef.current?.(action)
        })
    }, [props.context.contextType])

    const onClick = () => {
        useBudingStore.getState().setAssistContext(props.context)
        syncContextToBackend(props.context)
        useBudingStore.getState().setOpen(true)
    }
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isActive
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                }`}
            title={isActive ? 'AI 协助中，点击重新协助' : 'AI 帮填'}
        >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /><path d="M17 4a2 2 0 0 0 -2 2" /><path d="M19 7a2 2 0 0 0 -2 2" /><path d="M21 10a2 2 0 0 0 -2 2" /></svg>
            {isActive ? '协助中' : 'AI 帮填'}
        </button>
    )
}
