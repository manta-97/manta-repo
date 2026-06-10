import * as os from 'node:os';
import * as path from 'node:path';
import { getMantaHomeDir } from './global-paths';

describe('getMantaHomeDir', () => {
  afterEach(() => {
    delete process.env.MANTA_HOME;
  });

  it('should return ~/.manta under the user home directory', () => {
    const result = getMantaHomeDir();
    expect(result).toBe(path.join(os.homedir(), '.manta'));
  });

  it('should honor the MANTA_HOME environment variable override', () => {
    process.env.MANTA_HOME = '/tmp/custom-manta-home';
    expect(getMantaHomeDir()).toBe('/tmp/custom-manta-home');
  });

  it('should ignore an empty MANTA_HOME value', () => {
    process.env.MANTA_HOME = '  ';
    expect(getMantaHomeDir()).toBe(path.join(os.homedir(), '.manta'));
  });
});
