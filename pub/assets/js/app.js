var updateSelectAll;
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

        var playlistName = "Real Randomizer Playlist";

        var access_token = readCookie("spotify_access_token");
        var refresh_token = readCookie("spotify_refresh_token");
        var userID = readCookie("spotify_user_id");
        //var playlistID = readCookie("spotify_playlist_id");

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
                    url: prepareQuery("refresh_token", {
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
            console.log("https://api.spotify.com/v1/playlists/"+playlistID+"/tracks");
            $.ajax({
                type: "PUT",
                url: "https://api.spotify.com/v1/playlists/"+playlistID+"/tracks",
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

        function updatePlaylistStatusMeter(progress, max, text) {
            var meter = $(".playlist-status meter")[0];
            meter.max = max;
            meter.value = progress;
            $(".playlist-status div").html(text);
        }

        function fillPlaylistMore(userID, playlistID, trackIDList, offset) {
            var maxTracks = 100; // as specified by Spotify API

            var data = trackIDList
                .filter(function (e, i) { return (i >= offset && i < (offset + maxTracks)); })
                .map(function (e) { return e.replace(/\-/g, ":"); });

            $.ajax({
                method: "POST",
                url: "https://api.spotify.com/v1/playlists/"+playlistID+"/tracks",
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

                        updatePlaylistStatusMeter(0, 0, "");
                        $(".loading-playlist").hide();
                        $(".loaded-playlist").show();
                        $(".view-playlist")[0].href = "spotify:user:"+userID+":playlist:"+playlistID;
                    } else {
                        updatePlaylistStatusMeter(offset + maxTracks, trackIDList.length, "Playlist is filling...");

                        console.log("Filling playlist: ", offset + maxTracks);
                        fillPlaylistMore(userID, playlistID, trackIDList, offset + maxTracks);
                    }
                },
                error: function (xhr, status, error) {
                    handleError(xhr, status, error, "fill the playlist");

                    updatePlaylistStatusMeter(0, 0, "");
                    $(".loading-playlist").hide();
                    $(".loaded-playlist").hide();
                }
            });
        }

        function fillPlaylist(userID, playlistID, table) {
            var trackIDs = $(table).find("tbody > tr")
                                   .toArray()
                                   .filter(function (e) {
                                       return TBI.UI.isToggled(e.querySelector("input[type='checkbox']"));
                                   })
                                   .map(function (e) { return e.id; });

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

        /*function setPlaylistID(id, method) {
            playlistID = id;
            console.log(method + " playlist: "+id);
            createCookie("spotify_playlist_id", playlistID);
        }*/

        function makePlaylist() {
            if (!isNull(userID)) {
                /*if (!isNull(playlistID)) {
                    $(".playlist-status").html(" (found remembered playlist, loading...)");
                    var fields = playlistID.split(":");
                    fillPlaylist(fields[0], fields[1], $("#spotify-tracks")[0]);
                } else */{
                    updatePlaylistStatusMeter(0, 0, "Trying to find playlist from list, loading...");
                    listPlaylists(userID,
                        function (playlist) { // executed for every playlist loaded
                            console.log(playlist.name);
                            if (playlist.name == playlistName && playlist.owner.id == userID) {
                                //setPlaylistID(playlist.id, "Found");

                                fillPlaylist(playlist.owner.id, playlist.id, $("#spotify-tracks")[0]);
                                return true; // interrupt loading, prevent finalCallback from being called
                            }
                            return false;
                        },
                        function () { // executed when loading complete: i.e. we didn't find our playlist
                            updatePlaylistStatusMeter(0, 0, "Creating new playlist, loading...");
                            createPlaylist(userID, playlistName, // if not found, make our own
                                function (response, status, xhr) {
                                    //setPlaylistID(response.id, "Created");

                                    fillPlaylist(userID, playlist.id, $("#spotify-tracks")[0]);
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
                        addTD(row, "<input type='checkbox' checked onchange='updateSelectAll();' />");
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

                        addTDLink(row, track.album.name, track.album.uri);
                        addTD(row, track.disc_number + ":" + track.track_number);

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
                    $(tbody).toggleClass("done", false);
                    TBI.UI.updateUI(true);
                    updateSelectAll();
                    loadingPlaylist = false;
                }
            )

        }

        updateSelectAll = function () {
            var el = $(".select-all");
            var tracks = $("#spotify-tracks tbody tr");
            var searching = $("#spotify-tracks").hasClass("search");

            var checked = true;
            for (var i=0;i<tracks.length;i++) {
                if (searching && !($(tracks[i]).hasClass("search-result"))) continue;

                var checkbox = tracks[i].querySelector("input[type='checkbox']");
                if (!TBI.UI.isToggled(checkbox)) {
                    checked = false;
                    break;
                }
            }

            TBI.UI.toggleButton(el, checked); // cosmetic
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
                    option.value = playlist.owner.id + ":" + playlist.id;
                    option.textContent = playlist.name;
                    if (userID != null && playlist.owner.id != userID)
                        option.textContent += " ("+playlist.owner.id+")";

                    select.appendChild(option);
                },
                function () {
                    $(select).show();
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
            TBI.UI.sortTable($("#spotify-tracks")[0], -1, false, "random");
        });

        function getTDIndex(headers, match, fallback) {
            for (var i=0;i<headers.length;i++)
                if (headers[i].innerText == match)
                    return i;

            return fallback;
        }

        $(".sort-random-album").click(function () {
            var headers = $("#spotify-tracks th"),
                albumTDIndex = getTDIndex(headers, "Album", 3),
                noTDIndex = getTDIndex(headers, "#", albumTDIndex + 1),
                getAlbumID = function (el) { return el.getElementsByTagName("td")[albumTDIndex].getElementsByTagName("a")[0].href; },
                getSequenceOrder = function (el) {
                    var v = el.getElementsByTagName("td")[noTDIndex].textContent.split(":");
                    return parseInt(v[0]) * 1000 + parseInt(v[1]);
                };

            var tracks = $("#spotify-tracks tbody")[0].getElementsByTagName("tr");
            var albumOrder = [];
            for (var i=0;i<tracks.length;i++) {
                var album = getAlbumID(tracks[i]);
                if (albumOrder.indexOf(album) == -1)
                    albumOrder.push(album);
            }
            albumOrder.shuffle();

            TBI.UI.sortTable($("#spotify-tracks")[0], -1, false, "custom", function (a, b) {
                var albumA = getAlbumID(a),
                    albumB = getAlbumID(b);

                if (albumA == albumB) {
                    var trackNoA = getSequenceOrder(a),
                        trackNoB = getSequenceOrder(b);

                    return trackNoA < trackNoB;
                } else return albumOrder.indexOf(albumA) < albumOrder.indexOf(albumB);
            });
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
                else {
                    var fields = plist.split(":");
                    loadPlaylist(fields[0], fields[1]);
                }
            } else alert("Please wait until the current playlist has finished loading.");

            loadingPlaylist = true;
        });
        $(".logout").click(logout);
        $(".up-down[for='.explanation']").click(function () {
            createCookie("explanation-show", TBI.UI.isToggled(this) ? "1" : "0");
        });
        if (readCookie("explanation-show") != null) {
            $(".explanation").toggle(readCookie("explanation-show") == "1");
        }

        $(".search-box").change(function () {
            var v = $(".search-box").val().toLowerCase();

            if (isNull(v)) {
                $("#spotify-tracks").toggleClass("search", false);
            } else {
                $("#spotify-tracks").toggleClass("search", true);
                $("#spotify-tracks .search-result").toggleClass("search-result", false);

                var headers = $("#spotify-tracks th"),
                    trackNameTDIndex = getTDIndex(headers, "Track Name", 0),
                    artistNameTDIndex = getTDIndex(headers, "Artist(s)", 1),
                    albumNameTDIndex = getTDIndex(headers, "Album", 3);

                var tracks = $("#spotify-tracks tbody tr");
                for (var i=0;i<tracks.length;i++) {
                    var tds = tracks[i].getElementsByTagName("td");
                    var trackName = tds[trackNameTDIndex].textContent.toLowerCase(),
                        artists = tds[artistNameTDIndex].textContent.toLowerCase(),
                        album = tds[albumNameTDIndex].textContent.toLowerCase();

                    if (trackName.search(v) != -1 ||
                        artists.search(v) != -1 ||
                        album.search(v) != -1
                    ) {
                        $(tracks[i]).toggleClass("search-result", true);
                    }
                }
            }
            updateSelectAll();
        });

        $(".select-all").change(function () {
            var v = TBI.UI.isToggled(this);

            var searching = $("#spotify-tracks").hasClass("search");

            var tracks = $("#spotify-tracks tbody tr");
            for (var i=0;i<tracks.length;i++) {
                var checkbox = tracks[i].querySelector("input[type='checkbox']");

                if (searching && !($(tracks[i]).hasClass("search-result"))) continue;

                TBI.UI.toggleButton(checkbox, v);
            }
        });
    });
});
});
