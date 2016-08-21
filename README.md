# real-randomizer
### Because Spotify doesn't do a good job
A Spotify Web API app, written in node.js, for properly shuffling playlists.

## Installation/Implementation

This project is hosted on my (other) website [sigptr.me][sigptr_me] right here:

### https://sigptr.me/apps/spotify-rand/

If you want to install it yourself, here's what you'll need to do:

1. Install the following from `npm`:

    * express
    * request
    * querystring
    * cookie-parser

2. Head over to [developer.spotify.com][spotify_dev] and create a developer account
by signing in with your existing Spotify account.

3. Create an "app"; the name and description is not significant.

4. Once your "app" has been created, copy down the Client ID and Client Secret listed
on this page.

5. However, you're not done yet: add a redirect URI that corresponds to where you are
going to be running this app. You can use localhost to run locally. Include the port 
(if not 80) like so: `http://localhost:8000/callback/`.

6. Don't forget to save your changes on the site!

7. Armed with this valuable information, open up `server.node.js` and copy this 
information - your client ID, client secret, port number and hostname (can be 
localhost) - into the file where indicated.

## Running

After installation, simply run the `server.node.js` file with your node.js interpreter:

    $ node server.node.js

and the server should be open on `http://localhost:<port>/`.

## Explanation

This is a quick application that utilizes the Spotify Web API to shuffle your 
playlists properly, as God intended. The shuffle feature on Spotify only 
shuffles about 20 or so songs and then resamples, which leads to annoying 
repeats and should be changed. This is my way of fixing the problem.

Once logged in, you can choose a playlist from the dropdown box to the right. 
The application will load the playlist's tracks into a table, for your viewing 
pleasure. Clicking the headers will first sort ascending, then descending, 
then restore the original sort order. Clicking "Sort Randomly" will shuffle 
the entire list completely randomly.

Clicking "Make Playlist" will take this list, and its order; and produce a 
new, private playlist named "Real Randomizer Playlist". It will overwrite 
the first playlist with this name, to prevent spamming. Once its done, you can 
click the shiny new "View Playlist" to open this playlist in Spotify.

Your new playlist is meant to be enjoyed without the in-built shuffle feature, 
and has all the same tracks as the original. It does not, in any way, modify 
the original playlist; so you can shuffle public, collaborative and even 
followed playlists properly. To reshuffle, just come back here and go through 
the same process: it'll go into the same "Real Randomizer Playlist".

[spotify_dev]: https://developer.spotify.com/my-applications/#!/
[sigptr_me]: https://sigptr.me
