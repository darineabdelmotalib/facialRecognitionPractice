import { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as facemesh from "@tensorflow-models/facemesh";
import Webcam from "react-webcam";
import { drawMesh } from "./utilities";
import "./App.scss";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [headDirection, setHeadDirection] = useState("");

  useEffect(() => {
    let intervalId;

    const runFacemesh = async () => {
      try {
        const net = await facemesh.load({
          inputResolution: { width: 640, height: 480 },
          scale: 0.8,
        });

        const detectAndUpdate = async () => {
          await detect(net);
          intervalId = setTimeout(detectAndUpdate, 100);
        };

        detectAndUpdate();
      } catch (error) {
        console.error("Error loading Facemesh model:", error);
      }
    };

    runFacemesh();

    return () => clearTimeout(intervalId);
  }, []);

  const detect = async (net) => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const face = await net.estimateFaces(video);
      if (face.length > 0) {
        const keypoints = face[0].scaledMesh;

        const leftEye = keypoints[33];
        const rightEye = keypoints[263];
        const noseTip = keypoints[1];
        const forehead = keypoints[10];
        const chin = keypoints[152];

        const tiltAngle = calculateTiltAngle(leftEye, rightEye);
        const foreheadToNose = calculateDistance(forehead, noseTip);
        const noseToChin = calculateDistance(noseTip, chin);

        let direction = "";
        if (foreheadToNose > noseToChin + 40) {
          direction = "Down";
        } else if (noseToChin > foreheadToNose + 10) {
          direction = "Up";
        }

        if (tiltAngle > 10) {
          direction = "Left";
        } else if (tiltAngle < -10) {
          direction = "Right";
        }

        setHeadDirection(direction);
        console.log(direction);
      }

      const ctx = canvasRef.current.getContext("2d");
      drawMesh(face, ctx);
    }
  };

  // Helper function to calculate tilt angle
  const calculateTiltAngle = (leftEye, rightEye) => {
    const [xLeft, yLeft] = leftEye;
    const [xRight, yRight] = rightEye;

    const slope = (yRight - yLeft) / (xRight - xLeft);
    return Math.atan(slope) * (180 / Math.PI);
  };

  // Helper function to calculate Euclidean distance
  const calculateDistance = (pointA, pointB) => {
    const [x1, y1] = pointA;
    const [x2, y2] = pointB;

    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  return (
    <div className="webcam-container">
      <h2>Head Direction: {headDirection}</h2>
      <Webcam ref={webcamRef} className="webcamRef" />
      <canvas ref={canvasRef} className="canvasRef" />
    </div>

    
  );
}

export default App;
