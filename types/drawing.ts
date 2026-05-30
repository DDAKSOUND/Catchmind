export type DrawingTool = "pen" | "eraser";

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawPath {
  points: DrawPoint[];
  color: string;
  width: number;
  tool: DrawingTool;
}

export interface DrawingEvent {
  type: "start" | "move" | "end" | "clear" | "undo" | "redo" | "sync";
  path?: DrawPath;
  paths?: DrawPath[];
}
