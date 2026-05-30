"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import type { DrawPath, DrawPoint, DrawingEvent } from "@/types/drawing";
import { COLORS, PEN_SIZES } from "@/lib/constants";

interface Props {
  onEvent: (event: DrawingEvent) => void;
  readOnly?: boolean;
  width?: number;
  height?: number;
}

export default function DrawingCanvas({ onEvent, readOnly = false, width = 800, height = 600 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#ffffff");
  const [penSize, setPenSize] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const pathsRef = useRef<DrawPath[]>([]);
  const undoneRef = useRef<DrawPath[]>([]);
  const currentPathRef = useRef<DrawPoint[]>([]);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const redrawAll = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    for (const path of pathsRef.current) {
      drawPath(ctx, path);
    }
  }, []);

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

  function getRelativePos(e: React.MouseEvent | React.TouchEvent): DrawPoint {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (readOnly) return;
    setIsDrawing(true);
    undoneRef.current = [];
    const pos = getRelativePos(e);
    currentPathRef.current = [pos];
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || readOnly) return;
    const pos = getRelativePos(e);
    currentPathRef.current.push(pos);

    // Live draw
    const ctx = getCtx();
    if (!ctx) return;
    const pts = currentPathRef.current;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = tool === "eraser" ? "#0a0a0f" : color;
    ctx.lineWidth = tool === "eraser" ? penSize * 3 : penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();

    onEvent({
      type: "move",
      path: {
        points: pts.slice(-2),
        color,
        width: tool === "eraser" ? penSize * 3 : penSize,
        tool,
      },
    });
  }

  function onPointerUp() {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const path: DrawPath = {
      points: [...currentPathRef.current],
      color,
      width: tool === "eraser" ? penSize * 3 : penSize,
      tool,
    };
    pathsRef.current.push(path);
    currentPathRef.current = [];
    onEvent({ type: "end", path });
  }

  function handleClear() {
    pathsRef.current = [];
    undoneRef.current = [];
    redrawAll();
    onEvent({ type: "clear" });
  }

  function handleUndo() {
    const last = pathsRef.current.pop();
    if (last) undoneRef.current.push(last);
    redrawAll();
    onEvent({ type: "undo" });
  }

  function handleRedo() {
    const last = undoneRef.current.pop();
    if (last) {
      pathsRef.current.push(last);
      redrawAll();
    }
    onEvent({ type: "redo" });
  }

  // Expose method to apply remote events
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (canvasRef.current as any).__applyEvent = (event: DrawingEvent) => {
      const ctx = getCtx();
      if (!ctx) return;
      if (event.type === "clear" || (event.type === "sync" && event.paths)) {
        pathsRef.current = event.paths ?? [];
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
  }, [redrawAll]);

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Color palette */}
          <div className="flex flex-wrap gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool("pen"); }}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c && tool === "pen" ? "#00f5ff" : "transparent",
                }}
              />
            ))}
          </div>
          {/* Pen size */}
          <div className="flex items-center gap-1">
            {PEN_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setPenSize(s)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${penSize === s ? "border-[#00f5ff] bg-[#00f5ff22]" : "border-[#2a2a3e]"}`}
              >
                <div
                  className="rounded-full bg-white"
                  style={{ width: Math.min(s, 20), height: Math.min(s, 20) }}
                />
              </button>
            ))}
          </div>
          {/* Tools */}
          <button
            onClick={() => setTool("eraser")}
            className={`rounded-lg border px-3 py-1 text-sm ${tool === "eraser" ? "border-[#ff006e] bg-[#ff006e22] text-[#ff006e]" : "border-[#2a2a3e] text-gray-400"}`}
          >
            지우개
          </button>
          <button onClick={handleUndo} className="btn-secondary px-3 py-1 text-sm">↩ Undo</button>
          <button onClick={handleRedo} className="btn-secondary px-3 py-1 text-sm">↪ Redo</button>
          <button onClick={handleClear} className="btn-danger px-3 py-1 text-sm">전체 지우기</button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-[#2a2a3e] bg-[#0a0a0f]"
        style={{ touchAction: "none", cursor: readOnly ? "default" : "crosshair", width: "100%", maxWidth: width }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />
    </div>
  );
}
