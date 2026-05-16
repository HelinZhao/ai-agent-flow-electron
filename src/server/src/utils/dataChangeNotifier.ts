import { EventEmitter } from 'events'

export type ResourceType = 'workflows' | 'agents' | 'skills' | 'knowledge-base' | 'llm-config' | 'triggers'

class DataChangeNotifier extends EventEmitter {
  emitChange(resource: ResourceType) {
    this.emit('change', resource)
  }
}

export const changeNotifier = new DataChangeNotifier()
