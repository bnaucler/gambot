package main

import (
    "fmt"
    "log"
    "sort"
    "strings"
    "regexp"
    "strconv"
    "net/http"
    "math/rand"
    "time"
    "encoding/json"

    bolt "go.etcd.io/bbolt"
)

const dbname = ".arena.db"
const datakey = 0
const S_OK = 0
const S_ERR = 1

var pbuc = []byte("pbuc")       // player bucket
var gbuc = []byte("gbuc")       // game bucket
var tbuc = []byte("tbuc")       // tournament bucket

type Player struct {
    ID int
    Name string
    Ngames int
    Points int
    TPoints int
    Active bool
    Status int
}

type Game struct {
    ID string
    W int
    B int
    Start time.Time
    End time.Time
}

type Tournament struct {
    ID int
    P []Player
    G []Game
    Start time.Time
    End time.Time
    Status int
}

type Req struct {
    ID string
    Name string
    Action string
}

type Tpresp struct {
    P []Player
    S string
}

func cherr(e error) {
    if e != nil { log.Fatal(e) }
}

// Write byte slice to DB
func wrdb(db *bolt.DB, k int, v []byte, cbuc []byte) (e error) {

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
func rdb(db *bolt.DB, k int, cbuc []byte) (v []byte, e error) {

    e = db.View(func(tx *bolt.Tx) error {
        b := tx.Bucket(cbuc)
        if b == nil { return fmt.Errorf("No bucket!") }

        v = b.Get([]byte(strconv.Itoa(k)))
        return nil
    })
    return
}

// Returns slice containing all tournament objects in db
func getalltournaments(db *bolt.DB) []Tournament {

    var ts []Tournament
    var t Tournament

    db.View(func(tx *bolt.Tx) error {

        b := tx.Bucket(tbuc)
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

// Returns slice containing all player objects in db
func getallplayers(db *bolt.DB) []Player {

    var players []Player
    var cp Player

    db.View(func(tx *bolt.Tx) error {

        b := tx.Bucket(pbuc)
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

// Returns slice with top n players from tournament t
func currenttop(db *bolt.DB, n int, t Tournament) []Player {

    players := make([]Player, len(t.P))
    copy(players, t.P)

    sort.Slice(players, func(i, j int) bool {
        return players[i].Points > players[j].Points
    })

    if n > len(players) { n = len(players) }

    return players[0:n]
}

// Returns slice with all time top n players
func alltimetop(db *bolt.DB, n int) []Player {

    players := getallplayers(db)

    sort.Slice(players, func(i, j int) bool {
        return players[i].TPoints > players[j].TPoints
    })

    if n > len(players) { n = len(players) }

    return players[0:n]
}

// HTTP handler - get top player(s)
func gtphandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) {

    resp := Tpresp{}

    e := r.ParseForm()
    cherr(e)

    req := r.FormValue("n")
    rt := r.FormValue("t")

    n, e := strconv.Atoi(req)
    cherr(e)

    resp.P = make([]Player, n)

    if rt == "a" {
        resp.P = alltimetop(db, n)
        resp.S = "a"

    } else if rt == "c" {
        resp.P = currenttop(db, n, t)
        resp.S = "c"

    } else {
        resp.S = "err"
    }

    enc := json.NewEncoder(w)
    enc.Encode(resp)
}

// HTTP handler - get player(s)
func gphandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    var players []Player
    var cp Player

    e := r.ParseForm()
    cherr(e)
    req := Req{ID: r.FormValue("id"), Name: r.FormValue("name")}

    if req.ID == "" && req.Name == "" { // TODO REFACTOR
        players = getallplayers(db)

    } else if req.ID != "" {
        id, e := strconv.Atoi(req.ID)
        cherr(e)

        p, e := rdb(db, id, pbuc)
        cherr(e)

        json.Unmarshal(p, &cp)
        players = append(players, cp)

    } else {
        allplayers := getallplayers(db)

        for _, p := range allplayers {
            reqlow := strings.ToLower(req.Name)
            nlow := strings.ToLower(p.Name)

            if strings.Contains(nlow, reqlow) {
                players = append(players, p)
            }
        }
    }

    enc := json.NewEncoder(w)
    enc.Encode(players)
}

// HTTP handler - edit player
func ephandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    cherr(e)

    req := Req{ID: r.FormValue("id"), Action: r.FormValue("action")}
    id, e := strconv.Atoi(req.ID)
    cherr(e)

    p, e := rdb(db, id, pbuc)
    cherr(e)

    cplayer := Player{}
    json.Unmarshal(p, &cplayer)

    if req.Action == "deac" { // deactivate
        cplayer.Active = false
        fmt.Printf("Deactivating player %d: %s\n", cplayer.ID, cplayer.Name)

    } else if req.Action == "activate" {
        cplayer.Active = true
        fmt.Printf("Activating player %d: %s\n", cplayer.ID, cplayer.Name)
    }

    buf, e := json.Marshal(cplayer)
    cherr(e)

    e = wrdb(db, id, buf,  pbuc)
    cherr(e)

    enc := json.NewEncoder(w)
    enc.Encode(cplayer)
}


// HTTP handler - add new player
func aphandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    cherr(e)

    var players []Player

    p := Player{Name: r.FormValue("name"), Active: true}

    if p.Name == "" {
        p.Status = S_ERR

    } else {
        db.Update(func(tx *bolt.Tx) error {
            b, _ := tx.CreateBucketIfNotExists([]byte("pbuc"))

            id, _ := b.NextSequence()
            p.ID = int(id)

            buf, e := json.Marshal(p)
            key := []byte(strconv.Itoa(p.ID))
            b.Put(key, buf)

            return e
        })
        p.Status = S_OK
    }

    players = append(players, p)
    enc := json.NewEncoder(w)
    enc.Encode(players)
}

// Creates new game with appropriate game ID
func mkgame(t Tournament) Game {

    game := Game{}

    game.Start = time.Now()
    game.ID = fmt.Sprintf("%d/%d", t.ID, len(t.G) + 1)

    return game
}

// Returns true if players have met during selected tournament
func haveplayed(p1 int, p2 int, t Tournament) bool {

    for _, g := range t.G {
        if g.W == p1 && g.B == p2 { return true }
        if g.W == p2 && g.B == p1 { return true }
    }

    return false
}

// Returns true if player is currently in an active game
func ingame(id int, t Tournament) bool {

    for _, g := range t.G {
        if !g.End.IsZero() {
            continue
        } else if id == g.W || id == g.B {
            return true
        }
    }

    return false
}

// Finds appropriate opponent based on tournament history
func findopp(id int, t Tournament) int {

    var opps []int

    for _, p := range t.P {
        if p.ID == id {
            continue
        } else if ingame(p.ID, t) {
            continue
        } else if haveplayed(id, p.ID, t) {
            continue
        }

        opps = append(opps, p.ID)
    }

    olen := len(opps)

    if olen == 0 { return 0 }

    return opps[rand.Intn(olen)]
}

// returns slice with player IDs, currently not in a game
func availableplayers(t Tournament) []int {

    var ret []int;

    for _, p := range t.P {
        if !ingame(p.ID, t) { ret = append(ret, p.ID)}
    }

    return ret
}

// 50% chance respectively to return integers in received or flipped order
func rndflip(p1 int, p2 int) (int, int) {

    if rand.Intn(2) == 1 {
        return p1, p2
    }

    return p2, p1
}

// Returns total number of games where id played white
func whitepp(id int, t Tournament) int {

    ret := 0

    for _, g := range t.G  {
        if g.W == id { ret++ }
    }

    return ret
}

// Returns total number of games where id played black
func blackpp(id int, t Tournament) int {

    ret := 0

    for _, g := range t.G  {
        if g.B == id { ret++ }
    }

    return ret
}

// Locic to determine colors per player
func blackwhite(p1 int, p2 int, t Tournament) (int, int) {

    w1 := whitepp(p1, t)
    w2 := whitepp(p2, t)

    if w1 < w2 {
        return p1, p2
    } else if w2 < w1 {
        return p2, p1
    }

    return rndflip(p1, p2)
}

// Creates matchups within tournament
func seed(t Tournament) Tournament {

    ap := availableplayers(t)

    for _, pid := range ap {
        if ingame(pid, t) { continue }
        opp := findopp(pid, t)
        if opp == 0 { continue }
        game := mkgame(t)
        game.W, game.B = blackwhite(pid, opp, t)
        t.G = append(t.G, game)
    }

    return t
}

// HTTP handler - create new tournament
func cthandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) Tournament {

    if t.ID != 0 {
        t.Status = S_ERR;
        enc := json.NewEncoder(w)
        enc.Encode(t)
        fmt.Printf("Tournament already ongoing!\n")
        return t
    }

    t = Tournament{}
    t.Start = time.Now()
    t.Status = S_OK;

    db.Update(func(tx *bolt.Tx) error {
        b, _ := tx.CreateBucketIfNotExists([]byte("tbuc"))

        id, _ := b.NextSequence()
        t.ID = int(id)
        key := []byte(strconv.Itoa(t.ID))

        buf, e := json.Marshal(t)
        b.Put(key, buf)

        return e
    })

    fmt.Printf("Tournament %d started at %d-%02d-%02d %02d:%02d\n", t.ID,
                t.Start.Year(), t.Start.Month(), t.Start.Day(),
                t.Start.Hour(), t.Start.Minute())

    enc := json.NewEncoder(w)
    enc.Encode(t)

    return t
}

// Returns true if player enrolled in tournament
func isintournament(t Tournament, p int) bool {

    for _, elem := range t.P {
        if elem.ID == p {
            return true
        }
    }

    return false
}

// Add player to tournament
func apt(db *bolt.DB, t Tournament, p int) Tournament {

    if t.ID == 0 || isintournament(t, p) { return t }

    cpb, e := rdb(db, p, pbuc)
    cherr(e)

    cp := Player{}

    e = json.Unmarshal(cpb, &cp)
    cherr(e)

    t.P = append(t.P, cp)

    return t
}

// HTTP handler - Add player to tournament
func apthandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) Tournament {

    var regexnum = regexp.MustCompile(`[^\p{N} ]+`)

    e := r.ParseForm()
    cherr(e)

    qmap := r.Form["?id"]
    qstr := strings.Split(qmap[0], ",")

    for _, elem := range qstr {
        clean := regexnum.ReplaceAllString(elem, "")
        if clean == "" {
            fmt.Printf("No players to add\n")
            break
        }
        ie, e := strconv.Atoi(clean)
        cherr(e)
        t = apt(db, t, ie)
    }

    t = seed(t)

    enc := json.NewEncoder(w)
    enc.Encode(t)

    return t
}

// Sorts tournament slice by ID and returns
func revtslice(ts []Tournament) []Tournament {

    sort.Slice(ts, func(i, j int) bool {
        return ts[i].ID > ts[j].ID
    })

    return ts
}

// HTTP handler - get tournament history
func thhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    wn := r.FormValue("n")
    wi := r.FormValue("i")

    n, e := strconv.Atoi(wn)
    if e != nil { n = 10 }

    i, e := strconv.Atoi(wi)
    if e != nil { i = 1 }
    i--

    ts := revtslice(getalltournaments(db))

    tlen := len(ts)

    if i > tlen || i < 0 {
        i = 0
        n = 0

    } else if i + n > tlen {
        n = tlen - i;

    } else if n > tlen {
        n = tlen
    }

    enc := json.NewEncoder(w)
    enc.Encode(ts[i:(i + n)])
}

