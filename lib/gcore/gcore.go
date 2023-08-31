package gcore

import (
    "time"
)

var Abuc = []byte("abuc")           // admin bucket
var Pbuc = []byte("pbuc")           // player bucket
var Gbuc = []byte("gbuc")           // game bucket
var Tbuc = []byte("tbuc")           // tournament bucket

const DEF_PWIN = 2                  // Default point value for win
const DEF_PDRAW = 1                 // Default point value for draw
const DEF_PLOSS = 0                 // Default point value for loss
const DEF_DBNAME = ".gambot.db"     // Default database filename
const DEF_PORT = 9001               // Default server port

const NMAXLEN = 30                  // Player name max length

type Admin struct {
    Skey string
    Pass []byte
    Pwin int
    Pdraw int
    Ploss int
    Status int
}

type Player struct {
    ID int
    Name string
    Ngames int
    TNgames int
    Points int
    TPoints int
    Active bool
    Status int
    Stat []int
}

type Tournament struct {
    ID int
    P []Player
    G []Game
    Start time.Time
    End time.Time
    Status int
}

type Game struct {
    ID string
    W int
    B int
    Start time.Time
    End time.Time
}

