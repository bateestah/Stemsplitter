declare module 'easy-star.js' {
  export interface PathPoint {
    x: number;
    y: number;
  }

  export type PathResult = PathPoint[] | null;

  export default class EasyStar {
    setGrid(grid: number[][]): void;
    setAcceptableTiles(tiles: number[]): void;
    setIterationsPerCalculation(iterations: number): void;
    findPath(
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      callback: (path: PathResult) => void
    ): void;
    calculate(): void;
  }
}
