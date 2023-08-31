package main

import (
    "fmt"
    "log"
    "flag"
    "time"
    "encoding/json"

    "github.com/bnaucler/gambot/lib/gcore"

    bolt "go.etcd.io/bbolt"
)

func dumpplayers(db *bolt.DB, j bool) {
    p := gcore.Getallplayers(db)

    if j {
        wp, e := json.Marshal(p)
        gcore.Cherr(e)
        fmt.Printf("%s\n", wp)

    } else {
        fmt.Printf("%+v\n", p)
    }
}

func dumptournaments(db *bolt.DB, j bool) {
    t := gcore.Getalltournaments(db)

    if j {
        wt, e := json.Marshal(t)
        gcore.Cherr(e)
        fmt.Printf("%s\n", wt)

    } else {
        fmt.Printf("%+v\n", t)
    }
}

func main() {

    dbptr := flag.String("d", gcore.DEF_DBNAME, "specify database to open")
    tptr := flag.Bool("t", false, "tournaments")
    pptr := flag.Bool("p", false, "players")
    jptr := flag.Bool("j", false, "JSON format")
    flag.Parse()

    db, e := bolt.Open(*dbptr, 0640, &bolt.Options{Timeout: 1 * time.Second})

    if e != nil {
        log.Fatal("Cannot obtain database lock")
    }

    defer db.Close()

    if *tptr { dumptournaments(db, *jptr) }
    if *pptr { dumpplayers(db, *jptr) }
}
