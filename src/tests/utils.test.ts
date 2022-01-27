import {
  getCookie,
  createCookie,
  error,
  getFallbackRawUrl,
  parseBool,
  loadOptionsFromEnvironment,
  jsonContentTypeHeader,
  Options,
  validateUrl,
} from "../utils";

describe("getCookie", () => {
  test("no cookies present (empty string)", () => {
    const mockEvent = {
      headers: {
        cookie: "",
      },
    };

    expect(getCookie(mockEvent, "c")).toBe(undefined);
  });

  test("no cookies present (undefined)", () => {
    const mockEvent = {
      headers: {},
    };

    expect(getCookie(mockEvent, "c")).toBe(undefined);
  });

  test("lots of cookies, but not desired cookie", () => {
    const mockEvent = {
      headers: {
        cookie:
          'notice_behavior=implied,eu; _rdt_uuid=1122334455667.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae; client_id=00000000000000000000|anonymous@example.com; ajs_user_id="00000000000000000000"; ajs_anonymous_id="bbbbbbbb-cccc-cccc-dddd-ddddeeeeeeee"; _ga=GA1.1.1111111111.1111111111; _gid=GA1.1.1111111111.1111111112; nf_jwt=eeEeeEeeEeEeEee1EeeeeeE5eEe6eeeEEEE9.eeEeeEeeEeeeEEEeEeE3EEEeeEEFEEEEeEEeEEeeeeEeEEeeeeeeEEEee3EeZEEeEEE3eEeeee2ee20eEEEeeHEeEeE2EeEeEEeeEEeeeeEeeE9eEEEeEEE0EEe6eeEeeEEee3EeeeE0eE9eeee7eeEeeEEeeeeeeeE2EEE5e25eee19eEeeeEE0eeeeEeEeEeE1EeE4eE.EeEe9eeEEEeEE2eeEe-eeeEeE4ee-eEh6eeeeee25EE; redirect_to=; _gcl_au=1.1.11111111111111111115; _dlt=1; _mkto_trk=id:000-AAA-000&token:_mch-example.com-1111111111111-11116; bf_lead=aa11a11aaa111; _fbp=fb.1.1111111111111.1111111155; __qca=P0-1111111111-1111111111111; _hjid=afafafaf-afaf-afaf-afaf-afafafafafaf; _hp2_ses_props.1234567890={"ts":1111111111111,"d":"www.example.com","h":"/some-page"}; bf_visit=abcdefghijklm; _hp2_id.1234567890={"userId":"3333333333333333","pageviewId":"999999999999999","sessionId":"444444444444444","identity":"VIaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","trackerVersion":"4.0","identityField":"Visitor Id","isIdentified":1}; _dd_s=rum=1&id=11111111-1111-1111-1111-111111111111&created=1234567890123&expire=1234567890124',
      },
    };

    expect(getCookie(mockEvent, "c")).toBe(undefined);
  });

  test("lots of cookies and desired cookie", () => {
    const mockEvent = {
      headers: {
        cookie:
          'notice_behavior=implied,eu; c=foo; _rdt_uuid=1122334455667.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae; client_id=00000000000000000000|anonymous@example.com; ajs_user_id="00000000000000000000"; ajs_anonymous_id="bbbbbbbb-cccc-cccc-dddd-ddddeeeeeeee"; _ga=GA1.1.1111111111.1111111111; _gid=GA1.1.1111111111.1111111112; nf_jwt=eeEeeEeeEeEeEee1EeeeeeE5eEe6eeeEEEE9.eeEeeEeeEeeeEEEeEeE3EEEeeEEFEEEEeEEeEEeeeeEeEEeeeeeeEEEee3EeZEEeEEE3eEeeee2ee20eEEEeeHEeEeE2EeEeEEeeEEeeeeEeeE9eEEEeEEE0EEe6eeEeeEEee3EeeeE0eE9eeee7eeEeeEEeeeeeeeE2EEE5e25eee19eEeeeEE0eeeeEeEeEeE1EeE4eE.EeEe9eeEEEeEE2eeEe-eeeEeE4ee-eEh6eeeeee25EE; redirect_to=; _gcl_au=1.1.11111111111111111115; _dlt=1; _mkto_trk=id:000-AAA-000&token:_mch-example.com-1111111111111-11116; bf_lead=aa11a11aaa111; _fbp=fb.1.1111111111111.1111111155; __qca=P0-1111111111-1111111111111; _hjid=afafafaf-afaf-afaf-afaf-afafafafafaf; _hp2_ses_props.1234567890={"ts":1111111111111,"d":"www.example.com","h":"/some-page"}; bf_visit=abcdefghijklm; _hp2_id.1234567890={"userId":"3333333333333333","pageviewId":"999999999999999","sessionId":"444444444444444","identity":"VIaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","trackerVersion":"4.0","identityField":"Visitor Id","isIdentified":1}; _dd_s=rum=1&id=11111111-1111-1111-1111-111111111111&created=1234567890123&expire=1234567890124',
      },
    };

    expect(getCookie(mockEvent, "c")).toBe("foo");
  });

  test("lots of cookies and desired cookie with an =", () => {
    const mockEvent = {
      headers: {
        cookie:
          'notice_behavior=implied,eu; c=foo=bar; _rdt_uuid=1122334455667.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae; client_id=00000000000000000000|anonymous@example.com; ajs_user_id="00000000000000000000"; ajs_anonymous_id="bbbbbbbb-cccc-cccc-dddd-ddddeeeeeeee"; _ga=GA1.1.1111111111.1111111111; _gid=GA1.1.1111111111.1111111112; nf_jwt=eeEeeEeeEeEeEee1EeeeeeE5eEe6eeeEEEE9.eeEeeEeeEeeeEEEeEeE3EEEeeEEFEEEEeEEeEEeeeeEeEEeeeeeeEEEee3EeZEEeEEE3eEeeee2ee20eEEEeeHEeEeE2EeEeEEeeEEeeeeEeeE9eEEEeEEE0EEe6eeEeeEEee3EeeeE0eE9eeee7eeEeeEEeeeeeeeE2EEE5e25eee19eEeeeEE0eeeeEeEeEeE1EeE4eE.EeEe9eeEEEeEE2eeEe-eeeEeE4ee-eEh6eeeeee25EE; redirect_to=; _gcl_au=1.1.11111111111111111115; _dlt=1; _mkto_trk=id:000-AAA-000&token:_mch-example.com-1111111111111-11116; bf_lead=aa11a11aaa111; _fbp=fb.1.1111111111111.1111111155; __qca=P0-1111111111-1111111111111; _hjid=afafafaf-afaf-afaf-afaf-afafafafafaf; _hp2_ses_props.1234567890={"ts":1111111111111,"d":"www.example.com","h":"/some-page"}; bf_visit=abcdefghijklm; _hp2_id.1234567890={"userId":"3333333333333333","pageviewId":"999999999999999","sessionId":"444444444444444","identity":"VIaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","trackerVersion":"4.0","identityField":"Visitor Id","isIdentified":1}; _dd_s=rum=1&id=11111111-1111-1111-1111-111111111111&created=1234567890123&expire=1234567890124',
      },
    };

    expect(getCookie(mockEvent, "c")).toBe("foo=bar");
  });

  test("only desired cookie", () => {
    const mockEvent = {
      headers: {
        cookie: "c=foo",
      },
    };

    expect(getCookie(mockEvent, "c")).toBe("foo");
  });

  test("only desired cookie and semi-colon", () => {
    const mockEvent = {
      headers: {
        cookie: "c=foo;",
      },
    };

    expect(getCookie(mockEvent, "c")).toBe("foo");
  });

  test("only desired cookie and semi-colon+space", () => {
    const mockEvent = {
      headers: {
        cookie: "c=foo; ",
      },
    };

    expect(getCookie(mockEvent, "c")).toBe("foo");
  });
});

