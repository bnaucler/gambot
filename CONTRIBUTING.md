# Contributing to gambot
Contributions are very welcome! At this early stage, this file will double as a TODO list.

## Code style
* Keep variable & function names short and in lower case (whenever possible)
* JSON format used for data exchange
* Limit to 80 columns
* Limit to three levels of indentation
* Indent by four spaces

## Defaults
* All backend requests are sent as POST
* Server listens at port 9001 by default

## How can I help?
As you can see below, there is a VERY long list of things which need to be addressed. There should be ample opportunity to get involved. *But most importantly* - if you decide to give gambot a try at your club, let us know what kind of real-world issues you run into.

## TODO
* Structure this list
* Shutdown sequence
* Server side logging
* valskey() wrapper for sending empty responses
* Replace local log with API call for server log
* Mobile friendly / responsive UI
* Monrad seeding algo
* APPG based seeding for draws in Win/Win algo
* Possibility to 'force' games with specified opponent
* Better (and consistent) backend error handling
* Tournament history search by date
    - next / prev buttons
* Refactor (go & js) and divide in multiple source files
* Refactor cthandler()
* Reorganize CSS and comment for readability
* Tool to import player & tournament JSON data to db
* Better looking popups
* Better looking minipops
* Alternate top 5 with APPG instead of total points
* Logic to pick longest waiting bench player if all other things are equal
* Logic to determine top players when points are equal
    - APPG based
    - If still equal: APPG as black
* Add/edit player window styling
* Better player data validation
    - frontend
    - backend
* Send player added status report to frontend
* Participant attendance & results report per tournament
* Selector for tournament & all time stats in player info window
* See all games in tournament history
* See all players and respective scores in tournament history
* Tournament history data download
* Same button for starting and ending tournament
* Move activate/deactivate button to edit player popup
* 'soft end' to stop seeding
* Licess API bindings
* Merge ephandler() and aphandler()
* Make statuspop on/off defined per log item type

