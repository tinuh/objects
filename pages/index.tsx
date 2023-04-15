import Head from "next/head";
import React, { useEffect, useState, useRef } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import Webcam from "react-webcam";

export default function Home() {
	const [model, setModel] = useState<cocoSsd.ObjectDetection>();
	const webcamRef = React.useRef(null);
	const [videoWidth, setVideoWidth] = useState(1060);
	const [videoHeight, setVideoHeight] = useState(640);
	const [objects, setObjects] = useState<string[]>([]);
	const [person, setPerson] = useState<boolean>(false);
	const [detecting, setDetecting] = useState<boolean>(false);
	const [interval, setIntervals] = useState<any>(null);
	const videoConstraints = {
		height: 1080,
		width: 1920,
		facingMode: "user",
	};

	function dataURItoBlob(dataURI) {
		// convert base64/URLEncoded data component to raw binary data held in a string
		var byteString;

		if (dataURI.split(",")[0].indexOf("base64") >= 0)
			byteString = atob(dataURI.split(",")[1]);
		else byteString = unescape(dataURI.split(",")[1]);

		// separate out the mime component
		var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

		// write the bytes of the string to a typed array
		var ia = new Uint8Array(byteString.length);
		for (var i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}

		return new Blob([ia], { type: mimeString });
	}

	async function loadModel() {
		try {
			const model = await cocoSsd.load();
			setModel(model);
			console.log("set loaded Model");
		} catch (err) {
			console.log(err);
			console.log("failed load model");
		}
	}

	useEffect(() => {
		tf.ready().then(() => {
			loadModel();
		});
	}, []);

	const toggle = () => {
		if (!detecting) {
			setDetecting(true);
			let int = setInterval(() => predictionFunction(), 500);
			setIntervals(int);
		} else {
			setDetecting(false);
			clearInterval(interval);
		}
	};

	useEffect(() => {
		if (person) {
			let img = webcamRef.current?.getScreenshot({ width: 1920, height: 1080 });

			let blob = dataURItoBlob(img);
			let objectURL = URL.createObjectURL(blob);
			console.log(objectURL);

			// send notification with the screenshot using this discord webhook: https://discord.com/api/webhooks/1096858127971922062/-QbNaMKNjLkhb02AKTNxu5WGsME5sZNQ3vHVKoPcuVJOS1BfFvmVjkyXZrYyn4b4ACGz
			// send the screenshot as multipart form data
			console.log("fetch");
			fetch(
				"https://discord.com/api/webhooks/1096858127971922062/-QbNaMKNjLkhb02AKTNxu5WGsME5sZNQ3vHVKoPcuVJOS1BfFvmVjkyXZrYyn4b4ACGz",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						username: "Webcam",
						content: objectURL,
						embeds: [
							{
								color: "2007457",
								title: `Person Detected`,
								description: `[View Image](${objectURL})`,
							},
						],
					}),
				}
			).then((res) => console.log(res));
		}
	}, [person]);

	async function predictionFunction() {
		//Clear the canvas for each prediction
		var cnvs = document.getElementById("myCanvas") as HTMLCanvasElement;
		var ctx = cnvs.getContext("2d");
		ctx?.clearRect(
			0,
			0,
			webcamRef.current.video.videoWidth || 0,
			webcamRef.current.video.videoHeight || 0
		);
		//Start prediction
		const predictions = await model.detect(
			document.getElementById("img") as HTMLVideoElement
		);

		setObjects((prev) =>
			predictions.map((p) => `${p.class} (${Math.round(p.score * 100)}%)`)
		);

		if (predictions.some((p) => p.class === "person" && p.score > 0.7)) {
			setPerson(true);
		} else {
			setPerson(false);
		}

		if (predictions.length > 0) {
			//console.log(predictions);
			for (let n = 0; n < predictions.length; n++) {
				//console.log(n);
				if (predictions[n].score > 0.7) {
					//Threshold is 0.8 or 80%
					//Extracting the coordinate and the bounding box information
					let bboxLeft = predictions[n].bbox[0];
					let bboxTop = predictions[n].bbox[1];
					let bboxWidth = predictions[n].bbox[2];
					let bboxHeight = predictions[n].bbox[3] - bboxTop;
					//console.log("bboxLeft: " + bboxLeft);
					//console.log("bboxTop: " + bboxTop);
					//console.log("bboxWidth: " + bboxWidth);
					//console.log("bboxHeight: " + bboxHeight);
					//Drawing begin
					ctx.beginPath();
					ctx.font = "28px Arial";
					ctx.fillStyle = "red";
					ctx.fillText(
						`${predictions[n].class}: ${Math.round(
							predictions[n].score * 100
						)}%`,
						bboxLeft,
						bboxTop
					);
					ctx.rect(bboxLeft, bboxTop, bboxWidth, bboxHeight);
					ctx.strokeStyle = "#FF0000";
					ctx.lineWidth = 3;
					ctx.stroke();
					//console.log("detected");
				}
			}
		}
	}

	return (
		<>
			<Head>
				<title>Objects</title>
			</Head>

			<main>
				<div className="relative">
					<Webcam
						audio={false}
						id="img"
						ref={webcamRef}
						screenshotQuality={1}
						screenshotFormat="image/jpeg"
						videoConstraints={videoConstraints}
						className="rounded-lg"
					/>

					<div className="absolute top-3 left-3 z-50">
						<button
							className={`${
								detecting ? "bg-red-500" : "bg-green-500"
							} rounded-lg p-3 text-white font-bold`}
							onClick={toggle}
						>
							{detecting ? "End" : "Start"} Detection
						</button>
						<h3 className="font-bold pt-3">Objects Detected</h3>
						<ul className="pl-3 list-disc list-inside left-3">
							{objects.map((obj) => (
								<li>{obj}</li>
							))}
						</ul>
					</div>

					<canvas
						id="myCanvas"
						width={webcamRef.current?.video.videoWidth || 0}
						height={webcamRef.current?.video.videoWidth || 0}
						className="bg-transparent absolute inset-0 z-40"
					/>
				</div>
			</main>

			<footer></footer>
		</>
	);
}
