/*
 Helper to parse query string params
 */
$.extend({
  getUrlVars: function() {
    var hash, hashes, i, vars;
    vars = [];
    hash = void 0;
    hashes = window.location.href.slice(window.location.href.indexOf("?") + 1).split("&");
    i = 0;
    while (i < hashes.length) {
      hash = hashes[i].split("=");
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
      i++;
    }
    return vars;
  },
  getUrlVar: function(name) {
    return $.getUrlVars()[name];
  }
});

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var getToken = function() {
  if (token) {
    return "access_token=" + token;
  } else {
    return "";
  }
}

var makeTime = function(result) {
  var time = document.createElement("div");
  time.className = "time";
  time.innerHTML = "<relative-time datetime=\"" + result.created_at + "\">" + ($.timeago(result.created_at)) + "</relative-time>"
  return time;
}

var makeAvatar = function(result) {
  return "<a href=\"https://github.com/" + result.actor.login + "\"><img alt=\"@" + result.actor.login + "\" class=\"gravatar\" height=\"30\" src=\"" + result.actor.avatar_url + "&s=60\" width=\"30\" /></a>";
}

var makeLink = function(result, href, text, actor, title, cls) {
  var titleTag = "";
  var classTag = "";
  if (typeof title != "undefined") {
    titleTag = " title=\"" + title + "\"";
  }
  if (typeof cls != "undefined") {
    classTag = " class=\"" + cls + "\"";
  }
  return "<a href=\"" + href + "\"" + classTag + " data-ga-click=\"News feed, event click, Event click type:" + result.type + " target:" + actor + "\"" + titleTag + ">" + text + "</a>";
};

var makeCommit = function(commit, result) {
  var li = document.createElement("li");
  var url = commit.html_url;
  if (typeof url == "undefined") {
    url = "https://github.com/" + result.repo.name + "/commit/" + commit.sha;
  }
  li.innerHTML = "<span title=\"" + commit.author.login + "\">\n<img alt=\"" + commit.author.login + "\" height=\"16\" src=\"" + commit.author.avatar_url + "&amp;s=32\" width=\"16\" />\n</span>\n<code><a href=\"" + url + "\" data-ga-click=\"News feed, event click, Event click type:PushEvent target:sha\">" + commit.sha.substring(0, 7) + "</a></code>\n<div class=\"message\">\n<blockquote>\n" + commit.message + "\n</blockquote>\n</div>"
  return li;
}

var parseMarkdown = function(text, context) {
  var message = document.createElement("div");
  message.className = "message markdown-body";
  var blockquote = document.createElement("blockquote");
  message.appendChild(blockquote);
  $.ajax("https://api.github.com/markdown?" + getToken(), {
      data: JSON.stringify({
        "text": text,
        "mode": "gfm",
        "context": context
      }),
      contentType: "application/json",
      dataType: "html",
      type: "post"
    }).success(function(response) {
      blockquote.innerHTML = response;
      return true;
    });
  return message;
}

