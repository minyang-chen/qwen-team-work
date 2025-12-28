const os = require('os');
const hostname = os.hostname();
const interfaces = os.networkInterfaces();
let ip = 'Not found';
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      ip = iface.address;
      break;
    }
  }
  if (ip !== 'Not found') break;
}
console.log(`Hostname: ${hostname}`);
console.log(`IP Address: ${ip}`);
