export async function onRequestGet() {
  return new Response(JSON.stringify({ status: 'ok', service: 'w-campus', timestamp: new Date().toISOString() }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    status: 200,
  });
}
