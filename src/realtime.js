const clients = new Set();

function subscribe(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  res.write('event: connected\ndata: {"ok":true}\n\n');
  clients.add(res);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

function broadcast(type = 'promotions-updated') {
  const payload = JSON.stringify({ type, at: new Date().toISOString() });
  for (const client of clients) client.write(`event: ${type}\ndata: ${payload}\n\n`);
}

module.exports = { subscribe, broadcast };
