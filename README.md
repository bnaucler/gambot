
# GAMBOT
Arena tournament manager cobbled together for use at the local chess club.

## Created by
Björn W Nauclér (mail@bnaucler.se)

## Building
`bin/build.sh`

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
* Server side logging
* Replace local log with API call for server log
* Mobile friendly interface
* Logic to determine 2nd game with reversed colors
* UI to activate/deactivate players
* Checkbox to show/hide inactive players in list
* Better (and consistent) error handling
* Tournament history search by date
* Refactor (go & js) and divide in multiple source files
* Adjust display of tournament history for currently ongoing
* Player statistics
* Better looking popups

## License
MIT (do whatever you want)
