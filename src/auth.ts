import { Handler } from "@netlify/functions";
import {
  decode,
  verify,
  sign,
  JwtPayload,
  JwtHeader,
  SigningKeyCallback,
} from "node-jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import {
  getCookie,
  createCookie,
  error,
  jsonContentTypeHeader,
  Options,
  loadOptionsFromEnvironment,
} from "./utils";

const badData = error(400, "Bad data received.");

export function getAuthHandler(options: Options = {}): Handler {
  const handler: Handler = async (event, context) => {
    loadOptionsFromEnvironment(options);

    if (!options.jwtSecret) return error(500, "Misconfigured application.");
    if (event.httpMethod !== "POST" || !event.body) return badData;

    // We get a JWT POSTed to us from Okta in the body as an `x-www-form-urlencoded` key=value format.
    const bodyData = new URLSearchParams(event.body);
    const tokenData = bodyData.get("id_token") ?? "";
    if (!tokenData) return badData;

    // Just decodes the JWT to an object, doesn't verify yet.
    const decodedToken = decode(tokenData) as JwtPayload;
    if (!decodedToken?.iss) return badData;

    // This is a callback function that will be used when we attempt to verify the token
    // It retrieves the public signing key from the issuer site (e.g. Okta).
    function getPublicKey(
      header: JwtHeader,
      callback: SigningKeyCallback
    ): void {
      const client = new JwksClient({
        jwksUri: `${decodedToken.iss}/oauth2/v1/keys`,
      });
      client.getSigningKey(header.kid).then((key) => {
        callback(null, key.getPublicKey());
      });
    }

    // Now, we verify the token.
    function verifyAsync(): Promise<JwtPayload> {
      const issuer = options.oktaUrl
        ? new URL(options.oktaUrl ?? "").origin
        : undefined;
      return new Promise<JwtPayload>((resolve, reject) => {
        verify(
          tokenData,
          getPublicKey,
          {
            algorithms: ["RS256"],
            ignoreExpiration: !!options?.unsafe?.ignoreTokenExpiration,
            issuer,
          },
          (err, decoded) => {
            if (err) reject(err);
            if (!decoded) reject({ message: "Could not verify JWT." });
            resolve(decoded as JwtPayload);
          }
        );
      });
    }

    let result;
    try {
      result = await verifyAsync();
    } catch (err) {
      return error(401, "", err);
    }

    // See if there's a redirect_to cookie we should use to send the user back to the desired location.
    const redirectTo = getCookie(event, "redirect_to");

    // See if redirect_to is to a preview site
    const isTargetPreview = !!redirectTo?.endsWith("/.netlify/functions/auth");

    // If we're just POSTing over to the preview site, we can bail now
    if (isTargetPreview) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html" },
        multiValueHeaders: {
          "Set-Cookie": [
            // We should clear this cookie so it doesn't accidentally get reused later.
            createCookie("redirect_to", "", !options?.unsafe?.insecureCookies),
          ],
        },
        body: `<!DOCTYPE html>
      <html lang="en">
          <head>
              <title>Login${
                options.siteTitle ? ": " + options.siteTitle : ""
              }</title>
              <script>
              function post(path, params, method = "post") {
                const form = document.createElement("form");
                form.method = method;
                form.action = path;
              
                for (const key in params) {
                  if (params.hasOwnProperty(key)) {
                    const hiddenField = document.createElement("input");
                    hiddenField.type = "hidden";
                    hiddenField.name = key;
                    hiddenField.value = params[key];
              
                    form.appendChild(hiddenField);
                  }
                }
              
                document.body.appendChild(form);
                form.submit();
              }
              </script>
          </head>
          <body>
              <p>Redirecting to preview site...</p>
              ${
                options?.unsafe?.debug
                  ? `
              <p>
                <button onClick='javascript:post("${redirectTo}", {id_token: "${tokenData}"})'>
                  Proceed with POST of token
                </button>
                (debug mode)
              </p>
              <h2>Event</h2>
              <pre>${JSON.stringify(event, undefined, 2)}</pre>
              <h2>Context</h2>
              <pre>${JSON.stringify(context, undefined, 2)}</pre>
              `
                  : `
              <script>
                post("${redirectTo}", {id_token: "${tokenData}"});
              </script>
              `
              }
          </body>
      </html>`,
      };
    }

    // Construct a new JWT that Netlify will understand
    const userData = {
      sub: result.sub,
      email: result.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      app_metadata: {
        authorization: {
          roles: result.roles,
        },
      },
    };

    const newToken = sign(userData, options.jwtSecret, {
      algorithm: "HS256",
    });

    // Build a client_id we can use from client-side JS for Segment
    const clientId = `${userData.sub}|${userData.email}`;

    // Return a redirect to the home page (or redirect_to URL) along with the requisite cookies.
    return {
      statusCode: 302,
      multiValueHeaders: {
        "Set-Cookie": [
          // This is the cookie that Netlify looks for to ensure the user is authenticated.
          createCookie(
            "nf_jwt",
            newToken,
            !options?.unsafe?.insecureCookies,
            true
          ),

          // This is a cookie our app uses to identify the user when tracking with Segment.
          createCookie(
            "client_id",
            clientId,
            !options?.unsafe?.insecureCookies
          ),

          // We should clear this cookie so it doesn't accidentally get reused later.
          createCookie("redirect_to", "", !options?.unsafe?.insecureCookies),
        ],
      },
      headers: {
        Location: getLocation(redirectTo),
        ...jsonContentTypeHeader,
      },
      body: options?.unsafe?.debug ? JSON.stringify(userData) : "{}",
    };
  };

  return handler;
}

function getLocation(redirectTo: string | undefined): string {
  if (
    redirectTo &&
    (redirectTo.startsWith("/") || redirectTo.startsWith("http"))
  ) {
    return redirectTo;
  }

  return "/";
}
