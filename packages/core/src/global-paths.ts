import * as os from 'node:os';
import * as path from 'node:path';

/**
 * 전역 데이터 디렉토리 경로를 반환한다.
 * 현재 macOS만 지원. 다른 OS에서는 에러를 던진다.
 *
 * @returns macOS: `~/Library/Application Support/manta`
 */
export function getMantaDataDir(): string {
  const platform = os.platform();

  if (platform !== 'darwin') {
    throw new Error(`Unsupported platform: ${platform}. Currently only macOS is supported.`);
  }

  return path.join(os.homedir(), 'Library', 'Application Support', 'manta');
}
