const assert = require("node:assert/strict");
const captureReader = require("../app/capture-reader.js");

{
	const stream = {
		getVideoTracks() {
			return [{ label: "DQXGame", readyState: "live" }];
		},
	};
	const video = { videoWidth: 1280, videoHeight: 720 };

	assert.deepEqual(captureReader.createCaptureInfo(stream, video), {
		status: "connected",
		statusLabel: "取得中",
		sourceLabel: "DQXGame",
		width: 1280,
		height: 720,
	});
}

{
	const stream = {
		getVideoTracks() {
			return [];
		},
	};

	assert.equal(captureReader.createCaptureInfo(stream, {}).status, "waiting");
}

{
	const calls = [];
	const video = { videoWidth: 640, videoHeight: 360 };
	const canvas = {
		width: 0,
		height: 0,
		getContext(type) {
			calls.push(["getContext", type]);
			return {
				drawImage(...args) {
					calls.push(["drawImage", ...args]);
				},
			};
		},
	};

	assert.deepEqual(captureReader.captureVideoFrame(video, canvas), {
		status: "captured",
		statusLabel: "フレーム取得済み",
		width: 640,
		height: 360,
	});
	assert.equal(canvas.width, 640);
	assert.equal(canvas.height, 360);
	assert.deepEqual(calls, [
		["getContext", "2d"],
		["drawImage", video, 0, 0, 640, 360],
	]);
}

{
	const stopped = [];
	const stream = {
		getTracks() {
			return [
				{ stop: () => stopped.push("video") },
				{ stop: () => stopped.push("audio") },
			];
		},
	};

	captureReader.stopCaptureStream(stream);
	assert.deepEqual(stopped, ["video", "audio"]);
}
