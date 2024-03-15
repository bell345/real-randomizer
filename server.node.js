require("dotenv").config();
var express = require("express");
var request = require("request");
var cookieParser = require("cookie-parser");
var generateUUID = require("uuid").v4;

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
if (!client_id || !client_secret) {
    throw new Error("App requires CLIENT_ID and CLIENT_SECRET environment variables.");
}
var auth_string = "Basic " + (new Buffer(client_id + ":" + client_secret).toString("base64"));

var port = parseInt(process.env.PORT);
if (isNaN(port)) {
    port = 8008;
}
var base_url = process.env.BASE_URL ?? `http://localhost:${port}`;
// something like "http://domain.net:80/callback"
var redirect_uri = base_url + "/callback";

function rejectAsError(res, desc) {
    res.redirect("/?" +
        new URLSearchParams({
            error: desc
        }).toString()
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

    var scope = "user-library-read playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-private";
    res.redirect("https://accounts.spotify.com/authorize?" +
        new URLSearchParams({
            response_type: "code",
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }).toString()
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
                        console.log("New login from " + req.ip);
                        var userID = body.id;

                        res.cookie(accessTokenKey, access_token);
                        res.cookie(refreshTokenKey, refresh_token);
                        res.cookie(userIDKey, userID);
                        res.redirect(base_url);
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
