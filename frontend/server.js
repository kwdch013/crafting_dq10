const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

// Hostヘッダとして許可するホスト名の形式 (ドメイン、IPv4、角括弧付きIPv6)
// config.js はスクリプトとして配信されるため、想定外の文字列は採用しない
const hostNamePattern = /^(?:[A-Za-z0-9._-]+|\[[0-9A-Fa-f:.]+\])$/;

// アクセス元のHostヘッダからホスト名だけを取り出す (ポート番号は除去する)
function extractHostName(hostHeader) {
  if (!hostHeader) {
    return "";
  }

  let host;

  try {
    // "[::1]:3002" のようなIPv6表記を正しく分解するためURLとして解析する
    host = new URL(`http://${hostHeader}`).host;
  } catch {
    return "";
  }

  const hostName = host.replace(/:\d+$/, "");

  return hostNamePattern.test(hostName) ? hostName : "";
}

// ブラウザからAPIへ到達するURLを決める
// API_BASE_URL 未指定時はアクセス元のホスト名を使い、別端末からでも到達できるようにする
function resolveApiBaseUrl(request) {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  const apiPort = Number(process.env.API_PORT || 8000);
  const hostName = extractHostName(request && request.headers && request.headers.host);

  return `http://${hostName || "localhost"}:${apiPort}`;
}

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

function createServer() {
  return http.createServer((request, response) => {
    if (request.url === "/config.js") {
      send(
        response,
        200,
        `window.DQ10_API_BASE_URL = ${JSON.stringify(resolveApiBaseUrl(request))};\n`,
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
}

// テストからは createServer だけを利用するため、直接実行時のみ待ち受ける
if (require.main === module) {
  createServer().listen(port, "0.0.0.0", () => {
    console.log(`frontend listening on ${port}`);
  });
}

module.exports = { createServer, resolveApiBaseUrl, extractHostName };
