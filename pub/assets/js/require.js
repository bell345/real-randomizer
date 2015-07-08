// VERY quick require() implementation in JavaScript.
// Loads the specified script files in order as a dependency tree and executes the onload function when completed.
var Require; // global variable for access
$(function () {
    // This function appends a <script> element to the bottom of the page with the specified URL and callback
    // function on load.
    function addScript(src, onload) {
        if (onload == undefined) onload = function () {};
        var script = document.createElement("script");
        script.src = src;
        script.type = "application/javascript";
        script.async = true;
        script.onload = onload;
        document.body.appendChild(script);
    }
    // Adds a list of scripts concurrently and executes a function when 100% completed.
    function addScripts(arr, onload) {
        // not going to do sh*t if the array doesn't have anything
        if (arr.length == 0) onload();
        // cut the first element of the array out
        var currScript = arr.splice(0, 1)[0];

        var func; // this specifies what occurs when the current script has loaded
        if (arr.length > 0) // if there is still more work to do...
            func = function (arr, onload) {
                return function () {
                    addScripts(arr, onload); // recurse with the shrunken array
                };
            }(arr, onload);
        else func = onload; // otherwise, we're ready for the last one

        addScript(currScript, func); // load the script with the callback
    }

    var loadedScripts = [];

    Require = function (arr, onload) {
        // eliminate already loaded scripts from the list
        for (var i=0;i<arr.length;i++)
            if (loadedScripts.indexOf(arr[i]) != -1) arr.splice(i, 1);

        // mark the to-be-loaded scripts as dealt with, and not to be loaded again
        loadedScripts = loadedScripts.concat(arr);
        
        // let's do this!
        addScripts(arr, onload);
    }
});
