import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { findMantaRoot } from './find-manta-root';

describe('findMantaRoot', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should find manta root when .manta/ marker exists in current directory', async () => {
    await fs.mkdir(path.join(tmpDir, '.manta'));

    const result = findMantaRoot(tmpDir);
    expect(result).toBe(tmpDir);
  });

  it('should find manta root when .manta/ marker exists in parent directory', async () => {
    await fs.mkdir(path.join(tmpDir, '.manta'));
    const childDir = path.join(tmpDir, 'src', 'components');
    await fs.mkdir(childDir, { recursive: true });

    // src/components/에서 시작해도 상위의 .manta/를 찾아야 한다
    const result = findMantaRoot(childDir);
    expect(result).toBe(tmpDir);
  });

  it('should return null when no .manta/ marker exists up the tree', () => {
    const result = findMantaRoot(tmpDir);
    expect(result).toBeNull();
  });
});
