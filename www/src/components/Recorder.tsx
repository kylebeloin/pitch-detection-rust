import React, { useCallback, useState } from "react";

const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recorderStream, setRecorderStream] = useState<MediaStream | null>(
    null
  );
  const [recorderChunks, setRecorderChunks] = useState<Blob[]>([]);
  const [recorderError, setRecorderError] = useState<Error | null>(null);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setRecorderStream(stream);
      const recorder = new MediaRecorder(stream);
      setRecorder(recorder);
      let context = new AudioContext();
      let source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;

      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);
      source.connect(analyser);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecorderChunks((chunks) => [...chunks, e.data]);
        }
      };

      recorder.start();
    } catch (error) {
      setRecorderError(error as Error);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);

    recorder?.stop();
    recorderStream?.getTracks().forEach((track) => track.stop());
  }, [isRecording, recorder, recorderStream]);

  const resetRecording = useCallback(() => {
    setRecorder(null);
    setRecorderStream(null);
    setRecorderChunks([]);
    setRecorderError(null);
  }, []);

  const downloadRecording = useCallback(() => {
    const blob = new Blob(recorderChunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "recording.webm";
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
  } = useRecorder();

  return (
    <div>
      <h1>Recorder</h1>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
      <button onClick={resetRecording}>Reset</button>
      <button onClick={downloadRecording}>Download</button>
      {recorderError && <p>{recorderError.message}</p>}
    </div>
  );
};
