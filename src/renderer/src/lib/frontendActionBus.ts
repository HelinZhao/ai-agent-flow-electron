export interface FrontendAction {
  contextType: string
  contextId: string
  action: string
  payload: Record<string, any>
}

class FrontendActionBus {
  private handlers = new Map<string, Set<(action: FrontendAction) => void>>()

  register(contextType: string, handler: (action: FrontendAction) => void): () => void {
    if (!this.handlers.has(contextType)) {
      this.handlers.set(contextType, new Set())
    }
    this.handlers.get(contextType)!.add(handler)
    return () => { this.handlers.get(contextType)?.delete(handler) }
  }

  dispatch(action: FrontendAction): void {
    this.handlers.get(action.contextType)?.forEach(h => h(action))
  }
}

export const frontendActionBus = new FrontendActionBus()