var loadFeeds = function(grp) {
  var author, branch, ref, commit_cb, callback, limit, params, repo, title, url, urls, username, results, keys, dash, ajax, i, j;
  params = $.getUrlVars();
  group = groups[grp];
  limit = params.limit;
  results = new Object();
  keys = [];
  dash = $('#dashboard');
  dash.empty();
  var switcher = document.createElement("div");
  switcher.className = "select-menu account-switcher js-menu-container js-select-menu";
  switcher.innerHTML = "<button class=\"btn select-menu-button js-menu-target\" aria-haspopup=\"true\" aria-expanded=\"false\" aria-label=\"Switch account context\" type=\"button\" data-ga-click=\"Dashboard, click, Opened account context switcher\">\n<span class=\"js-select-button css-truncate css-truncate-target\">" + grp + "</span>\n</button>";
  dash.append(switcher);
  var holder = document.createElement("div");
  holder.className = "select-menu-modal-holder js-menu-content js-navigation-container";
  var menu = document.createElement("div");
  menu.className = "select-menu-modal select-menu-list";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-labelledby", "context-switch-title");
  for (g in groups) {
    if (groups.hasOwnProperty(g)) {
      selected = g == grp ? " selected" : "";
      menu.innerHTML += "<a href=\"?group=" + g + "&token=" + token + "\" role=\"menuitem\" class=\"select-menu-item js-navigation-item js-navigation-open" + selected + "\"><svg aria-hidden=\"true\" class=\"octicon octicon-check select-menu-item-icon\" height=\"16\" version=\"1.1\" viewBox=\"0 0 12 16\" width=\"12\"><path fill-rule=\"evenodd\" d=\"M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5z\"/></svg><span class=\"select-menu-item-text\">" + g + "</span></a>"
    }
  }
  holder.appendChild(menu);
  switcher.appendChild(holder);
  switcher.innerHTML += "<div class=\"float-right\"><a href=\"#\" id=\"token-text\" style=\"display:block\" onclick=\"this.style.display='none'; document.getElementById('token-form').style.display = 'block'; return false;\">Change token</a><form id=\"token-form\" style=\"display:none\"><input type=\"hidden\" name=\"group\" value=\"" + grp + "\"><input class=\"form-control\" id=\"token\" type=\"text\" name=\"token\" value=\"" + token + "\" size=\"36\">&nbsp;<input class=\"btn\" type=\"submit\" value=\"Use\"></form></div>";
  commit_cb = function(response, id, h) {
    if (response.data.author == null) {
      results[id].payload.commits[h].author = {
        "login": results[id].payload.commits[h].author.name,
        "avatar_url": "https://camo.githubusercontent.com/cb4bdc3bef6afa9598846faa814977d47ecce847/68747470733a2f2f312e67726176617461722e636f6d2f6176617461722f38313766393462616130333637633839653265313336323236366434353733323f643d68747470732533412532462532466173736574732d63646e2e6769746875622e636f6d253246696d6167657325324667726176617461727325324667726176617461722d757365722d3432302e706e6726723d7826733d313430?"
      }
    } else {
      results[id].payload.commits[h].author = response.data.author;
    }
    results[id].payload.commits[h].committer = response.data.committer;
    results[id].payload.commits[h].html_url = response.data.html_url;
    return true;
  }
  callback = function(response) {
    var index, items, result;
    items = response.data;
    for (index in items) {
      result = items[index];
      if (! result.hasOwnProperty("id")) {
        continue;
      }
      if (results.hasOwnProperty(result.id)) {
        return true;
      }
      results[result.id] = result;
    }
    return true;
  };
  urls = [];
  for (type in group) {
    if (group.hasOwnProperty(type)) {
      group[type].map(function(obj) {
        urls.push("https://api.github.com/" + type + "/" + obj + "/events")
      })
    }
  }
  ajax = urls.map(function(url) {
    return $.ajax(url + "?callback=callback&" + getToken(), {
      data: {
        per_page: limit
      },
      dataType: "jsonp",
      type: "get"
    }).success(function(response) {
      return callback(response);
    });
  });
  $.when.apply($, ajax).done(function() {
    for (id in results) {
      if (results.hasOwnProperty(id)) {
        keys.push(id);
      }
    }
    keys.sort();
    for (i = keys.length-1; i >= 0; i--) {
      result = results[keys[i]];
      var item = document.createElement("div");
      item.className = "alert ";
      var body = document.createElement("div");
      var details = document.createElement("div");
      body.className = "body";
      var title = document.createElement("div");
      title.className = "title";
      var actor = makeLink(result, "https://github.com/" + result.actor.login, result.actor.display_login, "actor");
      var action = result.type;
      if (["CreateEvent", "DeleteEvent", "ForkEvent", "MemberEvent",
           "WatchEvent"].indexOf(result.type) != -1) {
        details.className = "simple";
        if (result.type == "CreateEvent") {
          item.className += "create";
          var ref = "";
          if (result.payload.ref_type == "repository") {
            details.innerHTML = "<svg aria-label=\"Create\" class=\"octicon octicon-repo dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 12 16\" width=\"12\"><path fill-rule=\"evenodd\" d=\"M4 9H3V8h1v1zm0-3H3v1h1V6zm0-2H3v1h1V4zm0-2H3v1h1V2zm8-1v12c0 .55-.45 1-1 1H6v2l-1.5-1.5L3 16v-2H1c-.55 0-1-.45-1-1V1c0-.55.45-1 1-1h10c.55 0 1 .45 1 1zm-1 10H1v2h2v-1h3v1h5v-2zm0-10H2v9h9V1z\"/></svg>";
          } else {
            var cls = "";
            if (result.payload.ref_type == "branch") {
              details.innerHTML = "<svg aria-label=\"Create\" class=\"octicon octicon-git-branch dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 10 16\" width=\"10\"><path fill-rule=\"evenodd\" d=\"M10 5c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v.3c-.02.52-.23.98-.63 1.38-.4.4-.86.61-1.38.63-.83.02-1.48.16-2 .45V4.72a1.993 1.993 0 0 0-1-3.72C.88 1 0 1.89 0 3a2 2 0 0 0 1 1.72v6.56c-.59.35-1 .99-1 1.72 0 1.11.89 2 2 2 1.11 0 2-.89 2-2 0-.53-.2-1-.53-1.36.09-.06.48-.41.59-.47.25-.11.56-.17.94-.17 1.05-.05 1.95-.45 2.75-1.25S8.95 7.77 9 6.73h-.02C9.59 6.37 10 5.73 10 5zM2 1.8c.66 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2C1.35 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2zm0 12.41c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm6-8c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z\"/></svg>";
              cls = "css-truncate css-truncate-target branch-name";
            } else {
              details.innerHTML = "<svg aria-label=\"Create\" class=\"octicon octicon-tag dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\"><path fill-rule=\"evenodd\" d=\"M7.73 1.73C7.26 1.26 6.62 1 5.96 1H3.5C2.13 1 1 2.13 1 3.5v2.47c0 .66.27 1.3.73 1.77l6.06 6.06c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41L7.73 1.73zM2.38 7.09c-.31-.3-.47-.7-.47-1.13V3.5c0-.88.72-1.59 1.59-1.59h2.47c.42 0 .83.16 1.13.47l6.14 6.13-4.73 4.73-6.13-6.15zM3.01 3h2v2H3V3h.01z\"/></svg>";
            }
            ref = makeLink(result, "https://github.com/" + result.repo.name + "/tree/" + result.payload.ref, result.payload.ref, result.payload.ref_type, result.payload.ref, cls) + " at ";
          }
          action = "created " + result.payload.ref_type + " " + ref + makeLink(result, "https://github.com/" + result.repo.name, result.repo.name, "repo");
        } else if (result.type == "DeleteEvent") {
          item.className += "delete";
          var ref = "";
          if (result.payload.ref_type == "repository") {
            details.innerHTML = "<svg aria-label=\"Delete\" class=\"octicon octicon-repo dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 12 16\" width=\"12\"><path fill-rule=\"evenodd\" d=\"M4 9H3V8h1v1zm0-3H3v1h1V6zm0-2H3v1h1V4zm0-2H3v1h1V2zm8-1v12c0 .55-.45 1-1 1H6v2l-1.5-1.5L3 16v-2H1c-.55 0-1-.45-1-1V1c0-.55.45-1 1-1h10c.55 0 1 .45 1 1zm-1 10H1v2h2v-1h3v1h5v-2zm0-10H2v9h9V1z\"/></svg>";
            branch = "";
          } else {
            var cls = "";
            if (result.payload.ref_type == "branch") {
              details.innerHTML = "<svg aria-label=\"Delete\" class=\"octicon octicon-git-branch dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 10 16\" width=\"10\"><path fill-rule=\"evenodd\" d=\"M10 5c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v.3c-.02.52-.23.98-.63 1.38-.4.4-.86.61-1.38.63-.83.02-1.48.16-2 .45V4.72a1.993 1.993 0 0 0-1-3.72C.88 1 0 1.89 0 3a2 2 0 0 0 1 1.72v6.56c-.59.35-1 .99-1 1.72 0 1.11.89 2 2 2 1.11 0 2-.89 2-2 0-.53-.2-1-.53-1.36.09-.06.48-.41.59-.47.25-.11.56-.17.94-.17 1.05-.05 1.95-.45 2.75-1.25S8.95 7.77 9 6.73h-.02C9.59 6.37 10 5.73 10 5zM2 1.8c.66 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2C1.35 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2zm0 12.41c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm6-8c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z\"/></svg>";
              cls = " class=\"branch-name\"";
            } else {
              details.innerHTML = "<svg aria-label=\"Delete\" class=\"octicon octicon-tag dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\"><path fill-rule=\"evenodd\" d=\"M7.73 1.73C7.26 1.26 6.62 1 5.96 1H3.5C2.13 1 1 2.13 1 3.5v2.47c0 .66.27 1.3.73 1.77l6.06 6.06c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41L7.73 1.73zM2.38 7.09c-.31-.3-.47-.7-.47-1.13V3.5c0-.88.72-1.59 1.59-1.59h2.47c.42 0 .83.16 1.13.47l6.14 6.13-4.73 4.73-6.13-6.15zM3.01 3h2v2H3V3h.01z\"/></svg>";
            }
            ref = "<span" + cls + ">" + result.payload.ref + "</span> at ";
          }
          action = "deleted " + result.payload.ref_type + " " + ref + makeLink(result, "https://github.com/" + result.repo.name, result.repo.name, "repo");
        } else if (result.type == "ForkEvent") {
          item.className += "fork";
          details.innerHTML = "<svg aria-label=\"Fork\" class=\"octicon octicon-repo-forked dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 10 16\" width=\"10\"><path fill-rule=\"evenodd\" d=\"M8 1a1.993 1.993 0 0 0-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 0 0 2 1a1.993 1.993 0 0 0-1 3.72V6.5l3 3v1.78A1.993 1.993 0 0 0 5 15a1.993 1.993 0 0 0 1-3.72V9.5l3-3V4.72A1.993 1.993 0 0 0 8 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z\"/></svg>";
          action = "forked " + makeLink(result, "https://github.com/" + result.repo.name, result.repo.name, "repo") + " to " + makeLink(result, result.payload.forkee.html_url, result.payload.forkee.full_name, "parent", result.payload.forkee.full_name);
        } else if (result.type == "MemberEvent") {
          item.className += "member";
          details.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"octicon octicon-person dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 12 16\" width=\"12\"><path fill-rule=\"evenodd\" d=\"M12 14.002a.998.998 0 0 1-.998.998H1.001A1 1 0 0 1 0 13.999V13c0-2.633 4-4 4-4s.229-.409 0-1c-.841-.62-.944-1.59-1-4 .173-2.413 1.867-3 3-3s2.827.586 3 3c-.056 2.41-.159 3.38-1 4-.229.59 0 1 0 1s4 1.367 4 4v1.002z\"/></svg>";
          action = "added " + makeLink(result, result.payload.member.html_url, result.payload.member.login, "member") + " to " + makeLink(result, "https://github.com/" + result.repo.name, result.repo.name, "repo");
        } else if (result.type == "WatchEvent") {
          item.className += "watch";
          details.innerHTML = "<svg aria-label=\"Watch\" class=\"octicon octicon-star dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\"><path fill-rule=\"evenodd\" d=\"M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74z\"/></svg>";
          action = "starred " + makeLink(result, "https://github.com/" + result.repo.name, result.repo.name, "repo");
        }
        item.className += " simple";
        details.appendChild(title);
        details.append("\n");
        details.appendChild(makeTime(result));
      } else {
        details.className = "details";
        details.innerHTML = makeAvatar(result);
        if (result.type == "PushEvent") {
          ref = result.payload.ref.split("/")
          ref.splice(0, 2);
          branch = ref.join("/");
          item.className += "push";
          body.innerHTML = "<svg aria-label=\"Push\" class=\"octicon octicon-git-commit dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"28\"><path fill-rule=\"evenodd\" d=\"M10.86 7c-.45-1.72-2-3-3.86-3-1.86 0-3.41 1.28-3.86 3H0v2h3.14c.45 1.72 2 3 3.86 3 1.86 0 3.41-1.28 3.86-3H14V7h-3.14zM7 10.2c-1.22 0-2.2-.98-2.2-2.2 0-1.22.98-2.2 2.2-2.2 1.22 0 2.2.98 2.2 2.2 0 1.22-.98 2.2-2.2 2.2z\"/></svg>";
          action = "pushed to " + makeLink(result, "https://github.com/" + result.repo.name + "/tree/" + branch, branch, "branch") + " at " + makeLink(result, "https://github.com/" + result.repo.name, result.repo.name, "repo")
          if (result.payload.commits.length == 0) {
            details.innerHTML += "<strong>" + branch + "</strong> is now <code>" + makeLink(result, "https://github.com/" + result.repo.name + "/commit/" + result.payload.head, result.payload.head.substring(0, 7), "commit") + "</code>";
          } else {
            var commits = document.createElement("div");
            commits.className = "commits";
            var ul = document.createElement("ul");
            commit_reqs = [];
            for (j = 1; j <= 2; j++) {
              if (j > result.payload.commits.length) break;
              (function() {
                var id = result.id;
                var coms = result.payload.commits;
                var h = coms.length-j;
                commit_reqs.push($.ajax(coms[h].url + "?callback=commit_cb&" + getToken(), {
                    dataType: "jsonp",
                    type: "get"
                  }).success(function(response) {
                    return commit_cb(response, id, h);
                  }));
              })();
            }
            (function() {
              var u = ul;
              var res = result;
              var h = keys[i];
              $.when.apply($, commit_reqs).done(function() {
                var coms = results[h].payload.commits;
                var text;
                u.append(makeCommit(coms[coms.length-1], res));
                if (coms.length >= 2) {
                  u.append(makeCommit(coms[coms.length-2], res));
                  var li = document.createElement("li");
                  li.className = "more";
                  if (coms.length == 2) {
                    text = "View comparison for these 2 commits »";
                  } else if (res.payload.size == 3) {
                    text = "1 more commit »";
                  } else {
                    text = (res.payload.size-2) + " more commits »";
                  }
                  li.innerHTML += makeLink(res, "https://github.com/" + res.repo.name + "/compare/" + res.payload.before.substring(0, 7) + "..." + res.payload.head.substring(0, 7), text, "comparison");
                  u.appendChild(li);
                }
              })
            })();
            commits.appendChild(ul);
            details.appendChild(commits);
          }
        } else if (result.type == "IssuesEvent") {
          item.className += "issues_" + result.payload.action;
          if (result.payload.action == "closed") {
            body.innerHTML = "<svg aria-label=\"Issue\" class=\"octicon octicon-issue-closed dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 16 16\" width=\"32\"><path fill-rule=\"evenodd\" d=\"M7 10h2v2H7v-2zm2-6H7v5h2V4zm1.5 1.5l-1 1L12 9l4-4.5-1-1L12 7l-1.5-1.5zM8 13.7A5.71 5.71 0 0 1 2.3 8c0-3.14 2.56-5.7 5.7-5.7 1.83 0 3.45.88 4.5 2.2l.92-.92A6.947 6.947 0 0 0 8 1C4.14 1 1 4.14 1 8s3.14 7 7 7 7-3.14 7-7l-1.52 1.52c-.66 2.41-2.86 4.19-5.48 4.19v-.01z\"/></svg>";
          } else {
            body.innerHTML = "<svg aria-label=\"Issue\" class=\"octicon octicon-issue-opened dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"28\"><path fill-rule=\"evenodd\" d=\"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z\"/></svg>";
          }
          action = result.payload.action + " issue " + makeLink(result, result.payload.issue.html_url, result.repo.name + "#" + result.payload.issue.number, "issue", result.payload.issue.title);
          details.innerHTML += "\n<div class=\"message\"><blockquote>\n" + result.payload.issue.title + "\n</blockquote>\n</div>";
        } else if (result.type == "PullRequestEvent") {
          item.className += "issues_" + result.payload.action;
          body.innerHTML = "<svg aria-label=\"Pull request\" class=\"octicon octicon-git-pull-request dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 12 16\" width=\"24\"><path fill-rule=\"evenodd\" d=\"M11 11.28V5c-.03-.78-.34-1.47-.94-2.06C9.46 2.35 8.78 2.03 8 2H7V0L4 3l3 3V4h1c.27.02.48.11.69.31.21.2.3.42.31.69v6.28A1.993 1.993 0 0 0 10 15a1.993 1.993 0 0 0 1-3.72zm-1 2.92c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zM4 3c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v6.56A1.993 1.993 0 0 0 2 15a1.993 1.993 0 0 0 1-3.72V4.72c.59-.34 1-.98 1-1.72zm-.8 10c0 .66-.55 1.2-1.2 1.2-.65 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z\"/></svg>";
          action = result.payload.action;
          if (action == "closed" && result.payload.pull_request.merged) {
            action = "merged";
          }
          details.innerHTML += "\n<div class=\"message\"><blockquote>\n" + result.payload.pull_request.title + "\n</blockquote>";
          if (action != "closed") {
            details.innerHTML += "\n</div>\n<div class=\"pull-info\"><svg aria-hidden=\"true\" class=\"octicon octicon-git-commit\" height=\"16\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\"><path fill-rule=\"evenodd\" d=\"M10.86 7c-.45-1.72-2-3-3.86-3-1.86 0-3.41 1.28-3.86 3H0v2h3.14c.45 1.72 2 3 3.86 3 1.86 0 3.41-1.28 3.86-3H14V7h-3.14zM7 10.2c-1.22 0-2.2-.98-2.2-2.2 0-1.22.98-2.2 2.2-2.2 1.22 0 2.2.98 2.2 2.2 0 1.22-.98 2.2-2.2 2.2z\"/></svg>\n<em>" + result.payload.pull_request.commits + "</em> commits with\n<em>" + result.payload.pull_request.additions + "</em> additions and\n<em>" + result.payload.pull_request.deletions + "</em> deletions</div>";
          }
          action += " pull request " + makeLink(result, result.payload.pull_request.html_url, result.repo.name + "#" + result.payload.pull_request.number, "pull", result.payload.pull_request.title);
        } else if (result.type == "CommitCommentEvent") {
          item.className += "issues_comment";
          body.innerHTML = "<svg aria-label=\"Commit comment\" class=\"octicon octicon-comment-discussion dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 16 16\" width=\"32\"><path fill-rule=\"evenodd\" d=\"M15 1H6c-.55 0-1 .45-1 1v2H1c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h1v3l3-3h4c.55 0 1-.45 1-1V9h1l3 3V9h1c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zM9 11H4.5L3 12.5V11H1V5h4v3c0 .55.45 1 1 1h3v2zm6-3h-2v1.5L11.5 8H6V2h9v6z\"/></svg>";
          action = "commented on commit " + makeLink(result, result.payload.comment.html_url, result.repo.name + "@" + result.payload.comment.commit_id.substring(0, 10), "commit-comment");
          details.appendChild(parseMarkdown(result.payload.comment.body, result.repo.name));
        } else if (result.type == "IssueCommentEvent") {
          item.className += "issues_comment";
          body.innerHTML = "<svg aria-label=\"Issue comment\" class=\"octicon octicon-comment-discussion dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 16 16\" width=\"32\"><path fill-rule=\"evenodd\" d=\"M15 1H6c-.55 0-1 .45-1 1v2H1c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h1v3l3-3h4c.55 0 1-.45 1-1V9h1l3 3V9h1c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zM9 11H4.5L3 12.5V11H1V5h4v3c0 .55.45 1 1 1h3v2zm6-3h-2v1.5L11.5 8H6V2h9v6z\"/></svg>";
          var type = "issue";
          if (typeof result.payload.issue.pull_request != "undefined") {
            type = "pull request";
          }
          action = "commented on " + type + " " + makeLink(result, result.payload.comment.html_url, result.repo.name + "#" + result.payload.issue.number, "issue-comment", result.payload.issue.title);
          details.appendChild(parseMarkdown(result.payload.comment.body, result.repo.name));
        } else if (result.type == "PullRequestReviewCommentEvent") {
          item.className += "pull_request_review_comment";
          body.innerHTML = "<svg aria-label=\"Review pull request comment\" class=\"octicon octicon-comment-discussion dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 16 16\" width=\"32\"><path fill-rule=\"evenodd\" d=\"M15 1H6c-.55 0-1 .45-1 1v2H1c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h1v3l3-3h4c.55 0 1-.45 1-1V9h1l3 3V9h1c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zM9 11H4.5L3 12.5V11H1V5h4v3c0 .55.45 1 1 1h3v2zm6-3h-2v1.5L11.5 8H6V2h9v6z\"/></svg>";
          action = "commented on pull request " + makeLink(result, result.payload.comment.html_url, result.repo.name + "#" + result.payload.pull_request.number, "pull-request-review-comment");
          details.appendChild(parseMarkdown(result.payload.comment.body, result.repo.name));
        } else if (result.type == "GollumEvent") {
          item.className += "gollum";
          body.innerHTML = "<svg aria-label=\"Gollum\" class=\"octicon octicon-book dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 16 16\" width=\"32\"><path fill-rule=\"evenodd\" d=\"M3 5h4v1H3V5zm0 3h4V7H3v1zm0 2h4V9H3v1zm11-5h-4v1h4V5zm0 2h-4v1h4V7zm0 2h-4v1h4V9zm2-6v9c0 .55-.45 1-1 1H9.5l-1 1-1-1H2c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h5.5l1 1 1-1H15c.55 0 1 .45 1 1zm-8 .5L7.5 3H2v9h6V3.5zm7-.5H9.5l-.5.5V12h6V3z\"/></svg>";
          action = "edited the " + makeLink(result, "https://github.com/" + result.repo.name, result.repo.name, "repo") + " wiki";
          var commits = document.createElement("div");
          commits.className = "commits";
          var ul = document.createElement("ul");
          for (index in result.payload.pages) {
            var page = result.payload.pages[index];
            var li = document.createElement("li");
            li.innerHTML = page.action.capitalize() + " " + makeLink(result, page.html_url, page.title, "wiki-page") + "."
            if (page.action == "edited") {
              li.innerHTML += " " + makeLink(result, page.html_url + "/_compare/" + page.sha.substring(0, 7) + "^..." + page.sha.substring(0, 7), "View the diff »", "wiki-compare");
            }
            ul.appendChild(li);
          }
          commits.appendChild(ul);
          details.appendChild(commits);
        }
        body.appendChild(makeTime(result));
        body.appendChild(title);
      }
      title.innerHTML = actor + " " + action;
      body.appendChild(details);
      item.appendChild(body);
      dash.append(item);
    }
  });
};

