# real-randomizer
### Because Spotify doesn't do a good job
A Spotify Web API app, written in node.js, for properly shuffling playlists.

## Installation/Implementation

The source code for my little project does NOT include the Spotify `client_id`
or `client_secret`, you'll have to provide your own in `server.node.js`.

This project requires the following from `npm` to work properly:

* express
* request
* querystring
* cookie-parser 

<del>I've hosted this on an Amazon EC2 instance without SSL or a proper DNS name 
because I don't have any money.</del>
Unfortunately, I don't have any current hosting arrangements, so there is no
current implementation. You can, of course, go through the hoops of setting
up your own Spotify dev account (with appropriate callbacks) and this server
yourself.

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
