# GitHub event feeds

A GitHub event feed viewer which allows setting up and switching between multiple groups of feeds.

Available under the [MIT license](LICENSE). Includes the [`timeago`](https://github.com/rmm5t/jquery-timeago) jQuery plugin by [Ryan McGeary](https://github.com/rmm5t), which is also available under the same license.

## Installation

Clone or download the repository, and then copy `settings.js.sample` into `settings.js`. You can then edit this file to set up your feeds.

### Access token

Since this application makes heavy use of the GitHub API, you will want to create an access token:

1. On GitHub, click on your profile icon in the upper right corner and then choose *Settings*.
2. In the left sidebar under **Developer settings**, choose *Personal access tokens*.
3. Click on **Generate new token** and give the token a name (say, *github-feeds*). Then click on **Generate token** below (no extra privileges are required).

The access token will appear in the list, so you can copy it into `settings.js`, e.g.
```js
var token = "0123456789abcdef0123456789abcdef01234567";
```

Usage is also possible without the token, however expect to exceed the API hourly limit extremely quickly.

### Feed groups

You can now set up the groups of feeds you want to view. In `settings.js`, the `groups` object contains an entry for each group, which in turn is an object with the following entries:
* `users`: a list of users whose feeds are included in the group (as if following the specified users),
* `repos`: a list of repositories whose feeds are included in the group (as if watching the specifies repositories),
* `networks`: a list of repositories whose network feeds are included in the group (as if watching the feed and all its forks), and
* `orgs`: a list of organizations whose feeds are included in the group (as if watching all repositories belonging to the organization).

## Usage

To view the feeds, just open `index.html` in the browser. You can then choose the desired group in the dropdown menu at the top of the page (this will add the `group` parameter to the request).

Online usage is possible, but discouraged due to the API usage limit or privacy concerns, as the access token will be exposed.
