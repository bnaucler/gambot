#!/usr/bin/env bash

TOOLS=("dbdump")
TPATH="tools"

echo "Building gambot"
go build -o bin/gambot gambot.go

if [ "$1" = "all" ]; then
    for FN in $TOOLS; do
        echo "Building $FN"
        go build -o bin/$FN $TPATH/$FN.go
    done
fi
