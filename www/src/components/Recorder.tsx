import React, { useCallback, useEffect, useState } from "react";
import { Visualization } from "./Visualization";
import { drawPitch } from "../utilities/drawPitch";

const options = {
  audioBitsPerSecond: 48000,
};

const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recorderStream, setRecorderStream] = useState<MediaStream | null>(
    null
  );
  const [recorderChunks, setRecorderChunks] = useState<Blob[]>([]);
  const [recorderError, setRecorderError] = useState<Error | null>(null);
  const [processor, setProcessor] = useState<AudioWorkletNode | null>(null);
  const [track, setTrack] = useState<any[][]>([]);

  const processorCallback = useCallback(
    (processor: AudioWorkletNode) => {
      processor.port.onmessage = (event) => {
        const t = [...event.data.payload.track];
        console.log("track", t);
        setTrack((prev) => [...prev, t[0]]);
      };
    },
    [track, setProcessor]
  );

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setRecorderStream(stream);
      const recorder = new MediaRecorder(stream, options);
      setRecorder(recorder);
      let context = new AudioContext();
      let source = context.createMediaStreamSource(stream);
      await context.audioWorklet.addModule(
        "worklets/pitch-detect-processor.js"
      );
      const pitchDetectorNode = new AudioWorkletNode(
        context,
        "pitch-detect-processor"
      );
      source.connect(pitchDetectorNode);
      setProcessor(pitchDetectorNode);
      processorCallback(pitchDetectorNode);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecorderChunks((chunks) => [...chunks, e.data]);
        }
      };

      recorder.onstop = () => {
        pitchDetectorNode.port.dispatchEvent(new MessageEvent("stop"));
        processor && processor.disconnect();
        source.disconnect();
        context.close();
      };

      recorder.start();
    } catch (error) {
      setRecorderError(error as Error);
    }
  }, [isRecording, processor]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    console.log(track);
    recorder?.stop();
    recorderStream?.getTracks().forEach((track) => track.stop());
  }, [isRecording, recorder, recorderStream, processor, track]);

  const resetRecording = useCallback(() => {
    setRecorder(null);
    setRecorderStream(null);
    setRecorderChunks([]);
    setRecorderError(null);
  }, []);

  const downloadRecording = useCallback(() => {
    const blob = new Blob(recorderChunks, { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "recording.mp3";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }, [recorderChunks]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    resetRecording,
    downloadRecording,
    recorderError,
    track,
  };
};

export const Recorder = () => {
  const {
    isRecording,
    startRecording,
    stopRecording,
    resetRecording,
    downloadRecording,
    recorderError,
    track,
  } = useRecorder();

  const [data, setData] = useState<any[][]>([]);

  useEffect(() => {
    if (track.length > 0) {
      console.log(track[0]);
      setData((prev) => [...track]);
    }
  }, [track.length]);

  return (
    <>
      <div>
        <h1>Recorder</h1>
        <button onClick={startRecording}>Start</button>
        <button onClick={stopRecording}>Stop</button>
        <button onClick={resetRecording}>Reset</button>
        <button onClick={downloadRecording}>Download</button>
        {recorderError && <p>{recorderError.message}</p>}
      </div>
      {data.length > 0 ? (
        <Visualization draw={drawPitch} data={{ track: data, isRecording }} />
      ) : null}
    </>
  );
};
