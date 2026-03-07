const http = require('http');

const port = process.env.PORT_FRONTEND || 5173;

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Frontend stub — SvelteKit init coming in Sprint 3\n');
  })
  .listen(port, () => {
    console.log(`Frontend stub running on port ${port}`);
  });
