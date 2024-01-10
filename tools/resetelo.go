package main

import (
    "log"
    "flag"
    "time"
    "strconv"
    "encoding/json"

    "github.com/bnaucler/gambot/lib/gcore"

    bolt "go.etcd.io/bbolt"
)

func main() {

    gcore.Mac = gcore.Setmac()

    dbptr := flag.String("d", gcore.DEF_DBNAME, "specify database to open")
    eptr := flag.Int("e", gcore.Mac["ELO_INIT"], "ELO value to set")
    rptr := flag.Bool("r", false, "reset ELO")
    gptr := flag.Bool("g", false, "reset all game data")
    vptr := flag.Bool("v", false, "increase verbosity level")
    flag.Parse()

    db, e := bolt.Open(*dbptr, 0640, &bolt.Options{Timeout: 1 * time.Second})

    if e != nil {
        log.Fatal("Cannot obtain database lock")
    }

    db.Update(func(tx *bolt.Tx) error {

        b := tx.Bucket(gcore.Pbuc)
        c := b.Cursor()

        for k, v := c.First(); k != nil; k, v = c.Next() {
            p := gcore.Player{}
            json.Unmarshal(v, &p)

            if(*rptr) {
                p.ELO = float64(*eptr)

            } else if(*gptr) {
                tps := gcore.Pstat{}
                p.TN = tps
                p.AT = tps
                p.TN.Stat = make([]int, 6)
                p.AT.Stat = make([]int, 6)
            }

            if(*vptr) {
                log.Printf("Updating player %s %s\n", p.Pi.FName, p.Pi.LName)
            }

            v, e := json.Marshal(p)
            gcore.Cherr(e)
            e = b.Put([]byte(strconv.Itoa(p.ID)), v)
            gcore.Cherr(e)
        }
        return nil
   })
}
