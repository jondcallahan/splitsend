import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext
) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  }

  const userAgent = request.headers.get("user-agent");
  const isBotRequest =
    (userAgent && isbot(userAgent)) || routerContext.isSpaMode;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), streamTimeout + 1000);

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        responseStatusCode = 500;
        console.error(error);
      },
      signal: controller.signal,
    }
  );

  // Wait for all content for bots/SPA mode
  if (isBotRequest) {
    await body.allReady;
  }

  clearTimeout(timeoutId);
  responseHeaders.set("Content-Type", "text/html");

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
