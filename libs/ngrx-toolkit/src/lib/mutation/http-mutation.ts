import {
  HttpClient,
  HttpContext,
  HttpEventType,
  HttpHeaders,
  HttpParams,
  HttpProgressEvent,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, Signal, signal } from '@angular/core';
import { defer, filter, map, tap } from 'rxjs';
import { Mutation } from './mutation';
import { rxMutation, RxMutationOptions } from './rx-mutation';

// The HttpClient defines these types as part of the method signature and
// not as a named type
export type HttpMutationRequest = {
  url: string;
  method: string;
  body?: unknown;
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  reportProgress?: boolean;
  responseType?: HttpRequest<unknown>['responseType'];
  params?:
    | HttpParams
    | Record<
        string,
        string | number | boolean | ReadonlyArray<string | number | boolean>
      >;
  withCredentials?: boolean;
  credentials?: RequestCredentials;
  keepalive?: boolean;
  priority?: RequestPriority;
  cache?: RequestCache;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  transferCache?:
    | {
        includeHeaders?: string[];
      }
    | boolean;
};

export type HttpMutationOptions<Parameter, Result, Err = unknown> = Omit<
  RxMutationOptions<Parameter, NoInfer<Result>, NoInfer<Err>>,
  'operation'
> & {
  request: (param: Parameter) => HttpMutationRequest;
  parse?: (response: unknown) => Result;
  parseError?: (error: unknown) => Err;
};

export type HttpMutation<Parameter, Result, Err = unknown> = Mutation<
  Parameter,
  Result,
  Err
> & {
  uploadProgress: Signal<HttpProgressEvent | undefined>;
  downloadProgress: Signal<HttpProgressEvent | undefined>;
  headers: Signal<HttpHeaders | undefined>;
  statusCode: Signal<string | undefined>;
};

/**
 * Creates an HTTP mutation.
 *
 * ```typescript
 * export type Params = {
 *   value: number;
 * };
 *
 * export type CounterResponse = {
 *   // httpbin.org echos the request using the
 *   // json property
 *   json: { counter: number };
 * };
 *
 * const simpleSaveUser = httpMutation({
 *   request: (userData: AddUserEntry) => ({
 *     url: 'api/users',
 *     body: userData,
 *   }),
 *   parse: Boolean,
 * })
 *
 * const saveUser = httpMutation({
 *   request: (p: Params) => ({
 *     url: `https://httpbin.org/post`,
 *     method: 'POST',
 *     body: { counter: p.value },
 *     headers: { 'Content-Type': 'application/json' },
 *   }),
 *   onSuccess: (response: CounterResponse) => {
 *     console.log('Counter sent to server:', response);
 *   },
 *   onError: (error) => {
 *     console.error('Failed to send counter:', error);
 *   },
 * });
 *
 * const result = await this.saveUser({ value: 17 });
 * if (result.status === 'success') {
 *   console.log('Successfully saved to server:', result.value);
 * }
 * else if (result.status === 'error') {
 *   console.log('Failed to save:', result.error);
 * }
 * else {
 *   console.log('Operation aborted');
 * }
 * ```
 *
 * @param options The options for the HTTP mutation.
 * @returns The HTTP mutation.
 */
export function httpMutation<Parameter, Result, Err = unknown>(
  optionsOrRequest:
    | HttpMutationOptions<Parameter, Result, Err>
    | ((param: Parameter) => HttpMutationRequest),
): HttpMutation<Parameter, Result, Err> {
  const httpClient = inject(HttpClient);

  const options =
    typeof optionsOrRequest === 'function'
      ? { request: optionsOrRequest }
      : optionsOrRequest;

  const parse = options.parse ?? ((raw: unknown) => raw as Result);
  const parseError = options.parseError ?? ((raw: unknown) => raw as Err);

  const uploadProgress = signal<HttpProgressEvent | undefined>(undefined);
  const downloadProgress = signal<HttpProgressEvent | undefined>(undefined);
  const headers = signal<HttpHeaders | undefined>(undefined);
  const statusCode = signal<string | undefined>(undefined);

  const mutation = rxMutation({
    ...options,
    operation: (param: Parameter) => {
      const httpRequest = options.request(param);

      return defer(() => {
        uploadProgress.set(undefined);
        downloadProgress.set(undefined);
        headers.set(undefined);
        statusCode.set(undefined);

        return httpClient
          .request(httpRequest.method, httpRequest.url, {
            ...httpRequest,
            observe: 'events',
            responseType: httpRequest.responseType ?? 'json',
          })
          .pipe(
            tap((response) => {
              if (response.type === HttpEventType.UploadProgress) {
                uploadProgress.set(response);
              } else if (response.type === HttpEventType.DownloadProgress) {
                downloadProgress.set(response);
              }
            }),
            filter((event) => event instanceof HttpResponse),
            tap((response) => {
              headers.set(response.headers);
              statusCode.set(response.status.toString());
            }),
            map((event) => parse(event.body)),
          );
      });
    },
  }) as HttpMutation<Parameter, Result, Err>;

  mutation.uploadProgress = uploadProgress;
  mutation.downloadProgress = downloadProgress;
  mutation.statusCode = statusCode;
  mutation.headers = headers;

  return mutation;
}
