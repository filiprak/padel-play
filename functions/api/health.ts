export const onRequestGet: PagesFunction = async () => {
  return Response.json(
    {
      status: 'ok',
      uptime: Date.now(),
      version: '1.0.0',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  )
}
