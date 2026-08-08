export interface Camera {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface CameraViewport {
  width: number;
  height: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CameraPointer extends CameraViewport {
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/** Camera that frames a bounding box at a given fill ratio of the viewport. */
export function fitCameraToBox(
  box: BoundingBox,
  viewport: CameraViewport,
  fillRatio = 0.7,
): Camera {
  const boxW = Math.max(1, box.maxX - box.minX);
  const boxH = Math.max(1, box.maxY - box.minY);
  const zoomX = (viewport.width * fillRatio) / boxW;
  const zoomY = (viewport.height * fillRatio) / boxH;
  return {
    centerX: (box.minX + box.maxX) / 2,
    centerY: (box.minY + box.maxY) / 2,
    zoom: clampZoom(Math.min(zoomX, zoomY)),
  };
}

export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  return {
    centerX: a.centerX + (b.centerX - a.centerX) * t,
    centerY: a.centerY + (b.centerY - a.centerY) * t,
    zoom: Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t),
  };
}

/** Ease-out cubic: quick start and a gentle stop. */
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const inv = 1 - clamped;
  return 1 - inv * inv * inv;
}

/** Whether two cameras have effectively reached the same position. */
export function camerasClose(a: Camera, b: Camera): boolean {
  return Math.abs(a.centerX - b.centerX) < 0.5
    && Math.abs(a.centerY - b.centerY) < 0.5
    && Math.abs(a.zoom - b.zoom) < 0.005;
}

export function cameraViewBox(camera: Camera, viewport: CameraViewport): string {
  const width = viewport.width / camera.zoom;
  const height = viewport.height / camera.zoom;
  return `${camera.centerX - width / 2} ${camera.centerY - height / 2} ${width} ${height}`;
}

export function zoomCameraAtPointer(camera: Camera, pointer: CameraPointer, factor: number): Camera {
  const offsetX = pointer.x - pointer.width / 2;
  const offsetY = pointer.y - pointer.height / 2;
  const worldX = camera.centerX + offsetX / camera.zoom;
  const worldY = camera.centerY + offsetY / camera.zoom;
  const zoom = clampZoom(camera.zoom * factor);
  return {
    centerX: worldX - offsetX / zoom,
    centerY: worldY - offsetY / zoom,
    zoom,
  };
}
