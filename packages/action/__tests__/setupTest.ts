module.exports = async () => {
  // Follows https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables#default-environment-variables
  process.env.CI = 'false';
  process.env.GITHUB_WORKFLOW = 'CI';
  process.env.GITHUB_RUN_ID = '1';
  process.env.GITHUB_RUN_NUMBER = '42';
  process.env.GITHUB_ACTION = '123456789';
  process.env.GITHUB_ACTIONS = 'false';
  process.env.GITHUB_ACTOR = 'Codertocat';
  process.env.GITHUB_REPOSITORY = 'Codertocat/Hello-World';
  process.env.GITHUB_EVENT_NAME = 'push';
  // process.env.GITHUB_EVENT_PATH = '';
  // process.env.GITHUB_WORKSPACE = '';
  process.env.GITHUB_SHA = 'f83a356604ae3c5d03e1b46ef4d1ca77d64a90b0';
  process.env.GITHUB_REF = 'refs/heads/feature/something-new-and-shiny';
  // process.env.GITHUB_SERVER_URL = 'https://github.com';
  // process.env.GITHUB_API_URL = 'https://api.github.com';
  // process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

  process.env.GITHUB_JOB = 'build';
};
