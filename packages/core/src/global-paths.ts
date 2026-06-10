import * as os from 'node:os';
import * as path from 'node:path';

/**
 * 사용자 홈의 Manta 루트 디렉토리(`~/.manta`)를 반환한다.
 *
 * 프로젝트 레지스트리(`projects.json`)와 root SQLite(`manta.sqlite`)가 여기에 산다.
 * 홈 디렉토리 기반이라 macOS/Linux/Windows 어디서든 동작한다.
 *
 * `MANTA_HOME` 환경변수로 위치를 바꿀 수 있다 — 테스트 격리와
 * 샌드박스 환경(예: AI 에이전트 실행 환경)을 위한 탈출구다.
 */
export function getMantaHomeDir(): string {
  const overriddenHome = process.env.MANTA_HOME;
  if (overriddenHome !== undefined && overriddenHome.trim() !== '') {
    return overriddenHome;
  }
  return path.join(os.homedir(), '.manta');
}
