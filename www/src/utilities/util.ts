const options = {
  freqMin: 50,
  freqLow: 50,
  freqHigh: 200,
  freqMax: 500,
  freqRate: 100,
  sampleRate: 48000,
  enmax: 0.1,
  enmin: 0.5,
  disptime: 1,
  style: {
    BACKCOLOUR: "#fafafa",
    GRIDCOLOUR: "#DDDDDD",
    AMPCOLOUR: "#2a6cad",
    FREQCOLOUR: "#b8dcff",
    FREQWIDTH: 1,
    GRIDWIDTH: 3,
    BACKCOLORDARK: "#DDDDDD",
  },
};

export const drawPitch = (
  d: any[][],
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) => {
  const [logFreqMin, logFreqMax] = [
    Math.log(options.freqMin),
    Math.log(options.freqMax),
  ];
  const data = [...d];

  for (let i = data.length, x = 0; i < data.length - 1; i++, x++) {
    if (i >= 1 && data[i][0] > 0) {
      let f1 = data[i - 1][0];
      let f2 = data[i][0];
      let f3 = data[i + 1][0];
      if (f1 > 0.45 * f2 && f1 < 0.55 * f2 && f3 > 0.45 * f2 && f3 < 0.55 * f2)
        data[i][0] = f2 / 2;
      else if (f1 > 1.8 * f2 && f1 < 2.2 * f2 && f3 > 1.8 * f2 && f3 < 2.2 * f2)
        data[i][0] = 2 * f2;
      else if (f1 < 0.75 * f2 && f3 < 0.75 * f2) data[i][0] = 0;
      else if (f1 > 1.25 * f2 && f3 > 1.25 * f2) data[i][0] = 0;
    }
  }

  // use the length of the data array to determine the width of the canvas
  let currentWidth = canvas.width * (data.length / options.freqRate);
  let disptime = 1;
  while (currentWidth > canvas.width) {
    disptime = disptime * 1.5;
    currentWidth = (canvas.width * (data.length / options.freqRate)) / disptime;
  }

  ctx.clearRect(0, 0, canvas.width as number, canvas.height as number);
  ctx.fillStyle = options.style.BACKCOLORDARK;

  ctx.fillRect(0, 0, canvas.width as number, canvas.height as number);

  ctx.fillStyle = options.style.BACKCOLOUR;

  ctx.fillRect(0, 0, currentWidth as number, canvas.height as number);
  ctx.strokeStyle = options.style.GRIDCOLOUR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  let tshift = 0;
  for (let t = 0; t < disptime + tshift; t += 0.1) {
    let x = Math.round((canvas.width * (t - tshift)) / disptime);
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }
  ctx.stroke();

  ctx.strokeStyle = options.style.GRIDCOLOUR;
  ctx.lineWidth = options.style.GRIDWIDTH;
  ctx.beginPath();
  tshift = 0;
  for (let t = 0; t < disptime + tshift; t += 1) {
    let x = Math.round((canvas.width * (t - tshift)) / disptime);
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let f = 50; f <= options.freqMax; f += 50) {
    let y = Math.round(
      canvas.height -
        (canvas.height * (Math.log(f) - logFreqMin)) / (logFreqMax - logFreqMin)
    );
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  // ctx.stroke();

  ctx.strokeStyle = options.style.AMPCOLOUR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < data.length - 1; i++) {
    let x1 = (i * canvas.width) / (disptime * options.freqRate);
    let x2 = ((i + 1) * canvas.width) / (disptime * options.freqRate);
    let y1 =
      (canvas.height * (Math.log(data[i][0]) - logFreqMin)) /
      (logFreqMax - logFreqMin);

    let y2 =
      (canvas.height * (Math.log(data[i + 1][0]) - logFreqMin)) /
      (logFreqMax - logFreqMin);
    let w1 = (canvas.height * data[i][1]) / 10;
    let w2 = (canvas.height * data[i + 1][1]) / 10;
    let change = Math.abs(
      (2 * (data[i][0] - data[i + 1][0])) / (data[i][0] + data[i + 1][0])
    );
    if (data[i + 1][0] > 0 && change < 0.2) {
      for (let x = x1; x <= x2; x++) {
        let m = (x - x1) / (x2 - x1);
        ctx.moveTo(
          x,
          canvas.height - ((1 - m) * y1 + m * y2) + ((1 - m) * w1 + m * w2) / 2
        );
        ctx.lineTo(
          x,
          canvas.height - ((1 - m) * y1 + m * y2) - ((1 - m) * w1 + m * w2) / 2
        );
      }
    } else {
      ctx.moveTo(x1, canvas.height - y1 + w1 / 2);
      ctx.lineTo(x1, canvas.height - y1 - w1 / 2);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = options.style.FREQCOLOUR;
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < data.length - 1; i++) {
    if (i >= 0 && data[i][0] > 0) {
      let x1 = ((i - 0) * canvas.width) / (disptime * options.freqRate);
      let x2 = ((i + 1) * canvas.width) / (disptime * options.freqRate);

      let y1 =
        (canvas.height * (Math.log(data[i][0]) - logFreqMin)) /
        (logFreqMax - logFreqMin);
      let y2 =
        (canvas.height * (Math.log(data[i + 1][0]) - logFreqMin)) /
        (logFreqMax - logFreqMin);
      let change = Math.abs(
        (2 * (data[i][0] - data[i + 1][0])) / (data[i][0] + data[i + 1][0])
      );
      if (data[i + 1][0] > 0 && change < 0.2) {
        ctx.moveTo(x1, canvas.height - y1);
        ctx.lineTo(x2, canvas.height - y2);
      } else {
        ctx.moveTo(x1, canvas.height - y1 - 1);
        ctx.lineTo(x1, canvas.height - y1 + 1);
      }
    }
  }
  ctx.stroke();
};
