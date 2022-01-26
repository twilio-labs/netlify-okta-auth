import { Handler } from "@netlify/functions";
import {
  error,
  getFallbackRawUrl,
  Options,
  loadOptionsFromEnvironment,
} from "./utils";
import stripJs from "strip-js";

export function getLoginHandler(options: Options = {}): Handler {
  // Primary lambda function handler
  const handler: Handler = async (event, context) => {
    loadOptionsFromEnvironment(options);

    const prodBaseUrl = options.prodBaseUrl;
    if (!prodBaseUrl) {
      return error(500, "Production URL not configured.");
    }

    const prodLoginUrl = new URL("/.netlify/functions/login", prodBaseUrl);
    const rawUrl = event.rawUrl
      ? new URL(event.rawUrl)
      : getFallbackRawUrl(
          event.headers.host,
          "/.netlify/functions/login",
          prodLoginUrl.protocol
        ); // Netlify's local env doesn't have rawUrl 😞

    const isPreviewSite = rawUrl.hostname !== prodLoginUrl.hostname;

    let targetRedirectUrl = options.oktaUrl;
    let redirectToJs = '" + window.location.href + "';

    if (isPreviewSite) {
      const authUrl = new URL(rawUrl);
      authUrl.pathname = "/.netlify/functions/auth";
      authUrl.search = "";
      authUrl.hash = "";

      prodLoginUrl.search =
        "?redirect_to=" + encodeURIComponent(authUrl.toString());
      targetRedirectUrl = prodLoginUrl.toString();
    } else if (event.queryStringParameters?.redirect_to) {
      redirectToJs = stripJs(event.queryStringParameters.redirect_to);
    }

    if (!targetRedirectUrl) {
      return error(500, "OKTA URL not configured.");
    }

    const targetLabel = isPreviewSite ? "production site" : "Okta";

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `<!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Login${
              options.siteTitle ? ": " + options.siteTitle : ""
            }</title>
        </head>
        <body>
            <p>Redirecting to ${targetLabel} to login...</p>
            <script>
                document.cookie = "redirect_to=${redirectToJs}; path=/";
            </script>
            ${
              options?.unsafe?.debug
                ? `
            <p><a href="${targetRedirectUrl}">Proceed to ${targetLabel}</a> (local dev mode)</p>
            <h2>Event</h2>
            <pre>${JSON.stringify(event, undefined, 2)}</pre>
            <h2>Context</h2>
            <pre>${JSON.stringify(context, undefined, 2)}</pre>
            `
                : `
            <script>
                window.location.href = "${targetRedirectUrl}";
            </script>
            `
            }
        </body>
    </html>`,
    };
  };

  return handler;
}
