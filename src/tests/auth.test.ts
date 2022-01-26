import * as fs from "fs";
import * as path from "path";
import { HandlerResponse, Handler } from "@netlify/functions";
import nock from "nock";
import { JwtPayload, sign, verify } from "node-jsonwebtoken";
import { getAuthHandler } from "../auth";
import {
  emptyEvent,
  emptyCallback,
  emptyContext,
  confirmError,
} from "./function-testing";
import publicKeyInfo from "./test-public-jwk.json";

const privateKey = fs.readFileSync(path.join(__dirname, "test.key.pem"));
const badPrivateKey = fs.readFileSync(path.join(__dirname, "bad.key.pem"));

describe("auth unconfigured errors", () => {
  test("returns 500 error without jwtSecret", async () => {
    const handler = getAuthHandler();
    const result = await handler(emptyEvent, emptyContext, emptyCallback);
    confirmError(result, 500, "Misconfigured application.");
  });
});

describe("auth configured errors", () => {
  let handler: Handler;

  beforeEach(() => {
    handler = getAuthHandler({ jwtSecret: "foo" });
  });

  test("returns 400 error with bad http method", async () => {
    const result = await handler(
      { ...emptyEvent, httpMethod: "GET" },
      emptyContext,
      emptyCallback
    );
    confirmError(result, 400, "Bad data received.");
  });

  test("returns 400 error with empty body", async () => {
    const result = await handler(
      { ...emptyEvent, httpMethod: "POST" },
      emptyContext,
      emptyCallback
    );
    confirmError(result, 400, "Bad data received.");
  });

  test("returns 400 error with no id_token field", async () => {
    const result = await handler(
      { ...emptyEvent, httpMethod: "POST", body: "foo=bar&fiz=baz" },
      emptyContext,
      emptyCallback
    );
    confirmError(result, 400, "Bad data received.");
  });

  test("returns 400 error with bad id_token", async () => {
    const result = await handler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body: "foo=bar&id_token=doh&fiz=baz",
      },
      emptyContext,
      emptyCallback
    );
    confirmError(result, 400, "Bad data received.");
  });
});