// HTTP handler - get tournament status
func tshandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) {

    enc := json.NewEncoder(w)
    enc.Encode(t)
}

// Ends game by ID
func endgame(gid string, t Tournament) Tournament {

    for i := 0; i < len(t.G); i++ {
        if t.G[i].ID == gid {
            t.G[i].End = time.Now();
        }
    }

    return t
}

// Adds p points to player, ID as key
func addpoints(id int, p int, t Tournament) Tournament {

    for i := 0; i < len(t.P) ; i++ {
        if t.P[i].ID == id {
            t.P[i].Points += p
        }
    }
    return t
}

// Awards points to both players in a draw
func declaredraw(gid string, t Tournament) Tournament {

    for i := 0; i < len(t.G) ; i++ {
        if t.G[i].ID == gid {
            t = addpoints(t.G[i].W, 1, t)
            t = addpoints(t.G[i].B, 1, t)
        }
    }

    return t
}

// Retrieves name from ID in database
func getplayername(db *bolt.DB, id int) string  {

    wp, e := rdb(db, id, pbuc)
    p := Player{}

    e = json.Unmarshal(wp, &p)
    cherr(e)

    return p.Name
}

// HTTP handler - declare game result
func drhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) Tournament {

    e := r.ParseForm()
    cherr(e)

    wid := r.FormValue("id")
    gid := r.FormValue("game")

    iid, e := strconv.Atoi(wid)
    cherr(e)

    if iid == 0 {
        t = declaredraw(gid, t)
        fmt.Printf("Game %s is a draw!\n", gid)

    } else {
        t = addpoints(iid, 2, t)
        fmt.Printf("Game %s won by %s\n", gid, getplayername(db, iid))
    }

    t = endgame(gid, t)
    t = seed(t)

    enc := json.NewEncoder(w)
    enc.Encode(t)

    return t
}

