import "server-only";

// Turn an async generator of JSON-serialisable events into an SSE Response.
export function sseStream<T>(gen: AsyncGenerator<T>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      } catch {
        controller.close();
      }
    },
    cancel() {
      void gen.return?.(undefined as never);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
