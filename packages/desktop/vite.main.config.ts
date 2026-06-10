import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['node'],
    // @manta/core는 CJS(dist)로 컴파일되는데, rollup은 tsc의
    // `Object.defineProperty(exports, ...)` 재-export에서 named export를
    // 정적으로 읽지 못한다. main 번들은 core의 TS 소스를 직접 번들한다.
    alias: {
      '@manta/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
