(function initCaptureReader(global) {
	// 画面共有ストリームから、認識処理へ渡す前段の取得状態を作ります。
	function createCaptureInfo(stream, video) {
		const videoTracks = typeof stream?.getVideoTracks === "function" ? stream.getVideoTracks() : [];
		const activeTrack = videoTracks.find((track) => track.readyState !== "ended");
		const width = Number(video?.videoWidth) || 0;
		const height = Number(video?.videoHeight) || 0;

		if (!activeTrack) {
			return {
				status: "waiting",
				statusLabel: "未接続",
				sourceLabel: "",
				width,
				height,
			};
		}

		return {
			status: width > 0 && height > 0 ? "connected" : "waiting",
			statusLabel: width > 0 && height > 0 ? "取得中" : "映像待機中",
			sourceLabel: activeTrack.label || "画面共有",
			width,
			height,
		};
	}

	// 現在のvideoフレームをcanvasへ転写し、後続のOCRや画像処理に渡せる形へ揃えます。
	function captureVideoFrame(video, canvas) {
		const width = Number(video?.videoWidth) || 0;
		const height = Number(video?.videoHeight) || 0;
		if (!width || !height || !canvas) {
			return {
				status: "waiting",
				statusLabel: "映像待機中",
				width,
				height,
			};
		}

		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		context.drawImage(video, 0, 0, width, height);

		return {
			status: "captured",
			statusLabel: "フレーム取得済み",
			width,
			height,
		};
	}

	// 再接続時や終了時に既存ストリームを確実に停止します。
	function stopCaptureStream(stream) {
		if (typeof stream?.getTracks !== "function") {
			return;
		}
		stream.getTracks().forEach((track) => track.stop?.());
	}

	const api = {
		createCaptureInfo,
		captureVideoFrame,
		stopCaptureStream,
	};

	global.DQ10CaptureReader = api;

	if (typeof module !== "undefined") {
		module.exports = api;
	}
})(typeof window !== "undefined" ? window : globalThis);
