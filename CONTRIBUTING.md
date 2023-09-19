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
* Public page
    - Separate js into public & admin scripts
* Database backup
* Logout handler to erase skey in backend
* Better (and consistent) backend error handling
* Better player data validation
    - frontend
    - backend

### TODO: look & feel
* Make player edit button look "normal"
* Mobile friendly / responsive UI
* Better looking popups
* Better looking minipops
* Better looking player data window
* Prev button for browsing through log
* Show number of games within bars in player data

### TODO: structure
* Replace trylogin()
* Look if playertotournament() can be more streamlined
* Refactor (go & js) and divide in multiple source files
* Single valskey response error object
* Merge ephandler() and aphandler()
* Merge cthandler() and ethandler()
* Reorganize CSS and comment for readability
* Move basic db functionality to gcore
* Create JSON object with wrapper functions for session storage items

### TODO: new functionality
* Implement player K value for ELO
* Possibility to edit ELO init value in admin interface
* Interactive elo edit per player in resetelo.go
* Shutdown sequence
* Monrad seeding algo
* APPG based seeding for draws in Win/Win algo
* Avoid immediate rematches in Win/Win algo
* Possibility to 'force' games with specified opponent
* Pick player with fewest previous matchups when forcing
* Tournament history search by date
    - next / prev buttons
* Tool to import player & tournament JSON data to db
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

### TODO: known bugs

## Pull requests
Are appreciated!