describe("auth - e2e token tests", () => {
  const testIssuer = "http://localhost:1337";
  const testOktaUrl = `${testIssuer}/oauth/url/here`;
  const sampleUserData = {
    sub: "some-unique-id",
    email: "foo@example.com",
    ver: 1,
    iss: testIssuer,
    aud: "some-unique-id",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    idp: "some-unique-id",
    email_verified: true,
    roles: ["Everyone"],
  };

  function getToken(userData: any, overridePrivateKey: Buffer = privateKey) {
    const token = sign(userData, overridePrivateKey, {
      algorithm: "RS256",
      keyid: publicKeyInfo.keys[0].kid,
    });

    nock(testIssuer).get("/oauth2/v1/keys").reply(200, publicKeyInfo);

    return token;
  }

  let handler: Handler;

  beforeEach(() => {
    handler = getAuthHandler({
      jwtSecret: "foo",
      oktaUrl: testOktaUrl,
    });
  });

  async function tokenTest(
    eventOverrides: object,
    expectedLocation: string,
    insecureCookies: boolean = false
  ) {
    let secure = "Secure; ";
    if (insecureCookies) {
      handler = getAuthHandler({
        jwtSecret: "foo",
        oktaUrl: testOktaUrl,
        unsafe: {
          insecureCookies: true,
        },
      });
      secure = "";
    }

    const result = (await handler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body: "id_token=" + getToken(sampleUserData),
        ...eventOverrides,
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(302);
    expect(result.headers?.Location).toEqual(expectedLocation);
    expect(result.headers?.["Content-Type"]).toEqual("application/json");
    expect(result.body).toEqual("{}");

    const cookies = result.multiValueHeaders?.["Set-Cookie"] as string[];
    expect(cookies.length).toBeGreaterThan(0);
    checkCookieString(
      cookies,
      "client_id",
      `client_id=some-unique-id|foo@example.com; ${secure}Path=/`
    );

    checkCookieString(cookies, "redirect_to", `redirect_to=; ${secure}Path=/`);

    const netlifyJwt = getCookieValue(cookies, "nf_jwt");
    const decoded = verify(netlifyJwt, "foo") as JwtPayload;
    expect(decoded.sub).toEqual(sampleUserData.sub);
  }

  test("default nf_jwt response", async () => {
    await tokenTest({}, "/");
  });

  test("default nf_jwt response with insecure cookies", async () => {
    await tokenTest({}, "/", true);
  });

  test("redirected response", async () => {
    await tokenTest(
      {
        headers: {
          cookie: "redirect_to=/docs/foo",
        },
      },
      "/docs/foo"
    );
  });

  test("expired token", async () => {
    const result = (await handler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body:
          "id_token=" +
          getToken({
            ...sampleUserData,
            iat: Math.floor(Date.now() / 1000) - 60,
            exp: Math.floor(Date.now() / 1000) - 10,
          }),
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(401);
  });

  test("ignore expired token", async () => {
    handler = getAuthHandler({
      jwtSecret: "foo",
      oktaUrl: testOktaUrl,
      unsafe: {
        ignoreTokenExpiration: true,
      },
    });

    const result = (await handler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body:
          "id_token=" +
          getToken({
            ...sampleUserData,
            iat: Math.floor(Date.now() / 1000) - 60,
            exp: Math.floor(Date.now() / 1000) - 10,
          }),
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(302);
  });

  test("untrusted token signature", async () => {
    const result = (await handler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body: "id_token=" + getToken(sampleUserData, badPrivateKey),
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(401);
  });

  test("redirect token to preview site", async () => {
    const token = getToken(sampleUserData);
    const result = (await handler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body: "id_token=" + token,
        headers: {
          cookie:
            "redirect_to=https://preview-123.netlify.app/.netlify/functions/auth",
        },
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(200);
    expect(result.headers?.["Content-Type"]).toEqual("text/html");

    const body = result.body ?? "";
    expect(body).toContain("<title>Login</title>");
    expect(body).toContain("Redirecting to preview site...");
    expect(body).toContain(
      `post("https://preview-123.netlify.app/.netlify/functions/auth", {id_token: "${token}"});`
    );

    const cookies = result.multiValueHeaders?.["Set-Cookie"] as string[];
    expect(cookies.length).toBeGreaterThan(0);
    checkCookieString(cookies, "redirect_to", "redirect_to=; Secure; Path=/");
  });

  test("redirect token to preview site in debug mode", async () => {
    handler = getAuthHandler({
      jwtSecret: "foo",
      oktaUrl: testOktaUrl,
      unsafe: {
        debug: true,
      },
    });

    const token = getToken(sampleUserData);
    const result = (await handler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body: "id_token=" + token,
        headers: {
          cookie:
            "redirect_to=https://preview-123.netlify.app/.netlify/functions/auth",
        },
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(200);
    expect(result.headers?.["Content-Type"]).toEqual("text/html");

    const body = result.body ?? "";
    expect(body).toContain("<title>Login</title>");
    expect(body).toContain("Redirecting to preview site...");
    expect(body).toContain(
      `<button onClick='javascript:post("https://preview-123.netlify.app/.netlify/functions/auth", {id_token: "${token}"})'>`
    );
  });

  test("redirect token to preview site - with custom title", async () => {
    const customHandler = getAuthHandler({
      jwtSecret: "foo",
      oktaUrl: testOktaUrl,
      siteTitle: "My Cool Site",
    });
    const result = (await customHandler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body: "id_token=" + getToken(sampleUserData),
        headers: {
          cookie:
            "redirect_to=https://preview-123.netlify.app/.netlify/functions/auth",
        },
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(200);
    expect(result.body).toContain("<title>Login: My Cool Site</title>");
  });

  test("redirect token to preview site - with insecure cookie", async () => {
    const customHandler = getAuthHandler({
      jwtSecret: "foo",
      oktaUrl: testOktaUrl,
      unsafe: {
        insecureCookies: true,
      },
    });
    const result = (await customHandler(
      {
        ...emptyEvent,
        httpMethod: "POST",
        body: "id_token=" + getToken(sampleUserData),
        headers: {
          cookie:
            "redirect_to=https://preview-123.netlify.app/.netlify/functions/auth",
        },
      },
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    expect(result.statusCode).toEqual(200);
    const cookies = result.multiValueHeaders?.["Set-Cookie"] as string[];
    expect(cookies.length).toBeGreaterThan(0);
    checkCookieString(cookies, "redirect_to", "redirect_to=; Path=/");
  });
});

function getCookieValue(cookies: string[], cookieId: string): string {
  const cookieString = getCookie(cookies, cookieId);
  return cookieString?.split("=")[1].split(";")[0];
}

function getCookie(cookies: string[], cookieId: string): string {
  const cookieString = cookies.find((value) =>
    value.startsWith(cookieId + "=")
  );
  if (!cookieString) {
    throw new Error(`Cannot find cookie ${cookieId}`);
  }
  return cookieString;
}

function checkCookieString(
  cookies: string[],
  cookieId: string,
  expectedString: string
): void {
  expect(getCookie(cookies, cookieId)).toEqual(expectedString);
}
