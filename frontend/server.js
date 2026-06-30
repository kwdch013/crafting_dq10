const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 3000);
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000";
const publicDir = path.join(__dirname, "public");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    ...headers,
  });
  response.end(body);
}

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(publicDir, requested));

  if (!filePath.startsWith(publicDir)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  if (request.url === "/config.js") {
    send(
      response,
      200,
      `window.DQ10_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`,
      { "Content-Type": "application/javascript; charset=utf-8" },
    );
    return;
  }

  const filePath = resolvePath(request.url || "/");

  if (!filePath) {
    send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.readFile(filePath, (error, body) => {
    if (error) {
      fs.readFile(path.join(publicDir, "index.html"), (fallbackError, fallbackBody) => {
        if (fallbackError) {
          send(response, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
          return;
        }

        send(response, 200, fallbackBody, { "Content-Type": contentTypes[".html"] });
      });
      return;
    }

    const ext = path.extname(filePath);
    send(response, 200, body, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`frontend listening on ${port}`);
});
