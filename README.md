
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
* Better (and consistent) error handling
* Tournament history search by date
* Reorganize main screen buttons
* Refactor (go & js) and divide in multiple source files
* UI for changing admin password

## License
MIT (do whatever you want)
