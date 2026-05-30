import { createServer } from "http";
import next from "next";
import { initSocket } from "./socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  initSocket(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Host:    http://${hostname}:${port}/host`);
    console.log(`> Overlay: http://${hostname}:${port}/overlay`);
    console.log(`> Admin:   http://${hostname}:${port}/admin`);
  });
});
