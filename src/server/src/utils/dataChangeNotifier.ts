import { EventEmitter } from 'events'

export type ResourceType = 'workflows' | 'agents' | 'skills' | 'knowledge-base' | 'llm-config' | 'triggers' | 'mcp-servers' | 'environment-variables'

class DataChangeNotifier extends EventEmitter {
  emitChange(resource: ResourceType) {
    this.emit('change', resource)
  }
}

export const changeNotifier = new DataChangeNotifier()
