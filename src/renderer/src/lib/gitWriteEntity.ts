const isElectron = Boolean(window.electron || window.api)

export async function gitWriteEntity(
  type: string,
  entity: { id: string; [key: string]: any },
  action: 'create' | 'update' | 'delete',
): Promise<void> {
  if (!isElectron) return
  try {
    const config = await window.api!.git.loadConfig()
    if (!config.enabled || !config.repoPath) return

    if (action === 'delete') {
      await window.api!.git.deleteEntity({
        repoPath: config.repoPath,
        type,
        id: entity.id,
      })
    } else {
      await window.api!.git.writeEntity({
        repoPath: config.repoPath,
        type,
        entity,
      })
    }
  } catch (e) {
    console.warn('[gitWriteEntity]', e)
  }
}
