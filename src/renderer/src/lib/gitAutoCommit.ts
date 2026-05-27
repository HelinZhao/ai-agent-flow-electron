const isElectron = Boolean(window.electron || window.api)

export async function gitAutoCommit(
  type: string,
  entity: { id: string; [key: string]: any },
  action: 'create' | 'update' | 'delete',
): Promise<void> {
  if (!isElectron) return
  try {
    const config = await window.api!.git.loadConfig()
    if (!config.enabled || !config.repoPath) return

    if (action === 'delete') {
      await window.api!.git.delete({
        repoPath: config.repoPath,
        type,
        id: entity.id,
        message: `${action} ${type}: ${entity.name || entity.id}`,
      })
    } else {
      await window.api!.git.commit({
        repoPath: config.repoPath,
        type,
        entity,
        message: `${action} ${type}: ${entity.name || entity.id}`,
      })
    }
  } catch (e) {
    // silent - git is optional, don't interrupt user
    console.warn('[gitAutoCommit]', e)
  }
}
