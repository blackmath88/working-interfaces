export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface CameraViewport {
  readonly width: number;
  readonly height: number;
}

export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface CameraPointer {
  readonly x: number;
  readonly y: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function fitCameraToBox(box: BoundingBox, viewport: CameraViewport, padding = 32): Camera {
  const width = Math.max(1, box.maxX - box.minX);
  const height = Math.max(1, box.maxY - box.minY);
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  return {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    zoom: clampZoom(Math.min(availableWidth / width, availableHeight / height)),
  };
}

export function lerpCamera(from: Camera, to: Camera, amount: number): Camera {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    zoom: from.zoom + (to.zoom - from.zoom) * amount,
  };
}

export function cameraViewBox(camera: Camera, viewport: CameraViewport): BoundingBox {
  const width = viewport.width / camera.zoom;
  const height = viewport.height / camera.zoom;
  return {
    minX: camera.x - width / 2,
    minY: camera.y - height / 2,
    maxX: camera.x + width / 2,
    maxY: camera.y + height / 2,
  };
}

export function zoomCameraAtPointer(
  camera: Camera,
  viewport: CameraViewport,
  pointer: CameraPointer,
  nextZoom: number,
): Camera {
  const zoom = clampZoom(nextZoom);
  const offsetX = pointer.x - viewport.width / 2;
  const offsetY = pointer.y - viewport.height / 2;
  const worldX = camera.x + offsetX / camera.zoom;
  const worldY = camera.y + offsetY / camera.zoom;
  return {
    x: worldX - offsetX / zoom,
    y: worldY - offsetY / zoom,
    zoom,
  };
}

export function camerasClose(a: Camera, b: Camera, epsilon = 0.001): boolean {
  return Math.abs(a.x - b.x) <= epsilon
    && Math.abs(a.y - b.y) <= epsilon
    && Math.abs(a.zoom - b.zoom) <= epsilon;
}
