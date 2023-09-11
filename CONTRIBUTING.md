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

### TODO: core functionality
* Server side logging
* Replace local log with API call for server log
* Better (and consistent) backend error handling
* Better player data validation
    - frontend
    - backend

### TODO: look & feel
* Mobile friendly / responsive UI
* Better looking popups
* Better looking minipops
* Add/edit player window styling
* Same button for starting and ending tournament
* Move activate/deactivate button to edit player popup

### TODO: structure
* Refactor (go & js) and divide in multiple source files
* valskey() wrapper for sending empty responses
* Refactor cthandler()
* Merge ephandler() and aphandler()
* Reorganize CSS and comment for readability

### TODO: new functionality
* Shutdown sequence
* Monrad seeding algo
* APPG based seeding for draws in Win/Win algo
* Possibility to 'force' games with specified opponent
* Tournament history search by date
    - next / prev buttons
* Tool to import player & tournament JSON data to db
* Alternate top 5 with APPG instead of total points
* Participant attendance & results report per tournament
* See all games in tournament history
* See all players and respective scores in tournament history
* Tournament history data download
* Licess API bindings
* Selector to display tournament or all-time stats in player info window
* Logic to determine top players when points are equal
    - APPG based
    - If still equal: APPG as black
* Logic to pick longest waiting bench player if all other things are equal
* 'Soft end' to stop seeding
* Make statuspop on/off defined per log item type

## Pull requests
Are appreciated!