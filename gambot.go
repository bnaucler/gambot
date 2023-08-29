package main

import (
    "fmt"
    "log"
    "sort"
    "flag"
    "strings"
    "regexp"
    "strconv"
    "net/http"
    "math/rand"
    "time"
    "encoding/json"

    bolt "go.etcd.io/bbolt"
    bcrypt "golang.org/x/crypto/bcrypt"
)


const S_OK = 0                      // Status code: OK
const S_ERR = 1                     // Status code: error
const A_ID = 0                      // Administrator ID

const DEF_PWIN = 2                  // Default point value for win
const DEF_PDRAW = 1                 // Default point value for draw
const DEF_PLOSS = 0                 // Default point value for loss
const DEF_DBNAME = ".gambot.db"     // Default database filename
const DEF_PORT = 9001               // Default server port

var abuc = []byte("abuc")           // admin bucket
var pbuc = []byte("pbuc")           // player bucket
var gbuc = []byte("gbuc")           // game bucket
var tbuc = []byte("tbuc")           // tournament bucket

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
    Wwin int
    Wdraw int
    Wloss int
    Bwin int
    Bdraw int
    Bloss int
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

// Create random string of length ln
func randstr(ln int) (string){

    const charset = "0123456789abcdefghijklmnopqrstuvwxyz"
    var cslen = len(charset)

    b := make([]byte, ln)
    for i := range b { b[i] = charset[rand.Intn(cslen)] }

    return string(b)
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

// Validates password to stored hash
func validateuser(a Admin, pass string) (bool) {

    e := bcrypt.CompareHashAndPassword(a.Pass, []byte(pass))

    if e == nil { return true
    } else { return false }
}

// Retrieves admin object from database
func getadmin(db *bolt.DB) (Admin, error) {

    a := Admin{}

    ab, e := rdb(db, A_ID, abuc)

    json.Unmarshal(ab, &a)

    return a, e
}

// Stores admin object to database
func writeadmin(a Admin, db *bolt.DB) {

    buf, e := json.Marshal(a)
    cherr(e)

    e = wrdb(db, A_ID, buf, abuc)
    cherr(e)
}

// Initializes points for win/draw/loss to default values
func setdefaultpoints(a Admin) Admin {

    a.Pwin = DEF_PWIN
    a.Pdraw = DEF_PDRAW
    a.Ploss = DEF_PLOSS

    return a
}

// HTTP handler - admin registration
func reghandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    cherr(e)

    a, e := getadmin(db)
    if e != nil {
        a = Admin{}
        a = setdefaultpoints(a)
    }

    if len(a.Pass) < 1 || validateuser(a, r.FormValue("opass")) {
        a.Pass, e = bcrypt.GenerateFromPassword([]byte(r.FormValue("pass")), bcrypt.DefaultCost)
        cherr(e)
        a.Skey = randstr(30)
        writeadmin(a, db)
        a.Pass = []byte("")

    } else if len(a.Pass) > 1 && !validateuser(a, r.FormValue("pass")) {
        fmt.Printf("Illegal admin registration attempt\n")
        a = Admin{}
    }

    enc := json.NewEncoder(w)
    enc.Encode(a)
}

// HTTP handler - admin login
func loginhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    cherr(e)

    a, e := getadmin(db)
    if e != nil { a = Admin{} }

    if validateuser(a, r.FormValue("pass")) {
        fmt.Printf("Admin login successful\n")
        a.Skey = randstr(30)
        writeadmin(a, db)
        a.Pass = []byte("")

    } else {
        fmt.Printf("Admin login failed\n")
        a = Admin{}
    }

    enc := json.NewEncoder(w)
    enc.Encode(a)
}

// HTTP handler - admin settings
func adminhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    cherr(e)

    rskey := r.FormValue("skey")

    a, e := getadmin(db)
    cherr(e)

    if !valskey(db, rskey) {
        ea := Admin{}
        ea.Status = S_ERR
        enc := json.NewEncoder(w)
        enc.Encode(ea)
        return
    }

    rpwin := r.FormValue("pwin")
    pwin, e := strconv.Atoi(rpwin)
    if e == nil { a.Pwin = pwin }

    rpdraw := r.FormValue("pdraw")
    pdraw, e := strconv.Atoi(rpdraw)
    if e == nil { a.Pdraw = pdraw }

    rploss := r.FormValue("ploss")
    ploss, e := strconv.Atoi(rploss)
    if e == nil { a.Ploss = ploss }

    writeadmin(a, db)

    a.Status = S_OK
    a.Pass = []byte("")

    enc := json.NewEncoder(w)
    enc.Encode(a)
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

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        ep := Player{}
        enc := json.NewEncoder(w)
        enc.Encode(ep)
        return
    }

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

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        ep := Player{}
        enc := json.NewEncoder(w)
        players := append(players, ep)
        enc.Encode(players)
        return
    }

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

// Returns true if skey matches current admin skey
func valskey(db *bolt.DB, skey string) bool {

    a, e := getadmin(db)
    cherr(e)

    if skey == a.Skey { return true }

    return false
}

