// Preserve the API reverse-proxy prefix when connecting to Socket.IO.
export function getApiEndpoints(baseURL: string) {
  const url = new URL(baseURL);
  const pathname = url.pathname.replace(/\/+$/, "");
  const prefix = pathname.replace(/\/api\/v1$/, "");
  return {
    socketOrigin: url.origin,
    socketPath: `${prefix}/socket.io`,
  };
}
