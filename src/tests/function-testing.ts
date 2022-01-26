import {
  HandlerEvent,
  HandlerContext,
  HandlerCallback,
  HandlerResponse,
} from "@netlify/functions";

export const emptyEvent: HandlerEvent = {
  rawUrl: "",
  rawQuery: "",
  path: "",
  httpMethod: "",
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  body: null,
  isBase64Encoded: false,
};

export const emptyContext: HandlerContext = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "",
  functionVersion: "",
  invokedFunctionArn: "",
  memoryLimitInMB: "",
  awsRequestId: "",
  logGroupName: "",
  logStreamName: "",
  getRemainingTimeInMillis: function (): number {
    throw new Error("Function not implemented.");
  },
  done: function (error?: Error, result?: any): void {
    throw new Error("Function not implemented.");
  },
  fail: function (error: string | Error): void {
    throw new Error("Function not implemented.");
  },
  succeed: function (messageOrObject: any): void {
    throw new Error("Function not implemented.");
  },
};

export const emptyCallback: HandlerCallback = () => {};

export function confirmError(
  result: void | HandlerResponse,
  statusCode: number,
  message: string
): void {
  expect(result).toBeTruthy();
  expect(result?.statusCode).toEqual(statusCode);
  expect(JSON.parse(result?.body ?? "{}").message).toEqual(message);
}