// HTTP handler - create new tournament
func cthandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) Tournament {

    rskey := r.FormValue("skey")

    if t.ID != 0 {
        t.Status = S_ERR;
        enc := json.NewEncoder(w)
        enc.Encode(t)
        fmt.Printf("Tournament already ongoing!\n")
        return t

    } else if !valskey(db, rskey) {
        enc := json.NewEncoder(w)
        enc.Encode(t)
        fmt.Printf("Admin verification failed\n")
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

    rskey := r.FormValue("skey")
    qmap := r.Form["?id"]
    qstr := strings.Split(qmap[0], ",")

    if valskey(db, rskey) {
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
    }

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

// HTTP handler - Verifies skey against database
func verskeyhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    var ret bool

    e := r.ParseForm()
    cherr(e)

    rskey := r.FormValue("skey")

    a, e := getadmin(db)
    if e != nil || rskey != a.Skey {
        ret = false

    } else {
        ret = true
    }

    enc := json.NewEncoder(w)
    enc.Encode(ret)
}

// HTTP handler - Check if admin exists in db
func chkadmhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    var ret bool

    a, e := getadmin(db)
    if e != nil || len(a.Pass) < 1 {
        ret = false

    } else {
        ret = true
    }

    enc := json.NewEncoder(w)
    enc.Encode(ret)
}

// HTTP handler - get tournament history
func thhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    cherr(e)

    wn := r.FormValue("n")
    wi := r.FormValue("i")
    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        ts := []Tournament{}
        enc := json.NewEncoder(w)
        enc.Encode(ts)
        return
    }

    n, e := strconv.Atoi(wn)
    if e != nil { n = 1 }

    i, e := strconv.Atoi(wi)
    if e != nil { i = 1 }
    i--

    ts := revtslice(getalltournaments(db))

    tlen := len(ts)

    if ts[0].End.IsZero() { i++ }

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

    rskey := r.FormValue("skey")
    enc := json.NewEncoder(w)

    if !valskey(db, rskey) { t = Tournament{} }

    enc.Encode(t)
}

// Increments the Ngames parameter per user
func incrngame(g Game, t Tournament) Tournament {

    for i := 0; i < len(t.P); i++ {
        if g.W == t.P[i].ID { t.P[i].Ngames++ }
        if g.B == t.P[i].ID { t.P[i].Ngames++ }
    }

    return t
}

// Ends game by ID
func endgame(gid string, t Tournament) Tournament {

    for i := 0; i < len(t.G); i++ {
        if t.G[i].ID == gid {
            t.G[i].End = time.Now();
            t = incrngame(t.G[i], t)
            break
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
func declaredraw(gid string, p int, t Tournament) Tournament {

    for i := 0; i < len(t.G) ; i++ {
        if t.G[i].ID == gid {
            t = addpoints(t.G[i].W, p, t)
            t = addpoints(t.G[i].B, p, t)
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

// Returns losing player id based on winner id
func gloser(winner int, t Tournament) int {

    for _, g := range t.G {
        if g.W == winner {
            return g.B

        } else if g.B == winner {
            return g.W
        }
    }

    return 0
}

// HTTP handler - declare game result
func drhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB, t Tournament) Tournament {

    e := r.ParseForm()
    cherr(e)

    wid := r.FormValue("id")
    gid := r.FormValue("game")
    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        et := Tournament{}
        enc := json.NewEncoder(w)
        enc.Encode(et)
        return t
    }

    iid, e := strconv.Atoi(wid)
    cherr(e)

    a, e := getadmin(db)
    cherr(e)

    if iid == 0 {
        t = declaredraw(gid, a.Pdraw, t)
        fmt.Printf("Game %s is a draw!\n", gid)

    } else {
        t = addpoints(iid, a.Pwin, t)
        if a.Ploss != 0 { t = addpoints(gloser(iid, t), a.Ploss, t) }
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

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        et := Tournament{}
        enc := json.NewEncoder(w)
        enc.Encode(et)
        return t
    }

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
        dbp.TNgames += p.Ngames

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

    pptr := flag.Int("p", DEF_PORT, "port number to listen")
    dbptr := flag.String("d", DEF_DBNAME, "specify database to open")
    flag.Parse()

    rand.Seed(time.Now().UnixNano())

    db, e := bolt.Open(*dbptr, 0640, nil)
    cherr(e)
    defer db.Close()

    t := Tournament{}

    // static
    http.Handle("/", http.FileServer(http.Dir("static")))

    // admin registration
    http.HandleFunc("/reg", func(w http.ResponseWriter, r *http.Request) {
        reghandler(w, r, db)
    })

    // admin login
    http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
        loginhandler(w, r, db)
    })

    // admin settings
    http.HandleFunc("/admin", func(w http.ResponseWriter, r *http.Request) {
        adminhandler(w, r, db)
    })

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

    // Checks if admin exists in database (for new instance)
    http.HandleFunc("/chkadm", func(w http.ResponseWriter, r *http.Request) {
        chkadmhandler(w, r, db)
    })

    // Verifies provided skey with database
    http.HandleFunc("/verskey", func(w http.ResponseWriter, r *http.Request) {
        verskeyhandler(w, r, db)
    })

    // add players to tournament
    http.HandleFunc("/apt", func(w http.ResponseWriter, r *http.Request) {
        t = apthandler(w, r, db, t)
    })

    // declare game result
    http.HandleFunc("/dr", func(w http.ResponseWriter, r *http.Request) {
        t = drhandler(w, r, db, t)
    })

    lport := fmt.Sprintf(":%d", *pptr)
    e = http.ListenAndServe(lport, nil)
    cherr(e)
}
