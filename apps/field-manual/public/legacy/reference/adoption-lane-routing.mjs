export function parseRouteInput(rawInput = '/control-center') {
  const raw = rawInput.replace(/^#/, '') || '/control-center';
  const [pathPart, query = ''] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  const result = { path, parts, panel: params.get('panel'), level: 'invalid' };
  if (parts.length === 1 && parts[0] === 'control-center') result.level = 'control';
  if (parts[0] === 'customers' && parts.length === 2) Object.assign(result, { level: 'customer', customerId: parts[1] });
  if (parts[0] === 'customers' && parts[2] === 'use-cases' && parts.length === 4) Object.assign(result, { level: 'use-case', customerId: parts[1], useCaseId: parts[3] });
  if (parts[0] === 'customers' && parts[2] === 'use-cases' && parts[4] === 'stations' && parts.length === 6) Object.assign(result, { level: 'station', customerId: parts[1], useCaseId: parts[3], stationId: parts[5] });
  if (parts[0] === 'customers' && parts[2] === 'use-cases' && parts[4] === 'stations' && parts[6] === 'artifacts' && parts.length === 8) Object.assign(result, { level: 'artifact', customerId: parts[1], useCaseId: parts[3], stationId: parts[5], artifactId: parts[7] });
  return result;
}

export function routeForIds(customerId, useCaseId, stationId, artifactId) {
  let path = customerId ? `/customers/${encodeURIComponent(customerId)}` : '/control-center';
  if (useCaseId) path += `/use-cases/${encodeURIComponent(useCaseId)}`;
  if (stationId) path += `/stations/${encodeURIComponent(stationId)}`;
  if (artifactId) path += `/artifacts/${encodeURIComponent(artifactId)}`;
  return path;
}

