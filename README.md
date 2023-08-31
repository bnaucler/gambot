
# GAMBOT
Arena tournament manager cobbled together for use at the local chess club.

## Created by
Björn W Nauclér (mail@bnaucler.se)

## Building
`bin/build.sh all` - Builds server and tools

## Tool - dbdump
Dumps the database contents to stdout  
Output of `bin/dbdump -h`:  
```
Usage of bin/dbdump:
  -d string
    	specify database to open (default ".gambot.db")
  -j	JSON format
  -p	players
  -t	tournaments
```

## Usage
Output of `bin/gambot -h`:  
```
Usage of bin/gambot:
  -d string
    	specify database to open (default ".gambot.db")
  -p int
    	port number to listen (default 9001)
```

## Contributing
Pull requests welcome!

## TODO
* API reference
* CONTRIBUTING doc
* Server side logging
* Replace local log with API call for server log
* Mobile friendly / responsive UI
* Seeding algorithm selector
    - Logic to determine 2nd game with reversed colors for rando algorithm
    - Winner meets winner seeding algo (w. color reversal)
    - Monrad seeding algo
* Possibility to 'force' games for players on bench
* Better (and consistent) error handling
* Tournament history search by date
* Refactor (go & js) and divide in multiple source files
* Reorganize CSS and comment for readability
* Better looking popups
* Implement skey on gphandler
* Store player objects in db after each finished game
* Move current tournament object to db instead of passing around to handlers
* Move macro definitions to JSON file - import in both back- & frontend
* Same function call structure for all handlers
    - Handler launch wrapper
* Alternate top 5 with APPG instead of total points
* Expand top 5 to show more players
* Logic to determine top players when points are equal
* Edit player function to change name, email etc
* Allow accented letters (i.e. é, à) in player names
* Store following player data:
    - email
    - password
    - lichess username
    - address (incl postal address & zip)
    - gender
    - phone
    - club
* Participant attendance & results report per tournament
* Store winner in game object at game end
* See all games in tournament history
* See all players and respective scores in tournament history
* Tournament history data download
* Possibility to remove players from ongoing tournament
* Possibility to pause players during ongoing tournament
* 'soft end' to stop seeding
* Licess API bindings

## License
MIT (do whatever you want)
