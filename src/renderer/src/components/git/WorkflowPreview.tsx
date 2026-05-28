import Modal from '@renderer/components/ui/Modal'
import WorkflowViewer from '@renderer/components/workflow/WorkflowViewer'
import type { Workflow } from '@renderer/types'

export default function WorkflowPreview({ data, onClose }: { data: Workflow; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} width="max-w-[90vw]"
      title={
        <div>
          {data.name}
          {data.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{data.description}</p>
          )}
        </div>
      }
    >
      <div className="h-[70vh]">
        <WorkflowViewer nodes={data.nodes} edges={data.edges} />
      </div>
    </Modal>
  )
}
