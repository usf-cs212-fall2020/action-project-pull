const core = require('@actions/core');
const github = require('@actions/github');
const context = github.context;

async function run() {
  try {
    const octokit = github.getOctokit(core.getInput('token'));
    const release = core.getInput('release_number');
    const project = core.getInput('project_number');
    const run_url = core.getInput('url');

    core.info(`Creating pull request for release ${release}...`);

    const body = `
### Student Information

Provide this information below so we know which grade to update.

- **Full Name**: [FULL_NAME]
- **USF Email**: [USERNAME]

:bulb: *Change the \`[FULL_NAME]\` and \`[USERNAME]\` fields above to your full name and USF username. Replace the \`[\` and \`]\` symbols as well. For example, enter \`Sophie Engle\` instead of \`[Sophie Engle]\` for the \`[FULL_NAME]\` field.*

### Last Code Review

- **Pull Request**: [PULL_REQUEST]

HERE HERE HERE

### Instructions

A comment with the code quality of your project will be added *automatically* once this pull request is opened. Your code must have a \`B\` or above rating to quality.
    `;

    const request = await octokit.pulls.create({
      owner: context.payload.organization.login,
      repo: context.payload.repository.name,
      title: `Review: Project ${release}`,
      head: `review/${release}`,
      base: 'main',
      maintainer_can_modify: true,
      body: body
    });

    core.info(`Pull request #${request.data.number} created.`);

    core.info(JSON.stringify(request));

    const miles = await octokit.issues.listMilestones({
      owner: context.payload.organization.login,
      repo: context.payload.repository.name,
    });

    core.info(JSON.stringify(miles));

    const found = miles.data.find(r => r.title === `Project ${project}`);

    if (found === undefined) {
      core.setFailed(`Unable to find the "Project ${project}" milestone.`);
    }
    else {
      await octokit.issues.update({
        owner: context.payload.organization.login,
        repo: context.payload.repository.name,
        issue_number: request.data.number,
        milestone: found.number,
        labels: ['review', `project${project}`],
        assignees: ['josecorella']
      });

      core.info(`Details for pull request #${request.data.number} updated.`);

      await octokit.issues.createComment({
        owner: context.payload.organization.login,
        repo: context.payload.repository.name,
        issue_number: request.data.number,
        body: `
## :tada: Release Verified!

Identified [passing workflow run](${run_url}) for the \`${release}\` release.
`
      });

      await octokit.issues.createComment({
        owner: context.payload.organization.login,
        repo: context.payload.repository.name,
        issue_number: request.data.number,
        body: `
### TODO @${context.actor}

  - [ ] Update the pull request body with your name and email!

### TODO @josecorella

  - [ ] Please check if this release is ready for code review!
`
      });

      core.info('Comments added.');
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();