$(function() {
  var params = $.getUrlVars();
  var grp = params.group;
  if (typeof params.token != "undefined") {
    token = params.token;
  }
  if (!grp) {
    for (g in groups) {
      if (groups.hasOwnProperty(g)) {
        grp = g;
        break;
      }
    }
  }
  loadFeeds(grp);
});

/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 0.11.1
 * @requires jQuery v1.2.3+
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2011, Ryan McGeary (ryanonjavascript -[at]- mcgeary [*dot*] org)
 */
(function($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago;

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowFuture: false,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
      }
    },
    inWords: function(distanceMillis) {
      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }

      var seconds = Math.abs(distanceMillis) / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;

      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        return string.replace(/%d/i, value);
      }

      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 24 && substitute($l.hours, Math.round(hours)) ||
        hours < 42 && substitute($l.day, 1) ||
        days < 30 && substitute($l.days, Math.round(days)) ||
        days < 45 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.round(days / 30)) ||
        years < 1.5 && substitute($l.year, 1) ||
        substitute($l.years, Math.round(years));

      var separator = $l.wordSeparator === undefined ?  " " : $l.wordSeparator;
      return $.trim([prefix, words, suffix].join(separator));
    },
    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d\d\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      return new Date(s);
    },
    datetime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      var isTime = $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
      var iso8601 = isTime ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    }
  });

  $.fn.timeago = function() {
    var self = this;
    self.each(refresh);

    var $s = $t.settings;
    if ($s.refreshMillis > 0) {
      setInterval(function() { self.each(refresh); }, $s.refreshMillis);
    }
    return self;
  };

  function refresh() {
    var data = prepareData(this);
    if (!isNaN(data.datetime)) {
      $(this).text(inWords(data.datetime));
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if (text.length > 0) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }

  function inWords(date) {
    return $t.inWords(distance(date));
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}(jQuery));
