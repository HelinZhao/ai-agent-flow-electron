export const getNodeDefaultLabel = (type: string): string => {
  switch (type) {
    case 'start':
      return '开始'
    case 'skill':
      return '技能节点'
    case 'branch':
      return '分支节点'
    case 'api':
      return 'API节点'
    case 'llm':
      return 'LLM节点'
    case 'agent':
      return 'Agent节点'
    case 'end':
      return '结束'
    default:
      return '未知节点'
  }
}
