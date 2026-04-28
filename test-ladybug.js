const ladybug = require('@ladybugdb/core');
try {
  const db = new ladybug.Database('./test.db');
  console.log('LadybugDB successfully initialized in Node.js!');
} catch (e) {
  console.error('Failed to initialize LadybugDB in Node.js:', e);
}
