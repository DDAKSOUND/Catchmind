"use client";
import { useRef, useEffect } from "react";
import type { DrawPath, DrawingEvent } from "@/types/drawing";

interface Props {
  width?: number;
  height?: number;
}

export default function OverlayCanvas({ width = 800, height = 600 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathsRef = useRef<DrawPath[]>([]);

  function getCtx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function drawPath(ctx: CanvasRenderingContext2D, path: DrawPath) {
    if (path.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = path.tool === "eraser" ? "#0a0a0f" : path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
  }

  function redrawAll() {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    for (const path of pathsRef.current) {
      drawPath(ctx, path);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Expose applyEvent for socket handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (canvas as any).__applyEvent = (event: DrawingEvent) => {
      const ctx = getCtx();
      if (!ctx) return;
      if (event.type === "sync") {
        pathsRef.current = event.paths ?? [];
        redrawAll();
      } else if (event.type === "clear") {
        pathsRef.current = [];
        redrawAll();
      } else if (event.type === "undo") {
        pathsRef.current = pathsRef.current.slice(0, -1);
        redrawAll();
      } else if (event.type === "move" && event.path) {
        drawPath(ctx, event.path);
      } else if (event.type === "end" && event.path) {
        pathsRef.current.push(event.path);
      }
    };
  });

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-xl border border-[#2a2a3e] bg-[#0a0a0f]"
      style={{ width: "100%", maxWidth: width }}
    />
  );
}

// Export the ref type for external use
export type { Props as OverlayCanvasProps };
export function applyEventToCanvas(canvas: HTMLCanvasElement | null, event: DrawingEvent) {
  if (!canvas) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (canvas as any).__applyEvent?.(event);
}