describe("createCookie", () => {
  test("secure cookie with HttpOnly", () => {
    const cookie = createCookie("foo", "bar", true, true);
    expect(cookie).toEqual("foo=bar; HttpOnly; Secure; Path=/");
  });

  test("secure cookie without HttpOnly", () => {
    const cookie = createCookie("foo", "bar", true, false);
    expect(cookie).toEqual("foo=bar; Secure; Path=/");
  });

  test("insecure cookie with HttpOnly", () => {
    const cookie = createCookie("foo", "bar", false, true);
    expect(cookie).toEqual("foo=bar; HttpOnly; Path=/");
  });

  test("insecure cookie without HttpOnly", () => {
    const cookie = createCookie("foo", "bar", false, false);
    expect(cookie).toEqual("foo=bar; Path=/");
  });
});

describe("error", () => {
  test("401 with error message", () => {
    const result = error(401, "hi there");
    expect(result).toEqual({
      statusCode: 401,
      headers: jsonContentTypeHeader,
      body: JSON.stringify({ message: "hi there" }),
    });
  });

  test("500 with error object", () => {
    const errorObject = { foo: "bar", fiz: "baz" };
    const result = error(500, "", errorObject);
    expect(result).toEqual({
      statusCode: 500,
      headers: jsonContentTypeHeader,
      body: JSON.stringify(errorObject),
    });
  });
});

