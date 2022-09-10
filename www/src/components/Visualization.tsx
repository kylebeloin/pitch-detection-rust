import React, { useEffect, useRef, useCallback } from "react";

interface VisualizationProps {
  draw: (
    data: any,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
  ) => void;
  data: any;
  eventHandler?: (e: any) => void;
}

export const Visualization = ({
  draw,
  data,
  eventHandler,
}: VisualizationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D>();
  const parentRef = useRef<HTMLDivElement>(null);

  const resize = useCallback(() => {
    if (canvasRef.current && parentRef.current) {
      const context = canvasRef.current.getContext(
        "2d"
      ) as CanvasRenderingContext2D;
      canvasRef.current.width = parentRef.current.offsetWidth;
      canvasRef.current.height = parentRef.current.offsetHeight;
      contextRef.current = context;
      draw([...data.track], canvasRef.current, context);
    }
  }, [data, draw]);

  const paint = useCallback(() => {
    const track = [...data.track];
    if (canvasRef.current && contextRef.current && track) {
      let canvas = canvasRef.current;
      let context = contextRef.current;
      window.requestAnimationFrame(() => {
        draw(track, canvas, context);
      });
    }
  }, [
    data,
    draw,
    eventHandler,
    parentRef.current?.clientWidth,
    parentRef.current?.clientHeight,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") as CanvasRenderingContext2D;
    if (canvas && context) {
      // get parent container width
      canvas.width = canvas.parentElement?.clientWidth || 0;
      canvas.height = canvas.parentElement?.clientHeight || 0;
      contextRef.current = context;
      if (eventHandler) {
        canvas.onclick = (e) => eventHandler(e);
      }
      window.onresize = () => {
        resize();
      };
      paint();
    }
    return () => {
      if (canvas && eventHandler) {
        canvas.onclick = null;
      }
      resize();
      window.onresize = null;
    };
  }, [paint, eventHandler]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.clientWidth || 0;
      canvas.height = canvas.parentElement?.clientHeight || 0;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      contextRef.current = context;
      window.addEventListener("resize", () => resize());
      paint();
    }
    return () => {
      window.removeEventListener("resize", () => resize());
    };
  }, []);

  return (
    <div
      ref={parentRef}
      style={{
        width: "100%",
        height: "400px",
      }}
    >
      {data.length > 0 && parentRef.current ? (
        <div
          style={{
            width: parentRef.current.clientWidth,
            height: parentRef.current.clientHeight,
          }}
        >
          Loading...
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} />
        </>
      )}
    </div>
  );
};
