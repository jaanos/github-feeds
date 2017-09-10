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

var makeTime = function(result) {
  var time = document.createElement("div");
  time.className = "time";
  time.innerHTML = "<relative-time datetime=\"" + result.created_at + "\">" + ($.timeago(result.created_at)) + "</relative-time>"
  return time;
}

var makeAvatar = function(result) {
  return "<a href=\"https://github.com/" + result.actor.login + "\"><img alt=\"@" + result.actor.login + "\" class=\"gravatar\" height=\"30\" src=\"" + result.actor.avatar_url + "&s=60\" width=\"30\" /></a>";
}

var makeCommit = function(commit) {
  var li = document.createElement("li");
  li.innerHTML = "<span title=\"" + commit.author.login + "\">\n<img alt=\"" + commit.author.login + "\" height=\"16\" src=\"" + commit.author.avatar_url + "&amp;s=32\" width=\"16\" />\n</span>\n<code><a href=\"" + commit.html_url + "\" data-ga-click=\"News feed, event click, Event click type:PushEvent target:sha\">" + commit.sha.substring(0, 7) + "</a></code>\n<div class=\"message\">\n<blockquote>\n" + commit.message + "\n</blockquote>\n</div>"
  return li;
}

$(function() {
  var author, branch, ref, commit_cb, callback, limit, params, repo, title, url, urls, username, results, keys, dash, ajax, i, j;
  params = $.getUrlVars();
  if (typeof params.group != "undefined") {
    group = groups[params.group];
  }
  limit = params.limit;
  results = new Object();
  keys = [];
  dash = $('#dashboard');
  dash.empty();
  commit_cb = function(response, id, h) {
    results[id].payload.commits[h].author = response.data.author;
    results[id].payload.commits[h].committer = response.data.committer;
    results[id].payload.commits[h].html_url = response.data.html_url;
    return true;
  }
  callback = function(response) {
    var index, items, result;
    items = response.data;
    for (index in items) {
      result = items[index];
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
    return $.ajax(url + "?callback=callback&access_token=" + token, {
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
      if (typeof result.payload != "undefined" && typeof result.payload.ref != "undefined") {
        ref = result.payload.ref.split("/")
        ref.splice(0, 2);
        branch = ref.join("/");
      }
      var item = document.createElement("div");
      var body = document.createElement("div");
      var details = document.createElement("div");
      body.className = "body";
      var title = document.createElement("div");
      title.className = "title";
      if (result.type == "PushEvent") {
        item.className = "alert push";
        body.innerHTML = "<svg aria-label=\"Push\" class=\"octicon octicon-git-commit dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"28\"><path fill-rule=\"evenodd\" d=\"M10.86 7c-.45-1.72-2-3-3.86-3-1.86 0-3.41 1.28-3.86 3H0v2h3.14c.45 1.72 2 3 3.86 3 1.86 0 3.41-1.28 3.86-3H14V7h-3.14zM7 10.2c-1.22 0-2.2-.98-2.2-2.2 0-1.22.98-2.2 2.2-2.2 1.22 0 2.2.98 2.2 2.2 0 1.22-.98 2.2-2.2 2.2z\"/></svg>";
        body.appendChild(makeTime(result));
        title.innerHTML = "<a href=\"https://github.com/" + result.actor.login + "\" data-ga-click=\"News feed, event click, Event click type:PushEvent target:actor\">" + result.actor.display_login + "</a> pushed to <a href=\"https://github.com/" + result.repo.name + "/tree/" + branch + "\" data-ga-click=\"News feed, event click, Event click type:PushEvent target:branch\">" + branch + "</a> at <a href=\"https://github.com/" + result.repo.name + "\" data-ga-click=\"News feed, event click, Event click type:PushEvent target:repo\">" + result.repo.name + "</a>"
        body.appendChild(title);
        details.className = "details";
        details.innerHTML = makeAvatar(result);
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
            commit_reqs.push($.ajax(coms[h].url + "?callback=commit_cb&access_token=" + token, {
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
          var coms = results[keys[i]].payload.commits;
          $.when.apply($, commit_reqs).done(function() {
            u.append(makeCommit(coms[coms.length-1]));
            if (coms.length >= 2) {
              u.append(makeCommit(coms[coms.length-2]));
              var li = document.createElement("li");
              li.className = "more";
              var a = document.createElement("a");
              a.href = "https://github.com/" + res.repo.name + "/compare/" + res.payload.before.substring(0, 7) + "..." + res.payload.head.substring(0, 7)
              a.setAttribute("data-ga-click", "News feed, event click, Event click type:PushEvent target:comparison");
              if (coms.length == 2) {
                a.text = "View comparison for these 2 commits »";
              } else if (coms.length == 3) {
                a.text = "1 more commit »";
              } else {
                a.text = (res.payload.size-2) + " more commits »";
              }
              li.appendChild(a);
              u.appendChild(li);
            }
          })
        })();
        commits.appendChild(ul);
        details.appendChild(commits);
      } else if (result.type == "IssuesEvent") {
        if (result.payload.action == "opened" || result.payload.action == "closed") {
          item.className = "alert issues_opened";
          body.innerHTML = "<svg aria-label=\"Issue\" class=\"octicon octicon-issue-opened dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"28\"><path fill-rule=\"evenodd\" d=\"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z\"/></svg>";
          body.appendChild(makeTime(result));
          title.innerHTML = "<a href=\"https://github.com/" + result.actor.login + "\" data-ga-click=\"News feed, event click, Event click type:IssuesEvent target:actor\">" + result.actor.display_login + "</a> " + result.payload.action + " issue <a href=\"https://github.com/" + result.repo.name + "/issues/" + result.payload.issue.number + "\" data-ga-click=\"News feed, event click, Event click type:IssuesEvent target:issue\" title=\"" + result.payload.issue.title + "\">" + result.repo.name + "#" + result.payload.issue.number + "</a>"
          body.appendChild(title);
          details.className = "details";
          details.innerHTML = makeAvatar(result) + "\n<div class=\"message\"><blockquote>\n" + result.payload.issue.title + "\n</blockquote>\n</div>";
        }
      } else if (result.type == "PullRequestEvent") {
        if (result.payload.action == "opened" || result.payload.action == "closed") {
          item.className = "alert issues_" + result.payload.action;
          body.innerHTML = "<svg aria-label=\"Pull request\" class=\"octicon octicon-git-pull-request dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 12 16\" width=\"24\"><path fill-rule=\"evenodd\" d=\"M11 11.28V5c-.03-.78-.34-1.47-.94-2.06C9.46 2.35 8.78 2.03 8 2H7V0L4 3l3 3V4h1c.27.02.48.11.69.31.21.2.3.42.31.69v6.28A1.993 1.993 0 0 0 10 15a1.993 1.993 0 0 0 1-3.72zm-1 2.92c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zM4 3c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v6.56A1.993 1.993 0 0 0 2 15a1.993 1.993 0 0 0 1-3.72V4.72c.59-.34 1-.98 1-1.72zm-.8 10c0 .66-.55 1.2-1.2 1.2-.65 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z\"/></svg>";
          body.appendChild(makeTime(result));
          var action = result.payload.action;
          if (action == "closed" && result.payload.pull_request.merged) {
            action = "merged";
          }
          title.innerHTML = "<a href=\"https://github.com/" + result.actor.login + "\" data-ga-click=\"News feed, event click, Event click type:PullRequestEvent target:actor\">" + result.actor.display_login + "</a> " + action + " pull request <a href=\"https://github.com/" + result.repo.name + "/pull/" + result.payload.pull_request.number + "\" data-ga-click=\"News feed, event click, Event click type:PullRequestEvent target:pull\" title=\"" + result.payload.pull_request.title + "\">" + result.repo.name + "#" + result.payload.pull_request.number + "</a>"
          body.appendChild(title);
          details.className = "details";
          details.innerHTML = makeAvatar(result) + "\n<div class=\"message\"><blockquote>\n" + result.payload.pull_request.title + "\n</blockquote>\n</div>\n<div class=\"pull-info\"><svg aria-hidden=\"true\" class=\"octicon octicon-git-commit\" height=\"16\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\"><path fill-rule=\"evenodd\" d=\"M10.86 7c-.45-1.72-2-3-3.86-3-1.86 0-3.41 1.28-3.86 3H0v2h3.14c.45 1.72 2 3 3.86 3 1.86 0 3.41-1.28 3.86-3H14V7h-3.14zM7 10.2c-1.22 0-2.2-.98-2.2-2.2 0-1.22.98-2.2 2.2-2.2 1.22 0 2.2.98 2.2 2.2 0 1.22-.98 2.2-2.2 2.2z\"/></svg>\n<em>" + result.payload.pull_request.number + "</em> commits with\n<em>" + result.payload.pull_request.additions + "</em> additions and\n<em>" + result.payload.pull_request.deletions + "</em> deletions</div>";
        }
      } else if (result.type == "CommitCommentEvent") {
        item.className = "alert issues_comment";
        body.innerHTML = "<svg aria-label=\"Commit comment\" class=\"octicon octicon-comment-discussion dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 16 16\" width=\"32\"><path fill-rule=\"evenodd\" d=\"M15 1H6c-.55 0-1 .45-1 1v2H1c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h1v3l3-3h4c.55 0 1-.45 1-1V9h1l3 3V9h1c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zM9 11H4.5L3 12.5V11H1V5h4v3c0 .55.45 1 1 1h3v2zm6-3h-2v1.5L11.5 8H6V2h9v6z\"/></svg>";
        body.appendChild(makeTime(result));
        title.innerHTML = "<a href=\"https://github.com/" + result.actor.login + "\" data-ga-click=\"News feed, event click, Event click type:CommitCommentEvent target:actor\">" + result.actor.display_login + "</a> commented on commit <a href=\"https://github.com/" + result.repo.name + "/commit/" + result.payload.comment.commit_id + "#commitcomment-" + result.payload.comment.id + "\" data-ga-click=\"News feed, event click, Event click type:CommitCommentEvent target:commit-comment\">" + result.repo.name + "@" + result.payload.comment.commit_id.substring(0, 7) + "</a>"
        body.appendChild(title);
        details.className = "details";
        details.innerHTML = makeAvatar(result) + "\n<div class=\"message markdown-body\"><blockquote>\n" + result.payload.comment.body + "\n</blockquote>\n</div>";
      } else if (result.type == "IssueCommentEvent") {
        if (result.payload.action == "created") {
          item.className = "alert issues_comment";
          body.innerHTML = "<svg aria-label=\"Issue comment\" class=\"octicon octicon-comment-discussion dashboard-event-icon\" height=\"32\" role=\"img\" version=\"1.1\" viewBox=\"0 0 16 16\" width=\"32\"><path fill-rule=\"evenodd\" d=\"M15 1H6c-.55 0-1 .45-1 1v2H1c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h1v3l3-3h4c.55 0 1-.45 1-1V9h1l3 3V9h1c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zM9 11H4.5L3 12.5V11H1V5h4v3c0 .55.45 1 1 1h3v2zm6-3h-2v1.5L11.5 8H6V2h9v6z\"/></svg>";
          body.appendChild(makeTime(result));
          var type = "issue";
          if (typeof result.payload.issue.pull_request != "undefined") {
            type = "pull request";
          }
          title.innerHTML = "<a href=\"https://github.com/" + result.actor.login + "\" data-ga-click=\"News feed, event click, Event click type:IssueCommentEvent target:actor\">" + result.actor.display_login + "</a> commented on " + type + " <a href=\"" + result.payload.issue.html_url + "#issuecomment-" + result.payload.comment.id + "\" data-ga-click=\"News feed, event click, Event click type:IssueCommentEvent target:issue-comment\" title=\"" + result.payload.issue.title + "\">" + result.repo.name + "#" + result.payload.issue.number + "</a>"
          body.appendChild(title);
          details.className = "details";
          details.innerHTML = makeAvatar(result) + "\n<div class=\"message markdown-body\"><blockquote>\n" + result.payload.comment.body + "\n</blockquote>\n</div>";
        }
      } else if (result.type == "CreateEvent") {
        item.className = "alert create simple";
        details.className = "simple";
        details.innerHTML = "<svg aria-label=\"Create\" class=\"octicon octicon-git-branch dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 10 16\" width=\"10\"><path fill-rule=\"evenodd\" d=\"M10 5c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v.3c-.02.52-.23.98-.63 1.38-.4.4-.86.61-1.38.63-.83.02-1.48.16-2 .45V4.72a1.993 1.993 0 0 0-1-3.72C.88 1 0 1.89 0 3a2 2 0 0 0 1 1.72v6.56c-.59.35-1 .99-1 1.72 0 1.11.89 2 2 2 1.11 0 2-.89 2-2 0-.53-.2-1-.53-1.36.09-.06.48-.41.59-.47.25-.11.56-.17.94-.17 1.05-.05 1.95-.45 2.75-1.25S8.95 7.77 9 6.73h-.02C9.59 6.37 10 5.73 10 5zM2 1.8c.66 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2C1.35 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2zm0 12.41c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm6-8c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z\"/></svg>"
        title.innerHTML = "<a href=\"https://github.com/" + result.actor.login + "\" data-ga-click=\"News feed, event click, Event click type:CreateEvent target:actor\">" + result.actor.login + "</a> created " + result.payload.ref_type + " <a href=\"https://github.com/" + result.repo.name + "/tree/" + result.payload.ref + "\" class=\"css-truncate css-truncate-target branch-name\" data-ga-click=\"News feed, event click, Event click type:CreateEvent target: branch link\" title=\"" + result.payload.ref + "\">" + result.payload.ref + "</a> at <a href=\"https://github.com/" + result.repo.name + "\" data-ga-click=\"News feed, event click, Event click type:CreateEvent target:repo\">" + result.repo.name + "</a>"
        details.appendChild(title);
        details.append("\n");
        details.appendChild(makeTime(result));
      } else if (result.type == "DeleteEvent") {
        item.className = "alert delete simple";
        details.className = "simple";
        details.innerHTML = "<svg aria-label=\"Delete\" class=\"octicon octicon-git-branch dashboard-event-icon\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 10 16\" width=\"10\"><path fill-rule=\"evenodd\" d=\"M10 5c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v.3c-.02.52-.23.98-.63 1.38-.4.4-.86.61-1.38.63-.83.02-1.48.16-2 .45V4.72a1.993 1.993 0 0 0-1-3.72C.88 1 0 1.89 0 3a2 2 0 0 0 1 1.72v6.56c-.59.35-1 .99-1 1.72 0 1.11.89 2 2 2 1.11 0 2-.89 2-2 0-.53-.2-1-.53-1.36.09-.06.48-.41.59-.47.25-.11.56-.17.94-.17 1.05-.05 1.95-.45 2.75-1.25S8.95 7.77 9 6.73h-.02C9.59 6.37 10 5.73 10 5zM2 1.8c.66 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2C1.35 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2zm0 12.41c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm6-8c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z\"/></svg>"
        title.innerHTML = "<a href=\"https://github.com/" + result.actor.login + "\" data-ga-click=\"News feed, event click, Event click type:DeleteEvent target:actor\">" + result.actor.login + "</a> deleted " + result.payload.ref_type + " <span class=\"branch-name\">" + result.payload.ref + "</span> at <a href=\"https://github.com/" + result.repo.name + "\" data-ga-click=\"News feed, event click, Event click type:DeleteEvent target:repo\">" + result.repo.name + "</a>"
        details.appendChild(title);
        details.append("\n");
        details.appendChild(makeTime(result));
      }
      body.appendChild(details);
      item.appendChild(body);
      dash.append(item);
    }
  });
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