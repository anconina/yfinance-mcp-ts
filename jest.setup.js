/**
 * Jest setup file - polyfills for Node.js test environment
 */

// Polyfill File global for undici (used by cheerio)
// This is needed because undici expects browser globals
if (typeof globalThis.File === 'undefined') {
  const { Blob } = require('buffer');

  class File extends Blob {
    constructor(chunks, name, options = {}) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }

  globalThis.File = File;
}
