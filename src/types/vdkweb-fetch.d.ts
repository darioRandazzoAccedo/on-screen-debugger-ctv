declare module '@accedo/vdkweb-fetch' {
  const fetch: (url: string, options?: RequestInit) => Promise<Response>;

  export default fetch;
}
