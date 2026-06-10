import * as crypto from 'node:crypto';

/** 파일 변경 감지용 해시. `manta index check`가 DB와 파일의 불일치를 찾는 데 쓴다. */
export function hashFileContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
