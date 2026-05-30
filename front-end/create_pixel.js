const fs = require('fs');
// base64 for a 1x1 white pixel PNG
const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1FSAAAAAElFTkSuQmCC';
const buffer = Buffer.from(base64Data, 'base64');
fs.writeFileSync('e:/codex/front-end/assets/images/blank.png', buffer);
console.log('Successfully created white pixel PNG');
