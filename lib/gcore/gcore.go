package gcore

import (
    "fmt"
    "log"
    "time"
    "strconv"
    "encoding/json"

    bolt "go.etcd.io/bbolt"
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

const A_ID = 0                      // Administrator ID

type Pdata struct {
    Name string
    FName string
    LName string
    Email string
    LicessUser string
    PostalAddr string
    Zip string
    Gender string
    Phone string
    Club string
}

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
    Uname string
    Pass []byte
    Pi Pdata
    Ngames int
    TNgames int
    Points int
    TPoints int
    Active bool
    Stat []int
    APPG float32
    WAPPG float32
    BAPPG float32
    Status int
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
    Winner int
    Start time.Time
    End time.Time
}

// Check error and panic
func Cherr(e error) {
    if e != nil { log.Fatal(e) }
}

// Write byte slice to DB
func Wrdb(db *bolt.DB, k int, v []byte, cbuc []byte) (e error) {

    e = db.Update(func(tx *bolt.Tx) error {
        b, e := tx.CreateBucketIfNotExists(cbuc)
        if e != nil { return e }

        e = b.Put([]byte(strconv.Itoa(k)), v)
        if e != nil { return e }

        return nil
    })
    return
}

// Return JSON encoded byte slice from DB
func Rdb(db *bolt.DB, k int, cbuc []byte) (v []byte, e error) {

    e = db.View(func(tx *bolt.Tx) error {
        b := tx.Bucket(cbuc)
        if b == nil { return fmt.Errorf("No bucket!") }

        v = b.Get([]byte(strconv.Itoa(k)))
        return nil
    })
    return
}

// Retrieves admin object from database
func Getadmin(db *bolt.DB) (Admin, error) {

    a := Admin{}

    ab, e := Rdb(db, A_ID, Abuc)

    json.Unmarshal(ab, &a)

    return a, e
}

// Returns slice containing all player objects in db
func Getallplayers(db *bolt.DB) []Player {

    var players []Player
    var cp Player

    db.View(func(tx *bolt.Tx) error {

        b := tx.Bucket(Pbuc)
        c := b.Cursor()

        for k, v := c.First(); k != nil; k, v = c.Next() {
            cp = Player{}
            json.Unmarshal(v, &cp)
            players = append(players, cp)
        }

        return nil
   })

   return players
}

// Returns slice containing all tournament objects in db
func Getalltournaments(db *bolt.DB) []Tournament {

    var ts []Tournament
    var t Tournament

    db.View(func(tx *bolt.Tx) error {

        b := tx.Bucket(Tbuc)
        c := b.Cursor()

        for k, v := c.First(); k != nil; k, v = c.Next() {
            t = Tournament{}
            json.Unmarshal(v, &t)
            ts = append(ts, t)
        }

        return nil
   })

    return ts
}
