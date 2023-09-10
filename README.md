
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

For API reference, take a look at [APIREF.md](APIREF.md).

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
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for best practices and information on how to get involved in the project.  
Pull requests welcome!

## License
MIT (do whatever you want)
