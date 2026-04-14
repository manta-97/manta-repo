import * as os from 'node:os';
import * as path from 'node:path';

/**
 * macOS 전역 데이터 디렉토리 경로를 반환한다.
 * CLI와 Electron 앱이 같은 경로를 바라보기 위해 하드코딩.
 *
 * @returns `~/Library/Application Support/manta`
 */
export function getMantaDataDir(): string {
  return path.join(os.homedir(), 'Library', 'Application Support', 'manta');
}
