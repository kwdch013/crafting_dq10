const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { resolveApiBaseUrl, createServer } = require("../frontend/server.js");

// 各テストで環境変数を書き換えるため、実行前後で元の値へ戻す
function withEnv(values, callback) {
	const saved = {};

	Object.keys(values).forEach((key) => {
		saved[key] = process.env[key];

		if (values[key] === undefined) {
			delete process.env[key];
			return;
		}

		process.env[key] = values[key];
	});

	try {
		return callback();
	} finally {
		Object.keys(saved).forEach((key) => {
			if (saved[key] === undefined) {
				delete process.env[key];
				return;
			}

			process.env[key] = saved[key];
		});
	}
}

// Host ヘッダだけを持つ最小のリクエスト相当オブジェクトを作る
function requestWithHost(host) {
	return { headers: host === undefined ? {} : { host } };
}

test("API_BASE_URL 未指定時はアクセス元のホスト名から接続先を組み立てる", () => {
	withEnv({ API_BASE_URL: undefined, API_PORT: undefined }, () => {
		assert.equal(
			resolveApiBaseUrl(requestWithHost("localhost:3002")),
			"http://localhost:8000",
		);
		assert.equal(
			resolveApiBaseUrl(requestWithHost("192.168.0.100:3002")),
			"http://192.168.0.100:8000",
		);
		assert.equal(
			resolveApiBaseUrl(requestWithHost("dq10.example.com")),
			"http://dq10.example.com:8000",
		);
	});
});

test("API_PORT を指定するとAPI側のポートへ追従する", () => {
	withEnv({ API_BASE_URL: undefined, API_PORT: "9000" }, () => {
		assert.equal(
			resolveApiBaseUrl(requestWithHost("192.168.0.100:3002")),
			"http://192.168.0.100:9000",
		);
	});
});

test("API_BASE_URL を明示指定した場合はその値を優先する", () => {
	withEnv({ API_BASE_URL: "http://api.example.com:8080", API_PORT: "9000" }, () => {
		assert.equal(
			resolveApiBaseUrl(requestWithHost("192.168.0.100:3002")),
			"http://api.example.com:8080",
		);
	});
});

test("API_BASE_URL が空文字の場合は未指定として扱う", () => {
	withEnv({ API_BASE_URL: "", API_PORT: undefined }, () => {
		assert.equal(
			resolveApiBaseUrl(requestWithHost("192.168.0.100:3002")),
			"http://192.168.0.100:8000",
		);
	});
});

test("IPv6 のHostヘッダでも角括弧を保ったまま組み立てる", () => {
	withEnv({ API_BASE_URL: undefined, API_PORT: undefined }, () => {
		assert.equal(
			resolveApiBaseUrl(requestWithHost("[::1]:3002")),
			"http://[::1]:8000",
		);
	});
});

test("Hostヘッダが無い、または不正な場合は localhost へフォールバックする", () => {
	withEnv({ API_BASE_URL: undefined, API_PORT: undefined }, () => {
		assert.equal(resolveApiBaseUrl(requestWithHost(undefined)), "http://localhost:8000");
		assert.equal(resolveApiBaseUrl(requestWithHost("")), "http://localhost:8000");
		// スクリプト文脈へ埋め込むため、不正なHostは採用せず既定値へ落とす
		assert.equal(
			resolveApiBaseUrl(requestWithHost('evil.com"</script><script>alert(1)</script>')),
			"http://localhost:8000",
		);
		assert.equal(resolveApiBaseUrl(requestWithHost("host name")), "http://localhost:8000");
	});
});

// 実際にサーバーを起動し、Hostヘッダに応じた /config.js が返ることを確認する結合テスト
function fetchConfigJs(server, hostHeader) {
	const { port } = server.address();

	return new Promise((resolve, reject) => {
		const request = http.request(
			{ host: "127.0.0.1", port, path: "/config.js", headers: { Host: hostHeader } },
			(response) => {
				let body = "";
				response.setEncoding("utf8");
				response.on("data", (chunk) => {
					body += chunk;
				});
				response.on("end", () => resolve({ status: response.statusCode, body }));
			},
		);

		request.on("error", reject);
		request.end();
	});
}

test("結合: 起動中のサーバーがHostヘッダに応じた接続先を配信する", async () => {
	const server = createServer();

	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

	try {
		const local = await fetchConfigJs(server, "localhost:3002");
		assert.equal(local.status, 200);
		assert.match(local.body, /window\.DQ10_API_BASE_URL = "http:\/\/localhost:8000";/);

		const remote = await fetchConfigJs(server, "192.168.0.100:3002");
		assert.equal(remote.status, 200);
		assert.match(remote.body, /window\.DQ10_API_BASE_URL = "http:\/\/192\.168\.0\.100:8000";/);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});
