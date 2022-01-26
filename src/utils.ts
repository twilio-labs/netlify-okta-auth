import { HandlerResponse } from "@netlify/functions";
import { keys } from "ts-transformer-keys";
import { constantCase } from "constant-case";

export const jsonContentTypeHeader = { "Content-Type": "application/json" };

export interface UnsafeFlags {
  debug?: boolean;
  ignoreTokenExpiration?: boolean;
  insecureCookies?: boolean;
}

export interface Options {
  jwtSecret?: string;
  prodBaseUrl?: string;
  oktaUrl?: string;
  siteTitle?: string;
  unsafe?: UnsafeFlags;
}

export function parseBool(
  varName: string,
  defaultValue: boolean | undefined
): boolean {
  const stringValue = (process.env?.[varName] ?? "").toLowerCase().trim();
  if (stringValue === "") return defaultValue ?? false;
  return ["true", "1", "yes"].includes(stringValue);
}

export function loadOptionsFromEnvironment(options: Options): void {
  const optionKeys = keys<Options>().filter((k) => k !== "unsafe");
  for (const optionKey of optionKeys) {
    const envVarName = "O4N_" + constantCase(optionKey);
    (options as any)[optionKey] =
      process.env?.[envVarName] ?? options[optionKey];
  }

  options.unsafe = options.unsafe ?? {};
  const unsafeKeys = keys<UnsafeFlags>();
  for (const flagKey of unsafeKeys) {
    const envVarName = "O4N_UNSAFE_" + constantCase(flagKey);
    options.unsafe[flagKey] = parseBool(envVarName, options.unsafe[flagKey]);
  }
}

export function getCookie(event: any, cookieId: string): string | undefined {
  const cookie = event.headers.cookie
    ?.split(";")
    .map((c: string) => c.trim())
    .filter((c: string) => c.startsWith(`${cookieId}=`));

  if (cookie && cookie.length > 0) {
    return cookie[0].replace(cookie[0].split("=")[0] + "=", "");
  }

  return undefined;
}

export function createCookie(
  cookieId: string,
  value: string,
  secure: boolean,
  httpOnly: boolean = false
): string {
  // Default for "secure" should be true
  secure = secure === false ? false : true;
  return (
    cookieId +
    "=" +
    value +
    (httpOnly ? "; HttpOnly" : "") +
    (secure ? "; Secure" : "") +
    "; Path=/"
  );
}

export function error(
  statusCode: number,
  message: string,
  object: any = undefined
): HandlerResponse {
  return {
    statusCode,
    headers: jsonContentTypeHeader,
    body: object ? JSON.stringify(object) : JSON.stringify({ message }),
  };
}

export function getFallbackRawUrl(
  hostHeader: string | undefined,
  path: string,
  protocol: string
): URL {
  if (!["http:", "https:"].includes(protocol))
    throw new Error(`Invalid protocol ${protocol}`);
  const base = `${protocol}//${hostHeader ? hostHeader : "localhost"}`;
  return new URL(path, base);
}
