const noop = () => {};

if (typeof HTMLCanvasElement !== 'undefined') {
  const canvasProto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    getContext(contextId: string, options?: unknown): CanvasRenderingContext2D | null;
  };

  if (!canvasProto.getContext) {
    canvasProto.getContext = function getContext() {
      return {
        canvas: this,
        fillRect: noop,
        clearRect: noop,
        getImageData: () => ({ data: [] }),
        putImageData: noop,
        createImageData: () => ({ data: [] }),
        setTransform: noop,
        drawImage: noop,
        save: noop,
        restore: noop,
        beginPath: noop,
        moveTo: noop,
        lineTo: noop,
        closePath: noop,
        stroke: noop,
        translate: noop,
        scale: noop,
        rotate: noop,
        arc: noop,
        fill: noop,
        measureText: () => ({ width: 0 }),
        strokeRect: noop,
        clip: noop,
        resetTransform: noop,
        fillText: noop,
        strokeText: noop,
        createLinearGradient: () => ({ addColorStop: noop }),
        createPattern: () => null,
        createRadialGradient: () => ({ addColorStop: noop })
      } as unknown as CanvasRenderingContext2D;
    };
  }
}

export {};
