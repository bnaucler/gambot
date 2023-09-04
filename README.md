
# GAMBOT
Arena tournament manager cobbled together for use at the local chess club.

## Created by
Björn W Nauclér (mail@bnaucler.se)

## Building
`bin/build.sh all` - Builds server and tools

## Usage
Output of `bin/gambot -h`:  
```
Usage of bin/gambot:
  -d string
    	specify database to open (default ".gambot.db")
  -p int
    	port number to listen (default 9001)
```

## Tool - dbdump
Dumps the database contents to stdout  
Output of `bin/dbdump -h`:  
```
Usage of bin/dbdump:
  -a	dump admin data
  -d string
    	specify database to open (default ".gambot.db")
  -j	JSON format
  -p	dump player data
  -t	dump tournament data
```

## Contributing
Pull requests welcome!

## TODO
* API reference
* CONTRIBUTING doc
* Shutdown sequence
* Server side logging
* API call object to streamline request handling
* Function for returning empty objects at key verification failure
* Replace local log with API call for server log
* Mobile friendly / responsive UI
* Seeding algorithm selector (minipop when 'start new tournament' is pressed
    - Winner meets winner seeding algo (w. color reversal)
    - Monrad seeding algo
* Possibility to 'force' games with specified opponent
* Better (and consistent) backend error handling
* Tournament history search by date
    - next / prev buttons
* Refactor (go & js) and divide in multiple source files
* Reorganize CSS and comment for readability
* Tool to import player & tournament JSON data to db
* Better looking popups
* Better looking minipops
* Move macro definitions to JSON file - import in both back- & frontend
* Player object stat for ongoing tournament
* Adjust color picking algo to account for % of games as white
* Alternate top 5 with APPG instead of total points
    - Store APPG in player object and calculate in backend
* Logic to determine top players when points are equal
    - APPG based
    - If still equal: APPG as black
* Edit player function to change name, email etc
    - Recycle player add window
    - Window styling
* Better player data validation
    - frontend
    - backend
* Send player added status report to frontend
* Participant attendance & results report per tournament
* See all games in tournament history
* See all players and respective scores in tournament history
* Tournament history data download
* Exclude cancelled games from seeding calculations
* Better looking pause icon
* Same button for admin registration and login
* Same button for starting and ending tournament
* 'soft end' to stop seeding
* Licess API bindings

## License
MIT (do whatever you want)
