
## API reference

```
Endpoint:           Variables:              Comment:
/reg                                        Registers or changes admin password
                    pass                    New password
                    opass                   Old password (in case of password change)

/login                                      Processes admin login
                    pass                    Admin password

/admin*                                     Change admin settings
                    pwin                    Sets points earned per win
                    pdraw                   Sets points earned per draw
                    ploss                   Sets points earned per loss

/chkadm             <null>                  Checks if admin object exists in database
                                            Returns true or false

/verskey*           <null>                  Checks if user skey matches database
                                            Returns true or false

/mkgame*                                    Creates a game for specified player
                    id                      ID of player for which to find a game

/ap*                                        Adds / edits a database player object
                    id                      Player id (if editing existing player)
                    fname                   First name
                    lname                   Last name
                    dbirth                  Date of birth
                    gender                  Gender
                    email                   E-mail address
                    postal                  Postal address
                    zip                     Zip code
                    phone                   Phone number
                    club                    Primary chess club

/ep*                                        Edits player settings
                    id                      Player id
                    action                  Which action to take:
                                                activate: Activate
                                                deac: Deactivate
                                                pause: Pause player from seeding

/gp*                                        Retrieves player data
                    id                      Player id (optional)
                    name                    Name search string (optional)

/gtp*                                       Get top players
                    n                       Number of players to fetch
                    t                       Type of top list:
                                                a: All time
                                                c: In current tournament

/ct*                                        Creates a new tournament
                    algo                    Which seeding algorithm to use:
                                                random: Random seeding without rematch
                                                winwin: Winner meets winner (w rematch)
                                                monrad: Swiss style

/et*                                        Edit tournament
                    id                      Player id (when change affects one player)
                    action                  Which action to take:
                                                end: Ends current tournament
                                                rem: Removes player from tournament

/apt*                                       Add player(s) to tournament
                    id                      Array of player IDs

/ts*                <null>                  Requests current tournament object

/th*                                        Requests tournament history
                    i                       Tournament reverse index value
                    n                       Number of tournaments to fetch

/dr*                                        Declare game result
                    id                      Winning player ID
                    game                    Game ID

```

Endpoints marked with `*` requires the user to be logged in and authenticated by `skey`; included with the request.

