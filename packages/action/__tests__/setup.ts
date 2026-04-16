// Patch getOctokit to use globalThis.fetch instead of the proxy-aware fetch
// from @actions/http-client, so that nock can intercept requests in tests.
jest.mock('@actions/github', () => {
  const actual = jest.requireActual('@actions/github');
  return {
    ...actual,
    getOctokit: (token: string, options?: Record<string, unknown>) =>
      actual.getOctokit(token, {
        ...options,
        request: { ...((options as Record<string, Record<string, unknown>>)?.request ?? {}), fetch: globalThis.fetch },
      }),
  };
});
