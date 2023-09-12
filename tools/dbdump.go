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

const INDENT "    "                 // Indent with 4 spaces to make human-readable

func dumpadmin(db *bolt.DB, j bool) {
    a, e := gcore.Getadmin(db)
    gcore.Cherr(e)

    if j {
        wa, e := json.MarshalIndent(a, "", INDENT)
        gcore.Cherr(e)
        fmt.Printf("%s\n", wa)

    } else {
        fmt.Printf("%+v\n", a)
    }
}

func dumpplayers(db *bolt.DB, j bool) {
    p := gcore.Getallplayers(db)

    if j {
        wp, e := json.MarshalIndent(p, "", INDENT)
        gcore.Cherr(e)
        fmt.Printf("%s\n", wp)

    } else {
        fmt.Printf("%+v\n", p)
    }
}

func dumptournaments(db *bolt.DB, j bool) {
    t := gcore.Getalltournaments(db)

    if j {
        wt, e := json.MarshalIndent(t, "", INDENT)
        gcore.Cherr(e)
        fmt.Printf("%s\n", wt)

    } else {
        fmt.Printf("%+v\n", t)
    }
}

func main() {

    dbptr := flag.String("d", gcore.DEF_DBNAME, "specify database to open")
    aptr := flag.Bool("a", false, "dump admin data")
    tptr := flag.Bool("t", false, "dump tournament data")
    pptr := flag.Bool("p", false, "dump player data")
    jptr := flag.Bool("j", false, "JSON format")
    flag.Parse()

    db, e := bolt.Open(*dbptr, 0640, &bolt.Options{Timeout: 1 * time.Second})

    if e != nil {
        log.Fatal("Cannot obtain database lock")
    }

    defer db.Close()

    if *aptr { dumpadmin(db, *jptr) }
    if *tptr { dumptournaments(db, *jptr) }
    if *pptr { dumpplayers(db, *jptr) }
}
