/**
 * Helper function to create JSON responses
 * @param data - The data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @param init - Additional ResponseInit options
 * @returns A Response object with JSON content type
 */
export function json<T>(
  data: T,
  status: number = 200,
  init?: ResponseInit,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });
}
