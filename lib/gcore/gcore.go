package gcore

import (
    "os"
    "fmt"
    "log"
    "time"
    "strconv"
    "net/http"
    "io/ioutil"
    "encoding/json"

    bolt "go.etcd.io/bbolt"
)

var Abuc = []byte("abuc")           // admin bucket
var Pbuc = []byte("pbuc")           // player bucket
var Gbuc = []byte("gbuc")           // game bucket
var Tbuc = []byte("tbuc")           // tournament bucket

const DEF_DBNAME = "data/gambot.db" // Default database filename
const DEF_PORT = 9001               // Default server port
const MAC_FILE = "static/mac.json"  // Macro definition file
const DATAPATH = "data/"

const NMAXLEN = 30                  // Player name max length

var Mac map[string]int              // Global macro object

// Handler function definition
type Hfn func(http.ResponseWriter, *http.Request, *bolt.DB)

type Apicall struct {
    Action string
    Algo string
    Pass string
    Opass string
    Skey string
    Set string
    Pwin string
    Pdraw string
    Ploss string
    PPage string
    N string
    T string
    I string
    Tpt string
    ID string
    Game string
    Name string
    Fname string
    Lname string
    Gender string
    Dbirth string
    Email string
    Postal string
    Zip string
    Phone string
    Club string
    LichessUser string
}

type Pdata struct {
    Name string
    FName string
    LName string
    Dbirth time.Time
    Email string
    LichessUser string
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
    PPstat bool
}

type Pstat struct {
    Points int
    Wpoints int
    Bpoints int
    Ngames int
    APPG float32
    WAPPG float32
    BAPPG float32
    Stat []int
}

type Player struct {
    ID int
    Uname string
    ELO float64
    Pass []byte
    Pi Pdata
    TN Pstat
    AT Pstat
    Active bool
    Pause bool
    Status int
}

type Tournament struct {
    ID int
    Algo int
    Round int
    P []Player
    G []Game
    Seeding bool
    Start time.Time
    End time.Time
    Status int
}

type Game struct {
    ID string
    W int
    B int
    Winner int
    Compl bool
    Start time.Time
    End time.Time
    Status int
}

// Check and log errors
func Cherr(e error) {
    if e != nil { log.Println(e) }
}

// Loads defaults from config file
func Setmac() map[string]int {

    var ret map[string]int

    f, e := os.Open(MAC_FILE)
    Cherr(e)
    defer f.Close()

    b, e := ioutil.ReadAll(f)
    Cherr(e)

    json.Unmarshal(b, &ret)

    return ret
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

    ab, e := Rdb(db, Mac["A_ID"], Abuc)

    json.Unmarshal(ab, &a)

    return a, e
}

// Stores admin object to database
func Wradmin(a Admin, db *bolt.DB) {

    buf, e := json.Marshal(a)
    Cherr(e)

    e = Wrdb(db, Mac["A_ID"], buf, Abuc)
    Cherr(e)
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

        for k, v := c.Seek([]byte("1")); k != nil; k, v = c.Next() {
            t = Tournament{}
            json.Unmarshal(v, &t)
            ts = append(ts, t)
        }

        return nil
   })

    return ts
}
