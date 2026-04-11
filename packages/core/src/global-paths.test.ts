import * as os from 'node:os';
import * as path from 'node:path';
import { getMantaDataDir } from './global-paths';

describe('getMantaDataDir', () => {
  it('should return ~/Library/Application Support/manta on macOS', () => {
    const result = getMantaDataDir();
    expect(result).toBe(path.join(os.homedir(), 'Library', 'Application Support', 'manta'));
  });
});
