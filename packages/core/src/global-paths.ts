import * as os from 'node:os';
import * as path from 'node:path';

export function getMantaDataDir(): string {
  return path.join(os.homedir(), 'Library', 'Application Support', 'manta');
}