describe("getFallbackRawUrl", () => {
  test("uses host header and path", () => {
    const result = getFallbackRawUrl("www.example.com", "/foo/bar", "https:");
    expect(result.toString()).toEqual("https://www.example.com/foo/bar");
  });

  test("no available host header", () => {
    const result = getFallbackRawUrl(undefined, "/foo/bar", "https:");
    expect(result.toString()).toEqual("https://localhost/foo/bar");
  });

  test("http protocol", () => {
    const result = getFallbackRawUrl(undefined, "/foo/bar", "http:");
    expect(result.toString()).toEqual("http://localhost/foo/bar");
  });

  test("invalid protocol", () => {
    expect(() => {
      getFallbackRawUrl(undefined, "/foo/bar", "ftp:");
    }).toThrowError("Invalid protocol ftp:");
  });
});

describe("parseBool", () => {
  test("returns false if no env var and no default", () => {
    expect(parseBool("FOO_BAR", undefined)).toEqual(false);
  });

  test("returns default if no env var", () => {
    expect(parseBool("FOO_BAR", true)).toEqual(true);
  });

  test("returns true for the supported env var formats", () => {
    function testValue(value: string): void {
      process.env.FOO_BAR = value;
      expect(parseBool("FOO_BAR", undefined)).toEqual(true);
    }

    try {
      testValue("true");
      testValue("TRUE");
      testValue("True");
      testValue("1");
      testValue("YES");
      testValue("yes");
      testValue("Yes");
    } finally {
      process.env.FOO_BAR = undefined;
    }
  });

  test("returns false for the unsupported env var formats", () => {
    function testValue(value: string): void {
      process.env.FOO_BAR = value;
      expect(parseBool("FOO_BAR", undefined)).toEqual(false);
    }

    try {
      testValue("false");
      testValue("no");
      testValue("0");
      testValue("42");
      testValue("there is no spoon");
    } finally {
      process.env.FOO_BAR = undefined;
    }
  });
});

describe("loadOptions", () => {
  afterEach(() => {
    for (const key in process.env) {
      if (
        Object.prototype.hasOwnProperty.call(process.env, key) &&
        key.startsWith("O4N_")
      ) {
        process.env[key] = undefined;
      }
    }
  });

  test("empty everything", () => {
    let options: Options = {};
    loadOptionsFromEnvironment(options);
    expect(options).toEqual({
      oktaUrl: undefined,
      prodBaseUrl: undefined,
      siteTitle: undefined,
      unsafe: {
        debug: false,
        ignoreTokenExpiration: false,
        insecureCookies: false,
      },
    });
  });

  const fakeOptions: Options = {
    jwtSecret: "secret!",
    oktaUrl: "okta!",
    prodBaseUrl: "prod!",
    siteTitle: "title!",
    unsafe: {
      debug: true,
      ignoreTokenExpiration: true,
      insecureCookies: true,
    },
  };

  test("keep existing settings", () => {
    let options: Options = {
      ...fakeOptions,
      unsafe: { ...fakeOptions.unsafe },
    };
    loadOptionsFromEnvironment(options);
    expect(options).toEqual(fakeOptions);
  });

  test("use environment variables", () => {
    let options: Options = {
      ...fakeOptions,
      unsafe: { ...fakeOptions.unsafe },
    };

    process.env.O4N_JWT_SECRET = "secret?";
    process.env.O4N_PROD_BASE_URL = "prod?";
    process.env.O4N_OKTA_URL = "okta?";
    process.env.O4N_SITE_TITLE = "title?";
    process.env.O4N_UNSAFE_DEBUG = "yes";
    process.env.O4N_UNSAFE_IGNORE_TOKEN_EXPIRATION = "no";
    process.env.O4N_UNSAFE_INSECURE_COOKIES = "true";

    loadOptionsFromEnvironment(options);
    expect(options).not.toEqual(fakeOptions);
    expect(options).toEqual({
      jwtSecret: "secret?",
      oktaUrl: "okta?",
      prodBaseUrl: "prod?",
      siteTitle: "title?",
      unsafe: {
        debug: true,
        ignoreTokenExpiration: false,
        insecureCookies: true,
      },
    });
  });
});

describe("validateUrl", () => {
  test("Valid, relative URL succeeds", () => {
    const result = validateUrl("/docs/foo");
    expect(result).toEqual("/docs/foo");
  });

  test("Fully qualified URL shouldn't pass", () => {
    const result = validateUrl("https://www.twilio.com/docs/foo");
    expect(result).toEqual("");
  });

  test("JavaScript URL shouldn't pass", () => {
    const result = validateUrl("javascript:alert('hi')");
    expect(result).toEqual("");
  });

  test("Injection attempt should get sanitized", () => {
    const result = validateUrl(`"; window.alert("hi"); //`);
    expect(result).toEqual("/%22;%20window.alert(%22hi%22);%20//");
  });
});
