// Polyfills for Web APIs in Node.js environment during build
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(fileBits, fileName, options = {}) {
      this.name = fileName;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = 0;
    }
  };
}

if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }
    
    append(key, value) {
      this.data.set(key, value);
    }
    
    get(key) {
      return this.data.get(key);
    }
  };
}

if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob {
    constructor(array = [], options = {}) {
      this.type = options.type || '';
      this.size = 0;
    }
  };
}

export {};