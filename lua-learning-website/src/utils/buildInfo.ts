export interface BuildInfo {
  commit: string
  branch: string
  timestamp: string
  env: string
  version: string
}

export function getBuildInfo(): BuildInfo {
  return {
    commit: __BUILD_COMMIT__,
    branch: __BUILD_BRANCH__,
    timestamp: __BUILD_TIMESTAMP__,
    env: __BUILD_ENV__,
    version: __BUILD_VERSION__,
  }
}

export function logBuildInfo(): void {
  const info = getBuildInfo()
  const message = `
╔══════════════════════════════════════╗
║           Build Information          ║
╠══════════════════════════════════════╣
║ Version:   ${info.version.padEnd(25)}║
║ Commit:    ${info.commit.padEnd(25)}║
║ Branch:    ${info.branch.padEnd(25)}║
║ Env:       ${info.env.padEnd(25)}║
║ Built:     ${info.timestamp.substring(0, 19).padEnd(25)}║
╚══════════════════════════════════════╝`
  console.info(message)
}