// HTTP handler - end current tournament
func ethandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) Tournament {

    t.End = time.Now()

    wt, e := json.Marshal(t)
    cherr(e)

    e = wrdb(db, t.ID, []byte(wt), tbuc)
    cherr(e)

    for _, p := range t.P {
        wdbp, e := rdb(db, p.ID, pbuc)
        dbp := Player{}

        e = json.Unmarshal(wdbp, &dbp)
        cherr(e)

        dbp.TPoints += p.Points
        wp, e := json.Marshal(dbp)

        e = wrdb(db, p.ID, []byte(wp), pbuc)
        cherr(e)
    }

    if t.ID == 0 {
        t.Status = S_ERR
        fmt.Printf("No tournament running - cannot end\n")

    } else {
        t.Status = S_OK
        fmt.Printf("Tournament %d ended at %d-%02d-%02d %02d:%02d\n", t.ID,
                t.End.Year(), t.End.Month(), t.End.Day(),
                t.End.Hour(), t.End.Minute())
    }

    enc := json.NewEncoder(w)
    enc.Encode(t)

    return Tournament{}
}

func main() {

    rand.Seed(time.Now().UnixNano())

    db, e := bolt.Open(dbname, 0640, nil)
    cherr(e)
    defer db.Close()

    t := Tournament{}

    cherr(e)

    // static
    http.Handle("/", http.FileServer(http.Dir("static")))

    // add player
    http.HandleFunc("/ap", func(w http.ResponseWriter, r *http.Request) {
        aphandler(w, r, db)
    })

    // edit player
    http.HandleFunc("/ep", func(w http.ResponseWriter, r *http.Request) {
        ephandler(w, r, db)
    })

    // get player
    http.HandleFunc("/gp", func(w http.ResponseWriter, r *http.Request) {
        gphandler(w, r, db)
    })

    // get top players
    http.HandleFunc("/gtp", func(w http.ResponseWriter, r *http.Request) {
        gtphandler(w, r, db, t)
    })

    // create tournament
    http.HandleFunc("/ct", func(w http.ResponseWriter, r *http.Request) {
        t = cthandler(w, r, db, t)
    })

    // end tournament
    http.HandleFunc("/et", func(w http.ResponseWriter, r *http.Request) {
        t = ethandler(w, r, db, t)
    })

    // Get tournament status
    http.HandleFunc("/ts", func(w http.ResponseWriter, r *http.Request) {
        tshandler(w, r, db, t)
    })

    // Get tournament history
    http.HandleFunc("/th", func(w http.ResponseWriter, r *http.Request) {
        thhandler(w, r, db)
    })

    // add players to tournament
    http.HandleFunc("/apt", func(w http.ResponseWriter, r *http.Request) {
        t = apthandler(w, r, db, t)
    })

    // declare game result
    http.HandleFunc("/dr", func(w http.ResponseWriter, r *http.Request) {
        t = drhandler(w, r, db, t)
    })

    e = http.ListenAndServe(":9001", nil)
    cherr(e)
}
