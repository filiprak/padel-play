interface Env {
  // Add bindings here, e.g. MY_KV: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  return Response.json(
    {
      message: 'Hello from Cloudflare Pages Functions!',
      timestamp: new Date().toISOString(),
      path: url.pathname,
      method: request.method,
      // Example: env binding usage
      // hasKV: !!env.MY_KV,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  )
}

// Support POST as example
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json().catch(() => ({}))
  return Response.json(
    {
      message: 'Hello via POST',
      received: body,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Content-Type': 'application/json' } },
  )
}
