import { HandlerResponse, HandlerEvent } from "@netlify/functions";
import { getLoginHandler } from "../login";
import { Options } from "../utils";
import {
  emptyEvent,
  emptyCallback,
  emptyContext,
  confirmError,
} from "./function-testing";

const fakeOktaUrl = "https://foo.okta.com/foo/bar";

describe("login", () => {
  const loginEvent = {
    ...emptyEvent,
    rawUrl: "http://localhost:8888/.netlify/functions/login",
  };

  test("no configured production url", async () => {
    const handler = getLoginHandler();
    const result = await handler(loginEvent, emptyContext, emptyCallback);
    confirmError(result, 500, "Production URL not configured.");
  });

  test("no configured OKTA url", async () => {
    const handler = getLoginHandler({ prodBaseUrl: "http://localhost:8888" });
    const result = await handler(loginEvent, emptyContext, emptyCallback);
    confirmError(result, 500, "OKTA URL not configured.");
  });

  const commonOptions = {
    prodBaseUrl: "http://localhost:8888",
    oktaUrl: fakeOktaUrl,
  };

  interface RedirectTestArgs {
    expectedRedirectCookie?: string;
    expectedTitle?: string;
    expectedRedirectUrl?: string;
    expectedTargetLabel?: string;
    options?: Options;
    event?: HandlerEvent;
  }

  async function redirectTest({
    expectedRedirectCookie = `" + window.location.href + "`,
    expectedTitle = "",
    expectedRedirectUrl = fakeOktaUrl,
    expectedTargetLabel = "Okta",
    options = commonOptions,
    event = loginEvent,
  }: RedirectTestArgs): Promise<void> {
    const handler = getLoginHandler(options);
    const result = (await handler(
      event,
      emptyContext,
      emptyCallback
    )) as HandlerResponse;

    const body = result.body ?? "";
    expect(result.statusCode).toEqual(200);
    expect(body).toContain(
      "<title>Login" + (expectedTitle ? ": " + expectedTitle : "") + "</title>"
    );
    expect(body).toContain(`Redirecting to ${expectedTargetLabel} to login...`);
    expect(body).toContain(
      `document.cookie = "redirect_to=${expectedRedirectCookie}; path=/";`
    );

    if (options.unsafe?.debug) {
      expect(body).toContain(
        `a href="${expectedRedirectUrl}">Proceed to ${expectedTargetLabel}</a> (local dev mode)`
      );
    } else {
      expect(body).toContain(
        `window.location.href = "${expectedRedirectUrl}";`
      );
    }
  }

  test("redirect to Okta", async () => {
    redirectTest({});
  });

  test("redirect to Okta in debug mode", async () => {
    redirectTest({
      options: {
        ...commonOptions,
        unsafe: {
          debug: true,
        },
      },
    });
  });

  test("redirect to Okta with redirect_to", async () => {
    redirectTest({
      expectedRedirectCookie: "/docs/foo",
      event: {
        ...loginEvent,
        rawUrl: loginEvent.rawUrl + "?redirect_to=%2Fdocs%2Ffoo",
        queryStringParameters: {
          redirect_to: "/docs/foo",
        },
      },
    });
  });

  test("redirect to Okta with JavaScript injection attack", async () => {
    const javaScriptInjection = `"; window.alert("hi"); //`;
    redirectTest({
      expectedRedirectCookie: "/%22;%20window.alert(%22hi%22);%20//",
      event: {
        ...loginEvent,
        rawUrl:
          loginEvent.rawUrl +
          "?redirect_to=" +
          encodeURIComponent(javaScriptInjection),
        queryStringParameters: {
          redirect_to: javaScriptInjection,
        },
      },
    });
  });

  test("redirect to Okta with redirect_to using fallback raw url", async () => {
    redirectTest({
      expectedRedirectCookie: "/docs/foo",
      event: {
        ...loginEvent,
        rawUrl: "",
        queryStringParameters: {
          redirect_to: "/docs/foo",
        },
      },
    });
  });

  test("redirect to Okta with custom title", async () => {
    redirectTest({
      expectedTitle: "My Cool Site",
      options: { ...commonOptions, siteTitle: "My Cool Site" },
    });
  });

  test("redirect to production site", async () => {
    redirectTest({
      expectedRedirectUrl:
        "https://app.example.com/.netlify/functions/login?redirect_to=http%3A%2F%2Flocalhost%3A8888%2F.netlify%2Ffunctions%2Fauth",
      expectedTargetLabel: "production site",
      options: {
        prodBaseUrl: "https://app.example.com",
      },
    });
  });
});
