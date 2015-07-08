$(function () {
Require([
    "assets/js/tblib/base.js",
    "assets/js/tblib/util.js",
    "assets/js/tblib/ui.js",
    "assets/js/tblib/loader.js",
    "assets/js/tblib/net.js",
    "assets/js/spotify-api.js"
], function () {

    loader.start();
    $(document).on("pageload", function () {

        var access_token = readCookie("spotify_access_token");
        var refresh_token = readCookie("spotify_refresh_token");
        var userID = readCookie("spotify_user_id");
        var playlistID = readCookie("spotify_playlist_id");

        function prepareQuery(url, obj, isHash) {
            var str = url + (isHash?"#":"?");
            for (var prop in obj) if (obj.hasOwnProperty(prop))
                str += encodeURIComponent(prop) + "=" + encodeURIComponent(obj[prop]) + "&";

            return str.substring(0, str.length - 1);
        }

        function addTD(tr, content) {
            var cell = document.createElement("td");
            cell.innerHTML = content;
            tr.appendChild(cell);
        }

        function addTDLink(tr, content, href) {
            var cell = document.createElement("td");
            var a = document.createElement("a");
            a.href = href;
            a.textContent = content;
            cell.appendChild(a);
            tr.appendChild(cell);
        }

        function zeroPrefix(num, len, char) {
            len = len || 2;
            char = char || "0";

            var str = num.toString();
            while (str.length < len) str = char + str;
            return str;
        }

        function handleError(xhr, status, error, action, rectification) {
            if (xhr.responseJSON && xhr.responseJSON.error && xhr.responseJSON.error.message == "The access token expired") {
                $.ajax({
                    url: prepareQuery("/refresh_token", {
                        refresh_token: refresh_token
                    }),
                    success: function (response) {
                        access_token = response.access_token;
                        createCookie("spotify_access_token", response.access_token);
                        location.reload();
                    },
                    error: function () {
                        alert("An error occured while trying to get a refresh token. Please try logging out and logging back in again.");
                    }
                });
            } else {
                console.log(xhr);
                var errorMessage = "An error (";
                errorMessage += xhr.status + ": " + xhr.statusText;
                errorMessage += ") occured";

                if (action) errorMessage += " while attempting to " + action;
                errorMessage += ".";

                if (rectification) errorMessage += " Please " + rectification + ".";
                alert(errorMessage);
            }
        }

        function getMoreTracks(userID, playlistID, trackList, perCallback, finalCallback, errorCallback) {
            var maxTracks = playlistID ? 100 : 50;

            var url = playlistID
                ? "https://api.spotify.com/v1/users/"+userID+"/playlists/"+playlistID+"/tracks"
                : "https://api.spotify.com/v1/me/tracks";

            $.ajax({
                url: prepareQuery(url, {
                    limit: maxTracks,
                    offset: trackList.length
                }),
                headers: {
                    "Authorization": "Bearer " + access_token
                },
                success: function (response, status, xhr) {
                    trackList = trackList.concat(response.items);

                    var interrupt = false;
                    for (var i=0;i<response.items.length;i++) {
                        interrupt = perCallback(response.items[i], i, response);
                        if (interrupt) break;
                    }
                    if (interrupt) return;

                    if (trackList.length >= response.total) finalCallback(trackList);
                    else getMoreTracks(userID, playlistID, trackList, perCallback, finalCallback, errorCallback);
                },
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "load user/playlist tracks", "try refreshing the page");
                    errorCallback(xhr, status, error);
                }
            })
        }

        function getTracks(userID, playlistID, perCallback, finalCallback, errorCallback) {
            perCallback   = perCallback   || function () {};
            finalCallback = finalCallback || function () {};
            errorCallback = errorCallback || function () {};

            var trackList = [];

            getMoreTracks(userID, playlistID, trackList, perCallback, finalCallback, errorCallback);
        }

        function clearPlaylist(userID, playlistID, callback) {
            console.log("https://api.spotify.com/v1/users/"+userID+"/playlists/"+playlistID+"/tracks");
            $.ajax({
                type: "PUT",
                url: "https://api.spotify.com/v1/users/"+userID+"/playlists/"+playlistID+"/tracks",
                headers: {
                    "Authorization": "Bearer " + access_token,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "uris": []
                }),
                success: callback,
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "clear a playlist", "try again");

                    $(".loading-playlist").hide();
                    $(".loaded-playlist").hide();
                }
            })
        }

        function followPlaylist(userID, playlistID, callback) {
            $.ajax({
                type: "PUT",
                url: "https://api.spotify.com/v1/users/"+userID+"/playlists/"+playlistID+"/followers",
                headers: {
                    "Authorization": "Bearer " + access_token,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    public: false
                }),
                success: callback,
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "follow a playlist");
                }
            })
        }

        function unfollowPlaylist(userID, playlistID, callback) {
            $.ajax({
                type: "DELETE",
                url: "https://api.spotify.com/v1/users/"+userID+"/playlists/"+playlistID+"/followers",
                headers: {
                    "Authorization": "Bearer " + access_token
                },
                success: callback,
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "unfollow a playlist");
                }
            })
        }

        function fillPlaylistMore(userID, playlistID, trackIDList, offset) {
            var maxTracks = 100; // as specified by Spotify API

            var data = trackIDList
                .filter(function (e, i) { return (i >= offset && i < (offset + maxTracks)); })
                .map(function (e) { return e.replace(/\-/g, ":"); });

            $.ajax({
                method: "POST",
                url: "https://api.spotify.com/v1/users/"+userID+"/playlists/"+playlistID+"/tracks",
                headers: {
                    "Authorization": "Bearer " + access_token,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "uris": data
                }),
                success: function (response, status, xhr) {
                    if ((offset + maxTracks) > trackIDList.length) {
                        alert("Your playlist is ready! Reminder: turn off shuffle!");
                        followPlaylist(userID, playlistID, function () {});

                        $(".playlist-status").html("");
                        $(".loading-playlist").hide();
                        $(".loaded-playlist").show();
                        $(".view-playlist")[0].href = "spotify:user:"+userID+":playlist:"+playlistID;
                    } else {
                        $(".playlist-status").html(" (playlist is filling, "+parseInt((offset+maxTracks)/trackIDList.length*100)+"% done)");
                        console.log("Filling playlist: ", offset + maxTracks);
                        fillPlaylistMore(userID, playlistID, trackIDList, offset + maxTracks);
                    }
                },
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "fill the playlist");

                    $(".playlist-status").html("");
                    $(".loading-playlist").hide();
                    $(".loaded-playlist").hide();
                }
            });
        }

        function fillPlaylist(userID, playlistID, table) {
            var trackIDs = $(table).find("tbody > tr").toArray().map(function (e) { return e.id; });

            $(".loading-playlist").show();
            $(".loaded-playlist").hide();
            clearPlaylist(userID, playlistID, function () {
                console.log("Cleared playlist: "+playlistID);
                fillPlaylistMore(userID, playlistID, trackIDs, 0);
            });
        }

        function listMorePlaylists(userID, playlistList, perCallback, finalCallback, errorCallback) {
            var maxPlaylists = 50;

            $.ajax({
                url: prepareQuery("https://api.spotify.com/v1/users/"+userID+"/playlists", {
                    limit: maxPlaylists,
                    offset: playlistList.length
                }),
                headers: {
                    "Authorization": "Bearer " + access_token
                },
                success: function (response, status, xhr) {
                    playlistList = playlistList.concat(response.items);

                    var interrupt = false;
                    for (var i=0;i<response.items.length;i++) {
                        interrupt = perCallback(response.items[i], i, response);
                        if (interrupt) break;
                    }
                    if (interrupt) return;

                    if (playlistList.length >= response.total) finalCallback(playlistList);
                    else listMorePlaylists(userID, playlistList, perCallback, finalCallback, errorCallback);
                },
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "list your playlists");
                    errorCallback(xhr, status, error);
                }
            });
        }

        function listPlaylists(userID, perCallback, finalCallback, errorCallback) {
            perCallback   = perCallback   || function () {};
            finalCallback = finalCallback || function () {};
            errorCallback = errorCallback || function () {};

            var playlistList = [];

            listMorePlaylists(userID, playlistList, perCallback, finalCallback, errorCallback);
        }

        function createPlaylist(userID, name, callback, errorCallback) {
            callback = callback || function () {};
            errorCallback = errorCallback || function () {};

            $.ajax({
                method: "POST",
                url: "https://api.spotify.com/v1/users/"+userID+"/playlists",
                headers: {
                    "Authorization": "Bearer " + access_token,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    name: name,
                    public: false
                }),
                success: callback,
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "create a playlist");
                    errorCallback(xhr, status, error);
                }
            });
        }

        function setPlaylistID(id, method) {
            playlistID = id;
            console.log(method + " playlist: "+id);
            createCookie("spotify_playlist_id", playlistID);
        }

        function makePlaylist() {
            if (!isNull(userID)) {
                if (!isNull(playlistID)) {
                    $(".playlist-status").html(" (found remembered playlist, loading...)");
                    fillPlaylist(userID, playlistID, $("#spotify-tracks")[0]);
                } else {
                    $(".playlist-status").html(" (trying to find playlist from list, loading...)");
                    listPlaylists(userID,
                        function (playlist) { // executed for every playlist loaded
                            console.log(playlist.name);
                            if (playlist.name == "Real Randomizer Playlist") {
                                setPlaylistID(playlist.id, "Found");

                                fillPlaylist(userID, playlistID, $("#spotify-tracks")[0]);
                                return true; // interrupt laoding, prevent finalCallback from being called
                            }
                            return false;
                        },
                        function () { // executed when loading complete: i.e. we didn't find our playlist
                            $(".playlist-status").html(" (creating new playlist, loading...)");
                            createPlaylist(userID, "Real Randomizer Playlist", // if not found, make our own
                                function (response, status, xhr) {
                                    setPlaylistID(response.id, "Created");

                                    fillPlaylist(userID, playlistID, $("#spotify-tracks")[0]);
                                }
                            );
                        }
                    );
                }
            } else alert("UserID is unset. Please try logging out and logging back in.");
        }

        function loadPlaylist(userID, playlistID) {
            $(".loading-tracks").show();
            $(".loaded-tracks").hide();

            var tbody = $("#spotify-tracks tbody")[0];
            var meter = $(".loading-tracks meter")[0];
            var loadedTracks = 0;
            var noOfTracks = -1;

            $(tbody).empty();

            getTracks(userID, playlistID,
                function (trackContainer, i, response) {
                    var track = trackContainer.track;
                    var row = document.createElement("tr");

                    if (trackContainer.is_local) {
                        $(row).addClass("local-track");
                        row.id = track.uri.replace(/:/, "-");
                    } else row.id = "spotify-track-" + track.id;

                    if (row.id != "spotify-track-null") {
                        addTDLink(row, track.name, track.uri);

                        var artistCell = document.createElement("td");
                        for (var j=0;j<track.artists.length;j++) {
                            var artistLink = document.createElement("a");
                                artistLink.href = track.artists[j].uri;
                                artistLink.textContent = track.artists[j].name;
                            artistCell.appendChild(artistLink);
                            if (j < track.artists.length - 1) artistCell.innerHTML += ", ";
                        }
                        row.appendChild(artistCell);

                        var timeCell = document.createElement("td");
                            timeCell.setAttribute("data-table-sort-value", track.duration_ms);
                            var timeEl = document.createElement("time");
                                var totalSeconds = Math.floor(track.duration_ms / 1000);
                                var minutes = Math.floor(totalSeconds / 60);
                                var seconds = totalSeconds % 60;
                                timeEl.innerHTML = minutes + ":" + zeroPrefix(seconds, 2);
                            timeCell.appendChild(timeEl);
                        row.appendChild(timeCell);

                        addTD(row, trackContainer.added_at.substring(0, "yyyy-mm-dd".length));

                        tbody.appendChild(row);
                    } else console.log(track);

                    loadedTracks++;
                    meter.max = response.total;
                    meter.value = loadedTracks;
                },
                function (trackList) {
                    meter.value = 0;
                    $(".loading-tracks").hide();
                    $(".loaded-tracks").show();
                    TBI.UI.updateUI(true);
                    loadingPlaylist = false;
                }
            )

        }

        function logout() {
            eraseCookie("spotify_access_token");
            eraseCookie("spotify_refresh_token");
            eraseCookie("spotify_user_id");
            eraseCookie("spotify_playlist_id");
            location.reload();
        }

        var loadingPlaylist = false;

        if (!isNull(access_token)) {
            $(".not-logged-in").hide();
            $(".logged-in").show();

            var select = $(".playlist-select")[0];
            $(select).hide();

            listPlaylists(userID,
                function (playlist) {
                    var option = document.createElement("option");
                    option.value = playlist.id;
                    option.textContent = playlist.name;
                    select.appendChild(option);
                },
                function () {
                    $(select).show();
                    if (!isNull(playlistID)) {
                        $(select).val(playlistID);
                        if ($(select).val() != playlistID)
                            $(select).val("-");
                    }
                },
                function () {
                    loadPlaylist(null, null);
                }
            );
        } else {
            $(".not-logged-in").show();
            $(".logged-in").hide();
        }
        TBI.UI.updateUI();

        $(".sort-randomly").click(function () {
            TBI.UI.sortTable($("#spotify-tracks")[0], -1, false, "custom", function () { return (Math.random() * 2 - 1) < 0; });
        });
        $(".make-playlist").click(makePlaylist);

        $(".playlist-select").change(function (e) {
            var plist = $(".playlist-select").val();

            if (plist == "-") {
                alert("You haven't selected a playlist.");
                return;
            }

            if (!loadingPlaylist) {
                if (plist == "your-music") loadPlaylist(null, null);
                else loadPlaylist(userID, plist);
            } else alert("Please wait until the current playlist has finished loading.");

            loadingPlaylist = true;
        });
        $(".logout").click(logout);
    });
});
});
