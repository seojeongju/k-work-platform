// Setup Web API polyfills for Node.js build environment (CommonJS)
const { Blob: NodeBlob } = require('node:buffer');

// Polyfill File API - this must be available before undici loads
if (typeof globalThis.File === 'undefined') {
  class File extends NodeBlob {
    constructor(fileBits, fileName, options = {}) {
      super(fileBits, { type: options.type || '' });
      this.name = fileName;
      this.lastModified = options.lastModified || Date.now();
    }
    
    get [Symbol.toStringTag]() {
      return 'File';
    }
  }
  
  // Make File available globally
  globalThis.File = File;
  global.File = File;
  
  // Also set it on the global object for compatibility
  if (typeof window !== 'undefined') {
    window.File = File;
  }
}

// Polyfill FormData if needed
if (typeof globalThis.FormData === 'undefined') {
  class FormData {
    constructor() {
      this.data = new Map();
    }
    
    append(key, value) {
      if (!this.data.has(key)) {
        this.data.set(key, []);
      }
      this.data.get(key).push(value);
    }
    
    get(key) {
      const values = this.data.get(key);
      return values ? values[0] : null;
    }
    
    getAll(key) {
      return this.data.get(key) || [];
    }
    
    has(key) {
      return this.data.has(key);
    }
    
    set(key, value) {
      this.data.set(key, [value]);
    }
    
    delete(key) {
      this.data.delete(key);
    }
    
    *[Symbol.iterator]() {
      for (const [key, values] of this.data) {
        for (const value of values) {
          yield [key, value];
        }
      }
    }
    
    get [Symbol.toStringTag]() {
      return 'FormData';
    }
  }
  
  globalThis.FormData = FormData;
  global.FormData = FormData;
}

// Ensure Blob is available
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = NodeBlob;
  global.Blob = NodeBlob;
}

console.log('✅ Web API polyfills loaded successfully (File, FormData, Blob)');