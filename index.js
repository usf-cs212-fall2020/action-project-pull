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
## Student Information

Provide this information below so we know which grade to update.

- **Full Name**: [FULL_NAME]
- **USF Email**: [USERNAME]

<sub><em>
:bulb: *Change the \`[FULL_NAME]\` and \`[USERNAME]\` fields above to your full name and USF username. Replace the \`[\` and \`]\` symbols as well. For example, enter \`Sophie Engle\` instead of \`[Sophie Engle]\` for the \`[FULL_NAME]\` field.*
</em></sub>

## Last Code Review

Provide the pull request from your last code review below.

- **Verification**: [VERIFY_ISSUE]
- **Last Code Review**: [REVIEW_PR]

<sub><em>
:bulb: *Change \`[VERIFY_ISSUE]\` to the verification issue for this project and \`[REVIEW_PR]\` to the pull request for your last code review. See [this guide](https://docs.github.com/en/github/writing-on-github/autolinked-references-and-urls#issues-and-pull-requests) for how to link to issues and pull requests. If this is your first code review, enter \`N/A\` for the "Last Code Review" field instead.*
</em></sub>

## Instructions

A comment with a link to the [CodeClimate](https://codeclimate.com/) analysis of your repository will be added automatically once this pull request is opened.

**Ignore the number of issues reported.** Click the "View more on Code Climate" link and then the "Overview" tab to view the rating for your repository.

**Your code must have a \`B\` or above rating to qualify for code review.** If your rating is lower than that, close this pull request. Use the CodeClimate dashboard to identify issues, fix enough issues for the rating to improve to \`B\` or higher, and then create a **new release** before requesting code review.
`;

    const miles = await octokit.issues.listMilestones({
      owner: context.payload.organization.login,
      repo: context.payload.repository.name,
    });

    const found = miles.data.find(r => r.title === `Project ${project}`);

    if (found === undefined) {
      core.setFailed(`Unable to find the "Project ${project}" milestone.`);
    }
    else {
      const request = await octokit.pulls.create({
        owner: context.payload.organization.login,
        repo: context.payload.repository.name,
        title: `Review: Project ${release}`,
        head: `review/${release}`,
        base: 'main',
        maintainer_can_modify: true,
        draft: true,
        body: body
      });

      core.info(`Pull request #${request.data.number} created.`);

      await octokit.issues.createComment({
        owner: context.payload.organization.login,
        repo: context.payload.repository.name,
        issue_number: request.data.number,
        body: `
## :tada: Release Verified!

Identified [passing workflow run](${run_url}) for the \`${release}\` release.
`
      });

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
## :ballot_box_with_check: TODO @${context.actor}

  - [ ] Update the pull request body with your name, email, the verification issue, and the pull request from your last code review.

  - [ ] Verify you have a \`B\` or higher rating of your code on the CodeClimate dashboard. If not, **close this request**, fix the issues, and create a new release.

  - [ ] Mark this pull request as [ready to review](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/changing-the-stage-of-a-pull-request#marking-a-pull-request-as-ready-for-review) when done!
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
