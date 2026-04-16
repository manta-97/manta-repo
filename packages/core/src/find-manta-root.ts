import * as path from 'node:path';
import * as fs from 'node:fs';
import { MANTA_MARKER_DIR } from './constants';

/**
 * 현재 디렉토리에서 루트('/')까지 올라가며 `.manta/` 디렉토리를 찾는다.
 *
 * @param startDir - 탐색을 시작할 디렉토리 경로
 * @returns `.manta/`를 포함하는 프로젝트 루트 경로, 없으면 `null`
 */
export function findMantaRoot(startDir: string): string | null {
  let currentDir = path.resolve(startDir);

  while (true) {
    const markerPath = path.join(currentDir, MANTA_MARKER_DIR);

    try {
      const stat = fs.statSync(markerPath);
      if (stat.isDirectory()) {
        return currentDir;
      }
    } catch {
      // .manta/가 없으면 무시하고 상위로 계속
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}
