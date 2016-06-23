if (!window.jQuery) {
    throw new Error("[tblib/net.js] jQuery has not been loaded");
} else if (!window.TBI) {
    throw new Error("[tblib/net.js] base.js has not been loaded");
} else {

TBI.Net = {};

// Checks the state of an XHR.
function checkState(request) { return (request.readyState == request.DONE); }
// A XMLHttpRequest object constructor.
TBI.XHR = function () { return window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"); }
// An AJAX (Asynchronous JavaScript And XML) GET request constructor.
// When the infomation referred to in the url variable is loaded, func() is called.
TBI.AJAX = function (url, func) {
    var xhr = new TBI.XHR();
    xhr.open("GET", url, true);
    xhr.send();
    xhr.onreadystatechange = function () {
        if (checkState(xhr)) {
            if (isNull(xhr.response)) xhr.response = xhr.responseText;
            if (func instanceof Function) func(xhr);
        }
    }
    return xhr;
}

TBI.Files.HTMLIncludesManifest = "/assets/data/includes.json";

function HTMLInclude(source, insert, replace, before) {
    this.source = source;
    this.insert = insert;
    this.replace = isNull(replace) ? true : replace;
    this.before = isNull(before) ? false : before;
}

// Returns a task function that can be used in a TBI.Loader().
// This one loads a series of HTML includes based upon the info variable.
// info can either be the URL of a manifest or an array of HTMLInclude objects.
function executeHTMLIncludes(info) {
    var asyncFunction = function (data, resolve, reject, loader) {
        if (data.length == 0) resolve();
        var completed = 0;
        var updateIncludes = function () {
            completed++;
            if (completed >= data.length) resolve();
        };

        for (var i=0;i<data.length;i++) {
            var include = new HTMLInclude(data[i].source, data[i].insert, data[i].replace, data[i].before);
            if ($(include.insert).length > 0) {
                loader.addTask(function (info) {
                    return function (resolve, reject, loader) {
                        TBI.AJAX(info.source, function (xhr) {
                            if ($(info.insert).length > 0) {
                                var element = $(info.insert)[0];
                                var oldHTML = info.replace == true ? "" : element.innerHTML;
                                if (!info.before) element.innerHTML = oldHTML + xhr.response;
                                else element.innerHTML = xhr.response + oldHTML;
                            }
                            resolve();
                            updateIncludes();
                        });
                    };
                }(include), null, "HTMLIncludes "+include.source);
            } else updateIncludes();
        }
    }

    if (info instanceof Array)
        return function (resolve, reject, loader) {
            asyncFunction(info, resolve, reject, loader);
        };
    else if (typeof info == "string")
        return function (resolve, reject, loader) {
            TBI.AJAX(info, function (xhr) {
                var data = $.parseJSON(xhr.response).includes;
                asyncFunction(data, resolve, reject, loader);
            });
        };
}

// also returns a TBI.Loader() compatible function
// This one loads the web fonts using a #fontload element
// with special CSS properties.
function executeFontLoading() {
    // return a TBI.Loader() compatible function
    return function (resolve, reject, loader) {
        // if the font loader isn't present...
        if ($("#fontload").length < 1) {
            // reject with scathing error message
            reject("Fontload element was missing.");
            return false;
        }

        var fonts = $("#fontload span");
        var refWidths = [];

        // at this point, the text fields that will demonstrate the
        // font has loaded are using the reference font (same for all
        // fields, normally a strange condensed/super long websafe font)

        // fill the reference widths with the current width of the text fields
        for (var i=0;i<fonts.length;i++)
            refWidths.push(parseInt($(fonts[i]).css("width")));

        // now the text fields will use their demonstration fonts
        // when they load, the width of the container will be different
        $("#fontload").toggleClass("eval", true);

        // every 10ms
        new TBI.Timer(function (timer) {
            // check the fields to see if they have loaded...
            for (var i=0;i<fonts.length;i++) {
                // if one hasn't loaded (still at their reference width), return
                if (parseInt($(fonts[i]).css("width")) == refWidths[i]) return;
            }

            // otherwise all the fonts have loaded
            // clear the timer
            timer.clear();
            // remove the font loader
            $("#fontload").remove();
            // and make good on that Promise
            resolve();
        }, 10, true);
    }
}

$(function () {
});

}
