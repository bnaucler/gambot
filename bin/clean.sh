#!/usr/bin/env bash

DIR="data"
PRGNAME="gambot"

DBEXT="db"
PIDEXT="pid"
LOGEXT="log"

PIDFILE="./$DIR/$PRGNAME.$PIDEXT"

if [ "$1" = "-force" ]; then
    echo "Deleting files in $DIR:"
    rm -fv $DIR/*.$DBEXT $DIR/*.$PIDEXT $DIR/*.$LOGEXT 2> /dev/null

elif [ -f $PIDFILE ]; then
    GPID=$(<$PIDFILE)
    echo "Pidfile exists - is gambot running?"
    ps -p $GPID
    echo "Shut down the server and try again, or run again with -force"

else
    echo "Deleting files in $DIR:"
    rm -i $DIR/*.$DBEXT $DIR/*.$PIDEXT $DIR/*.$LOGEXT
fi
