export const onRequest: PagesFunction = async (context) => {
  const { request } = context
  const url = new URL(request.url)

  const query = Object.fromEntries(url.searchParams.entries())

  let body: unknown = null
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const text = await request.text()
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text || null
    }
  }

  return Response.json({
    method: request.method,
    path: url.pathname,
    query,
    body,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
  })
}
