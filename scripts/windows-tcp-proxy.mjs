#!/usr/bin/env node
import net from 'node:net';

const [listenHost, listenPortRaw, targetHost, targetPortRaw] = process.argv.slice(2);
const listenPort = Number(listenPortRaw);
const targetPort = Number(targetPortRaw);

if (!listenHost || !listenPort || !targetHost || !targetPort) {
  console.error('Usage: node scripts/windows-tcp-proxy.mjs <listen-host> <listen-port> <target-host> <target-port>');
  process.exit(2);
}

const server = net.createServer(client => {
  const target = net.connect({ host: targetHost, port: targetPort });

  client.pipe(target);
  target.pipe(client);

  const closeBoth = () => {
    client.destroy();
    target.destroy();
  };

  client.on('error', closeBoth);
  target.on('error', closeBoth);
  client.on('close', closeBoth);
  target.on('close', closeBoth);
});

server.on('error', error => {
  console.error(error.message);
  process.exit(1);
});

server.listen(listenPort, listenHost, () => {
  console.log(`READY ${listenHost}:${listenPort} -> ${targetHost}:${targetPort}`);
});
