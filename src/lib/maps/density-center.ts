type LatLng = [number, number];

const DEFAULT_CENTER: LatLng = [35.7796, -78.6382];
const BIN_SIZE = 0.12;

function binKey([lat, lng]: LatLng): string {
  return `${Math.floor(lat / BIN_SIZE)}:${Math.floor(lng / BIN_SIZE)}`;
}

function densestBin(points: LatLng[]) {
  const bins = new Map<string, { count: number; latSum: number; lngSum: number; points: LatLng[] }>();

  for (const point of points) {
    const key = binKey(point);
    const bin = bins.get(key);
    if (bin) {
      bin.count += 1;
      bin.latSum += point[0];
      bin.lngSum += point[1];
      bin.points.push(point);
    } else {
      bins.set(key, {
        count: 1,
        latSum: point[0],
        lngSum: point[1],
        points: [point],
      });
    }
  }

  let best = { count: 0, latSum: 0, lngSum: 0, points: [] as LatLng[] };
  for (const bin of bins.values()) {
    if (bin.count > best.count) {
      best = bin;
    }
  }

  return best;
}

/** Center on the area with the highest concentration of markers (ignores isolated outliers). */
export function densityMapCenter(points: LatLng[]): LatLng {
  if (points.length === 0) return DEFAULT_CENTER;
  if (points.length === 1) return points[0];

  const best = densestBin(points);
  if (best.count === 0) return DEFAULT_CENTER;

  return [best.latSum / best.count, best.lngSum / best.count];
}

/** Points in the densest grid cell — used to set an appropriate zoom level. */
export function denseClusterPoints(points: LatLng[]): LatLng[] {
  if (points.length <= 2) return points;
  const best = densestBin(points);
  return best.count > 0 ? best.points : points;
}
