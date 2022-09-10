import React, { useCallback, useEffect, useState, useRef } from "react";
import { Visualization } from "./Visualization";
import { useTimer } from "./Timer";
import { drawPitch } from "../utilities/util";

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
    recorder?.stop();
    recorderStream?.getTracks().forEach((track) => track.stop());
  }, [isRecording, recorder, recorderStream, processor, track, recorderChunks]);

  const resetRecording = useCallback(() => {
    setRecorder(null);
    setRecorderStream(null);
    setRecorderChunks([]);
    setRecorderError(null);
    setProcessor(null);
    setTrack([]);
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
    recorderChunks,
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
    recorderChunks,
  } = useRecorder();

  const [data, setData] = useState<any[][]>([]);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { time, isRunning, start, stop, reset } = useTimer();
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  const playAudio = useCallback(() => {
    if (audio && audio.paused) {
      audio.currentTime = 0;
      audio.play();
    } else {
      audio?.pause();
    }
  }, [audio, data, containerRef, setCursorPosition]);

  const handleStartRecording = useCallback(() => {
    startRecording();
    start();
  }, [startRecording, start]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    stop();
  }, [stopRecording, stop]);

  const handleReset = useCallback(() => {
    resetRecording();
    reset();
    setData([]);
  }, [resetRecording]);

  useEffect(() => {
    if (track.length > 0) {
      setData((prev) => [...track]);
    }
  }, [track.length]);

  useEffect(() => {
    if (recorderChunks.length > 0 && !isRecording) {
      const blob = new Blob(recorderChunks, { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setAudio(audio);
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [recorderChunks, isRecording]);

  useEffect(() => {
    if (time && Math.floor((time / 100) % 60) === limit) {
      window.performance.mark("end");
      handleStopRecording();
    }
  }, [time, limit]);

  return (
    <>
      <div>
        <h1>Recorder</h1>
        <button onClick={handleStartRecording}>Start</button>
        <button onClick={handleStopRecording}>Stop</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={downloadRecording}>Download</button>
        {recorderError && <p>{recorderError.message}</p>}
      </div>

      <div className="container" ref={containerRef}>
        <Visualization
          draw={drawPitch}
          data={{ track: data, isRecording }}
          eventHandler={playAudio}
        />
        <div
          className={"pointer"}
          style={
            {
              "--x": `${cursorPosition}px`,
            } as React.CSSProperties
          }
        ></div>
      </div>
      <div>
        Limit&nbsp;
        <input
          type="number"
          name="limit"
          value={limit}
          step={1}
          onChange={(e) => {
            setLimit(e.target.valueAsNumber);
          }}
        />
      </div>
      <div>{`${Math.floor((time / 100 / 60) % 60)}:${
        (time / 100) % 60 < 10 ? "0" : ""
      }${Math.floor((time / 100) % 60)}:${time % 100 < 10 ? "0" : ""}${
        time % 100
      }`}</div>
    </>
  );
};
