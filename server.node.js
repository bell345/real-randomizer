var express = require("express");
var request = require("request");
var querystring = require("querystring");
var cookieParser = require("cookie-parser");

var client_id = "<insert your own here>";
var client_secret = "<insert your own here>";
var auth_string = "Basic " + (new Buffer(client_id + ":" + client_secret).toString("base64"));

var port = 80;
// something like "http://domain.net:80/callback"
var redirect_uri = "<insert your own here>:" + port + "/callback";

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    uuid = uuid.replace(/[xy]/g, function (c) {
        var r = (d+Math.random()*16)%16|0;
        d = Math.floor(d/16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    });
    return uuid;
}

function rejectAsError(res, desc) {
    res.redirect("/?" +
        querystring.stringify({
            error: desc
        })
    );
}

var stateKey = "spotify_auth_state";
var accessTokenKey = "spotify_access_token";
var refreshTokenKey = "spotify_refresh_token";
var userIDKey = "spotify_user_id";

var app = express();

app.use(express.static(__dirname + "/pub"))
   .use(cookieParser());

app.get("/login", function (req, res) {

    var state = generateUUID();
    res.cookie(stateKey, state);

    var scope = "user-library-read playlist-read-private playlist-read-collaborative playlist-modify-private user-read-private";
    res.redirect("https://accounts.spotify.com/authorize?" +
        querystring.stringify({
            response_type: "code",
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        })
    );
});

app.get("/callback", function (req, res) {

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) rejectAsError(res, "state_mismatch");
    else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: "https://accounts.spotify.com/api/token",
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: "authorization_code"
            },
            headers: {
                "Authorization": auth_string
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: "https://api.spotify.com/v1/me",
                    headers: { "Authorization": "Bearer " + access_token },
                    json: true
                };

                request.get(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var userID = body.id;

                        res.cookie(accessTokenKey, access_token);
                        res.cookie(refreshTokenKey, refresh_token);
                        res.cookie(userIDKey, userID);
                        res.redirect("/");
                    } else rejectAsError(res, "invalid_token");
                });
            } else rejectAsError(res, "invalid_token")
        });
    }
});

app.get("/refresh_token", function (req, res) {

    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: "https://accounts.spotify.com/api/token",
        headers: { "Authorization": auth_string },
        form: {
            grant_type: "refresh_token",
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var access_token = body.access_token;
            res.cookie(accessTokenKey, access_token);
            res.send({
                "access_token": access_token
            });
        }
    });
});

console.log("Listening on "+port);
app.listen(port);
