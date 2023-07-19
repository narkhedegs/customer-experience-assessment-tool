export class ApiError extends Error {
  url: string;
  httpResponse: Response;
  response: any;

  constructor({
    url,
    httpResponse,
    response
  }: {
    url: string;
    httpResponse: Response;
    response: any;
  }) {
    super();
    this.url = url;
    this.httpResponse = httpResponse;
    this.response = response;
  }
}
