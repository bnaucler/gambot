package main

import (
    "os"
    "fmt"
    "sort"
    "flag"
    "time"
    "regexp"
    "strings"
    "strconv"
    "net/http"
    "io/ioutil"
    "math/rand"
    "os/signal"
    "path/filepath"
    "encoding/json"

    "github.com/bnaucler/gambot/lib/gcore"

    bolt "go.etcd.io/bbolt"
    bcrypt "golang.org/x/crypto/bcrypt"
)

const S_OK = 0                      // Status code: OK
const S_ERR = 1                     // Status code: error

// Macro definitions for readability
const WHITE = 0
const BLACK = 1
const WIN = 0
const DRAW = 1
const LOSS = 2

const WWIN = 0
const WDRAW = 1
const WLOSS = 2
const BWIN = 3
const BDRAW = 4
const BLOSS = 5

type Tpresp struct {
    P []gcore.Player
    S string
    Ismax bool
}

// Create random string of length ln
func randstr(ln int) (string){

    const charset = "0123456789abcdefghijklmnopqrstuvwxyz"
    var cslen = len(charset)

    b := make([]byte, ln)
    for i := range b { b[i] = charset[rand.Intn(cslen)] }

    return string(b)
}

// Validates password to stored hash
func validateuser(a gcore.Admin, pass string) (bool) {

    e := bcrypt.CompareHashAndPassword(a.Pass, []byte(pass))

    if e == nil { return true
    } else { return false }
}

// Stores admin object to database
func writeadmin(a gcore.Admin, db *bolt.DB) {

    buf, e := json.Marshal(a)
    gcore.Cherr(e)

    e = gcore.Wrdb(db, gcore.A_ID, buf, gcore.Abuc)
    gcore.Cherr(e)
}

// Initializes points for win/draw/loss to default values
func setdefaultpoints(a gcore.Admin) gcore.Admin {

    a.Pwin = gcore.DEF_PWIN
    a.Pdraw = gcore.DEF_PDRAW
    a.Ploss = gcore.DEF_PLOSS

    return a
}

// Stores current tournament object to DB
func storect(db *bolt.DB, t gcore.Tournament) error {

    wt, e := json.Marshal(t)
    gcore.Cherr(e)

    e = gcore.Wrdb(db, gcore.CTINDEX, []byte(wt), gcore.Tbuc)

    return e
}

// Retrieves current tournament object from DB
func getct(db *bolt.DB) (gcore.Tournament, error){

    t := gcore.Tournament{}
    wt, e := gcore.Rdb(db, gcore.CTINDEX, gcore.Tbuc)

    e = json.Unmarshal(wt, &t)

    return t, e
}

// HTTP handler - admin registration
func reghandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    gcore.Cherr(e)

    a, e := gcore.Getadmin(db)
    if e != nil {
        a = gcore.Admin{}
        a = setdefaultpoints(a)
    }

    if len(a.Pass) < 1 || validateuser(a, r.FormValue("opass")) {
        a.Pass, e = bcrypt.GenerateFromPassword([]byte(r.FormValue("pass")), bcrypt.DefaultCost)
        gcore.Cherr(e)
        a.Skey = randstr(30)
        writeadmin(a, db)
        a.Pass = []byte("")

    } else if len(a.Pass) > 1 && !validateuser(a, r.FormValue("pass")) {
        fmt.Printf("Illegal admin registration attempt\n")
        a = gcore.Admin{}
    }

    enc := json.NewEncoder(w)
    enc.Encode(a)
}

// HTTP handler - admin login
func loginhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    gcore.Cherr(e)

    a, e := gcore.Getadmin(db)
    if e != nil { a = gcore.Admin{} }

    if validateuser(a, r.FormValue("pass")) {
        fmt.Printf("Admin login successful\n")
        a.Skey = randstr(30)
        writeadmin(a, db)
        a.Pass = []byte("")

    } else {
        fmt.Printf("Admin login failed\n")
        a = gcore.Admin{}
    }

    enc := json.NewEncoder(w)
    enc.Encode(a)
}

// HTTP handler - admin settings
func adminhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    gcore.Cherr(e)

    rskey := r.FormValue("skey")

    a, e := gcore.Getadmin(db)
    gcore.Cherr(e)

    if !valskey(db, rskey) {
        ea := gcore.Admin{}
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

// Removes all deactivated players from slice
func rmdeacplayers(pl []gcore.Player) []gcore.Player {

    ret := []gcore.Player{}

    for _, p := range pl {
        if p.Active { ret = append(ret, p)}
    }

    return ret
}

// Returns slice with top n players from tournament t
func currenttop(db *bolt.DB, n int, t gcore.Tournament) ([]gcore.Player, bool) {

    var ismax bool = false

    players := make([]gcore.Player, len(t.P))
    copy(players, t.P)

    sort.Slice(players, func(i, j int) bool {
        return players[i].Points > players[j].Points
    })

    if n >= len(players) {
        n = len(players)
        ismax = true
    }

    return players[0:n], ismax
}

// Returns slice with all time top n players
func alltimetop(db *bolt.DB, n int) ([]gcore.Player, bool) {

    var ismax bool = false

    players := gcore.Getallplayers(db)
    players = rmdeacplayers(players)

    sort.Slice(players, func(i, j int) bool {
        return players[i].TPoints > players[j].TPoints
    })

    if n >= len(players) {
        n = len(players)
        ismax = true
    }

    return players[0:n], ismax
}

// HTTP handler - get top player(s)
func gtphandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    resp := Tpresp{}

    e := r.ParseForm()
    gcore.Cherr(e)

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        enc := json.NewEncoder(w)
        enc.Encode(resp)
        return
    }

    t, e := getct(db)
    gcore.Cherr(e)

    req := r.FormValue("n")
    rt := r.FormValue("t")

    n, e := strconv.Atoi(req)
    gcore.Cherr(e)

    resp.P = make([]gcore.Player, n)

    if rt == "a" {
        resp.P, resp.Ismax = alltimetop(db, n)
        resp.S = "a"

    } else if rt == "c" {
        resp.P, resp.Ismax = currenttop(db, n, t)
        resp.S = "c"

    } else {
        resp.S = "err"
    }

    enc := json.NewEncoder(w)
    enc.Encode(resp)
}

// HTTP handler - get player(s)
func gphandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    players := []gcore.Player{}

    e := r.ParseForm()
    gcore.Cherr(e)

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        enc := json.NewEncoder(w)
        enc.Encode(players)
        return
    }

    rid := r.FormValue("id")
    rname := r.FormValue("name")

    if rid == "" && rname == "" { // TODO REFACTOR
        players = gcore.Getallplayers(db)

    } else if rid != "" {
        id, e := strconv.Atoi(rid)
        gcore.Cherr(e) // TODO better handling needed

        cp := getdbplayerbyid(db, id)
        players = append(players, cp)

    } else {
        allplayers := gcore.Getallplayers(db)

        for _, p := range allplayers {
            reqlow := strings.ToLower(rname)
            nlow := strings.ToLower(p.Pi.Name)

            if strings.Contains(nlow, reqlow) {
                players = append(players, p)
            }
        }
    }

    enc := json.NewEncoder(w)
    enc.Encode(players)
}

// Toggles player pause
func togglepause(db *bolt.DB, p gcore.Player) gcore.Player {

    if p.Pause {
        fmt.Printf("Unpausing player %s\n", p.Pi.Name)

    } else {
        fmt.Printf("Pausing player %s\n", p.Pi.Name)
    }

    p.Pause = !p.Pause

    return p
}

// Reloads current tournament player object from db
func refreshplayer(db *bolt.DB, pid int, t gcore.Tournament) gcore.Tournament {

    p := getdbplayerbyid(db, pid)

    for i := 0; i < len(t.P); i++ {
        if t.P[i].ID == pid {
            t.P[i] = p
        }
    }

    return t
}

// HTTP handler - edit player
func ephandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    gcore.Cherr(e)

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        ep := gcore.Player{}
        enc := json.NewEncoder(w)
        enc.Encode(ep)
        return
    }

    rid := r.FormValue("id")
    raction := r.FormValue("action")
    id, e := strconv.Atoi(rid)
    gcore.Cherr(e)

    cplayer := getdbplayerbyid(db, id)

    if raction == "deac" {
        cplayer.Active = false
        fmt.Printf("Deactivating player %d: %s\n", cplayer.ID, cplayer.Pi.Name)

    } else if raction == "activate" {
        cplayer.Active = true
        fmt.Printf("Activating player %d: %s\n", cplayer.ID, cplayer.Pi.Name)

    } else if raction == "pause" {
        t, e := getct(db)
        gcore.Cherr(e)

        cplayer = togglepause(db, cplayer)
        storeplayer(db, cplayer)
        t = refreshplayer(db, id, t)

        if ingame(id, t) { cancelgamebyuid(db, id, t) }

        e  = storect(db, t)
        gcore.Cherr(e)
    }

    buf, e := json.Marshal(cplayer)
    gcore.Cherr(e)

    e = gcore.Wrdb(db, id, buf,  gcore.Pbuc)
    gcore.Cherr(e)

    enc := json.NewEncoder(w)
    enc.Encode(cplayer)
}

// Processes string with regex to produce a valid name
func procname(raw string) string {

    var nregex = regexp.MustCompile(`[^a-zA-ZÀ-ÿ\ \- ]+`)

    ret := nregex.ReplaceAllString(raw, "")

    return strings.TrimSpace(ret)
}

// Processes player name request and populates object properties
func valplayername(p gcore.Player) gcore.Player {

    pfname := procname(p.Pi.FName)
    plname := procname(p.Pi.LName)

    pname := fmt.Sprintf("%s %s", pfname, plname)

    if len(pname) > gcore.NMAXLEN { pname = pname[:gcore.NMAXLEN] }

    p.Pi.FName = pfname
    p.Pi.LName = plname
    p.Pi.Name = pname

    return p
}

// HTTP handler - add new player
func aphandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    var players []gcore.Player

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        enc := json.NewEncoder(w)
        enc.Encode(players)
        return
    }

    p := gcore.Player{Active: true, Stat: make([]int, 6)}

    p.Pi = gcore.Pdata{FName: r.FormValue("fname"),
                       LName: r.FormValue("lname"),
                       Gender: r.FormValue("gender"),
                       Email: r.FormValue("email"),
                       PostalAddr: r.FormValue("postal"),
                       Zip: r.FormValue("zip"),
                       Phone: r.FormValue("phone"),
                       Club: r.FormValue("club")}

    p = valplayername(p)

    tm, e := time.Parse("2006-01-02", r.FormValue("dbirth"))
    if e == nil { p.Pi.Dbirth = tm }

    if p.Pi.Name == "" {
        p.Status = S_ERR

    } else {
        db.Update(func(tx *bolt.Tx) error { // TODO refactor to separate func
            b, _ := tx.CreateBucketIfNotExists(gcore.Pbuc)

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
func mkgame(t gcore.Tournament) gcore.Game {

    game := gcore.Game{}

    game.Start = time.Now()
    game.ID = fmt.Sprintf("%d/%d", t.ID, len(t.G) + 1)

    return game
}

// Returns true if players have met during selected tournament
func haveplayed(p1 int, p2 int, t gcore.Tournament) bool {

    for _, g := range t.G {
        if g.W == p1 && g.B == p2 { return true }
        if g.W == p2 && g.B == p1 { return true }
    }

    return false
}

// Returns true if player is currently in an active game
func ingame(id int, t gcore.Tournament) bool {

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
func findopp(id int, t gcore.Tournament) int {

    var opps []int

    for _, p := range t.P {
        if p.ID == id || ingame(p.ID, t) ||
           haveplayed(id, p.ID, t) || ispaused(p.ID, t) {
            continue
        }
        opps = append(opps, p.ID)
    }

    olen := len(opps)

    if olen == 0 { return 0 }

    return opps[rand.Intn(olen)]
}

// returns slice with player IDs, currently not in a game
func availableplayers(t gcore.Tournament) []int {

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
func whitepp(id int, t gcore.Tournament) int {

    ret := 0

    for _, g := range t.G  {
        if g.W == id { ret++ }
    }

    return ret
}

// Returns total number of games where id played black
func blackpp(id int, t gcore.Tournament) int {

    ret := 0

    for _, g := range t.G  {
        if g.B == id { ret++ }
    }

    return ret
}

// Locic to determine colors per player
func blackwhite(p1 int, p2 int, t gcore.Tournament) (int, int) {

    w1 := whitepp(p1, t)
    w2 := whitepp(p2, t)

    if w1 < w2 {
        return p1, p2
    } else if w2 < w1 {
        return p2, p1
    }

    return rndflip(p1, p2)
}

// Returns player pause status
func ispaused(id int, t gcore.Tournament) bool {

    for _, p := range t.P {
        if p.ID == id { return p.Pause }
    }

    return false
}

// Creates matchups within tournament
func seed(t gcore.Tournament) gcore.Tournament {

    ap := availableplayers(t)

    for _, pid := range ap {
        if ingame(pid, t) || ispaused(pid, t) { continue }
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

    a, e := gcore.Getadmin(db)
    gcore.Cherr(e)

    if skey == a.Skey { return true }

    return false
}

// HTTP handler - create new tournament
func cthandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    rskey := r.FormValue("skey")

    t, e := getct(db)
    gcore.Cherr(e)

    if t.ID != 0 {
        t.Status = S_ERR;
        enc := json.NewEncoder(w)
        enc.Encode(t)
        fmt.Printf("Tournament already ongoing!\n")
        return

    } else if !valskey(db, rskey) {
        enc := json.NewEncoder(w)
        enc.Encode(t)
        fmt.Printf("Admin verification failed\n")
        return
    };

    t = gcore.Tournament{}
    t.Start = time.Now()
    t.Status = S_OK;

    db.Update(func(tx *bolt.Tx) error {
        b, _ := tx.CreateBucketIfNotExists(gcore.Tbuc)

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

    e  = storect(db, t)
    gcore.Cherr(e)
}

// Returns true if player enrolled in tournament
func isintournament(t gcore.Tournament, p int) bool {

    for _, elem := range t.P {
        if elem.ID == p {
            return true
        }
    }

    return false
}

// Sets all values in int slice to 0
func slicesetall(sl []int, val int) []int {

    slen := len(sl)

    for i := 0; i < slen; i ++ { sl[i] = val }

    return sl
}

// Add player to tournament
func apt(db *bolt.DB, t gcore.Tournament, p int) gcore.Tournament {

    if t.ID == 0 || isintournament(t, p) { return t }

    cp := getdbplayerbyid(db, p)
    cp.Points = 0
    cp.Pause = false

    t.P = append(t.P, cp)

    return t
}

// HTTP handler - Add player to tournament
func apthandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    var regexnum = regexp.MustCompile(`[^\p{N} ]+`)

    e := r.ParseForm()
    gcore.Cherr(e)

    rskey := r.FormValue("skey")
    qmap := r.Form["?id"]
    qstr := strings.Split(qmap[0], ",")

    t, e := getct(db)
    gcore.Cherr(e)

    if valskey(db, rskey) {
        for _, elem := range qstr {
            clean := regexnum.ReplaceAllString(elem, "")
            if clean == "" {
                fmt.Printf("No players to add\n")
                break
            }
            ie, e := strconv.Atoi(clean)
            gcore.Cherr(e)
            t = apt(db, t, ie)
            storeplayer(db, gettplayerbyid(ie, t))
        }
        t = seed(t)
    }

    e = storect(db, t)
    gcore.Cherr(e)

    enc := json.NewEncoder(w)
    enc.Encode(t)
}

// Sorts tournament slice by ID and returns
func revtslice(ts []gcore.Tournament) []gcore.Tournament {

    sort.Slice(ts, func(i, j int) bool {
        return ts[i].ID > ts[j].ID
    })

    return ts
}

// HTTP handler - Verifies skey against database
func verskeyhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    var ret bool

    e := r.ParseForm()
    gcore.Cherr(e)

    rskey := r.FormValue("skey")

    a, e := gcore.Getadmin(db)
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

    a, e := gcore.Getadmin(db)
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
    gcore.Cherr(e)

    wn := r.FormValue("n")
    wi := r.FormValue("i")
    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        ts := []gcore.Tournament{}
        enc := json.NewEncoder(w)
        enc.Encode(ts)
        return
    }

    n, e := strconv.Atoi(wn)
    if e != nil { n = 1 }

    i, e := strconv.Atoi(wi)
    if e != nil { i = 1 }
    i--

    ts := revtslice(gcore.Getalltournaments(db))

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
func tshandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    t, e := getct(db)
    gcore.Cherr(e)

    rskey := r.FormValue("skey")
    enc := json.NewEncoder(w)

    if !valskey(db, rskey) { t = gcore.Tournament{} }

    enc.Encode(t)
}

// Increments the Ngames parameter per user
func incrngame(g gcore.Game, t gcore.Tournament) gcore.Tournament {

    for i := 0; i < len(t.P); i++ {
        if g.W == t.P[i].ID || g.B == t.P[i].ID {
            t.P[i].Ngames++
            t.P[i].TNgames++
        }
    }

    return t
}

// Ends game by ID
func endgame(gid string, wid int, t gcore.Tournament) gcore.Tournament {

    for i := 0; i < len(t.G); i++ {
        if t.G[i].ID == gid {
            t.G[i].End = time.Now();
            t.G[i].Winner = wid
            t = incrngame(t.G[i], t)
            break
        }
    }

    return t
}

// Adds p points to player, ID as key
func addpoints(id int, p int, t gcore.Tournament) gcore.Tournament {

    for i := 0; i < len(t.P) ; i++ {
        if t.P[i].ID == id {
            t.P[i].Points += p
            t.P[i].TPoints += p
        }
    }
    return t
}

// Awards points to both players in a draw
func declaredraw(gid string, p int, t gcore.Tournament) gcore.Tournament {

    for i := 0; i < len(t.G) ; i++ {
        if t.G[i].ID == gid {
            t = addpoints(t.G[i].W, p, t)
            t = addstat(t.G[i].W, WHITE, DRAW, t)

            t = addpoints(t.G[i].B, p, t)
            t = addstat(t.G[i].B, BLACK, DRAW, t)
        }
    }

    return t
}

// Retrieves name from ID in database
func getplayername(db *bolt.DB, id int) string  {

    wp, e := gcore.Rdb(db, id, gcore.Pbuc)
    p := gcore.Player{}

    e = json.Unmarshal(wp, &p)
    gcore.Cherr(e)

    return p.Pi.Name
}

// Returns losing player id based on winner id
func gloser(winner int, t gcore.Tournament) int {

    for _, g := range t.G {
        if !g.End.IsZero() {
            continue;

        } else if g.W == winner {
            return g.B

        } else if g.B == winner {
            return g.W
        }
    }

    return 0
}

// Returns color (WHITE / BLACK) in ongoing game or -1 at error
func getcol(pid int, t gcore.Tournament) int {

    for _, g := range t.G {
        if !g.End.IsZero() {
            continue;

        } else if pid == g.W {
            return WHITE

        } else if pid == g.B {
            return BLACK
        }
    }

    return -1
}

// Returns opposite color
func oppcol(col int) int {

    if col == WHITE { return BLACK }

    return WHITE
}

// Adds appropriate statistics to player object
func addstat(pid int, col int, res int, t gcore.Tournament) gcore.Tournament {

    index := 0

    for i := 0; i < len(t.P); i++ {
        if t.P[i].ID != pid { continue }

        if col == WHITE && res == WIN {
            index = WWIN

        } else if col == WHITE && res == DRAW {
            index = WDRAW

        } else if col == WHITE && res == LOSS {
            index = WLOSS

        } else if col == BLACK && res == WIN {
            index = BWIN

        } else if col == BLACK && res == DRAW {
            index = BDRAW

        } else if col == BLACK && res == LOSS {
            index = BLOSS
        }

        t.P[i].Stat[index]++
    }

    return t
}

// Returns player object with specified id
func getdbplayerbyid(db *bolt.DB, pid int) gcore.Player {

    cp := gcore.Player{}

    p, e := gcore.Rdb(db, pid, gcore.Pbuc)
    gcore.Cherr(e)

    json.Unmarshal(p, &cp)

    return cp
}

// Returns player with specified ID from tournament struct
func gettplayerbyid(pid int, t gcore.Tournament) gcore.Player {

    for _, p := range t.P {
        if p.ID == pid {return p }
    }

    return gcore.Player{}
}

// Updates database record for player p
func storeplayer(db *bolt.DB, p gcore.Player) {

    wp, e := json.Marshal(p)

    e = gcore.Wrdb(db, p.ID, []byte(wp), gcore.Pbuc)
    gcore.Cherr(e)
}

// Stores both players in game to db
func storegameplayers(db *bolt.DB, gid string, t gcore.Tournament) {

    for _, g := range t.G {
        if g.ID == gid {
            storeplayer(db, gettplayerbyid(g.W, t))
            storeplayer(db, gettplayerbyid(g.B, t))
            break
        }
    }
}

// HTTP handler - declare game result
func drhandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    gcore.Cherr(e)

    wid := r.FormValue("id")
    gid := r.FormValue("game")
    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        et := gcore.Tournament{}
        enc := json.NewEncoder(w)
        enc.Encode(et)
        return
    }

    t, e := getct(db)
    gcore.Cherr(e)

    iid, e := strconv.Atoi(wid)
    gcore.Cherr(e)

    a, e := gcore.Getadmin(db)
    gcore.Cherr(e)

    if iid == 0 {
        t = declaredraw(gid, a.Pdraw, t)
        fmt.Printf("Game %s is a draw!\n", gid)

    } else {
        wcol := getcol(iid, t)
        t = addpoints(iid, a.Pwin, t)
        t = addstat(iid, wcol, WIN, t)
        t = addstat(gloser(iid, t), oppcol(wcol), LOSS, t)

        if a.Ploss != 0 { t = addpoints(gloser(iid, t), a.Ploss, t) }

        fmt.Printf("Game %s won by %s\n", gid, getplayername(db, iid))
    }

    t = endgame(gid, iid, t)
    storegameplayers(db, gid, t)
    t = seed(t)

    enc := json.NewEncoder(w)
    enc.Encode(t)

    e = storect(db, t)
    gcore.Cherr(e)
}

// Sums all indexes of two int slices
func sumslice(s1 []int, s2 []int) []int {

    slen := 0
    s1len := len(s1)
    s2len := len(s2)

    if s1len > s2len {
        slen = s2len

    } else {
        slen = s1len
    }

    ret := make([]int, slen)

    for i := 0; i < slen; i++ {
        ret[i] = s1[i] + s2[i]
    }

    return ret
}

// Ends tournament t
func endtournament(db *bolt.DB, t gcore.Tournament) gcore.Tournament {

    if t.ID == 0 { // TODO check before write
        t.Status = S_ERR
        fmt.Printf("No tournament running - cannot end\n")

    } else {
        t.End = time.Now()

        for _, p := range t.P { storeplayer(db, p) }

        wt, e := json.Marshal(t)
        gcore.Cherr(e)

        e = gcore.Wrdb(db, t.ID, []byte(wt), gcore.Tbuc)
        gcore.Cherr(e)
        t.Status = S_OK
        fmt.Printf("Tournament %d ended at %d-%02d-%02d %02d:%02d\n", t.ID,
                t.End.Year(), t.End.Month(), t.End.Day(),
                t.End.Hour(), t.End.Minute())
    }

    return gcore.Tournament{}
}

// Cancels game containing player with ID uid - awards no points
func cancelgamebyuid(db *bolt.DB, uid int, t gcore.Tournament) gcore.Tournament {

    for i := 0; i < len(t.G); i++ {
        if t.G[i].W == uid || t.G[i].B == uid {
            t.G[i].End = time.Now(); // Ngames is not incremented
            fmt.Printf("Cancelling game %s\n", t.G[i].ID)
        }
    }

    return t
}

// Removes player with id pid from ongoing tournament
func rtplayer(db *bolt.DB, pid int, t gcore.Tournament) gcore.Tournament {

    npl := []gcore.Player{}

    for _, p := range t.P {
        if p.ID != pid {
            npl = append(npl, p)

        } else if ingame(pid, t) {
            t = cancelgamebyuid(db, pid, t);
            t = seed(t)
        }
    }

    t.P = npl
    pn := getplayername(db, pid)
    fmt.Printf("Removing %s (id: %d) from tournament %d\n", pn, pid, t.ID)

    return t
}

// Returns slice of IDs for players currently not in a game
func getbenchplayers(t gcore.Tournament) []int {

    ret := []int{}

    for _, p := range t.P {
        if !ingame(p.ID, t) && !ispaused(p.ID, t) { ret = append(ret, p.ID) }
    }

    return ret
}

// Removes item with the value v from slice
func rmitemfromintslice(v int, s []int) []int {

    ret := []int{}

    for _, sv := range s {
        if v != sv { ret = append(ret, sv)}
    }

    return ret
}

// HTTP handler - creates game
func mkgamehandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    e := r.ParseForm()
    gcore.Cherr(e)

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        et := gcore.Tournament{}
        enc := json.NewEncoder(w)
        enc.Encode(et)
        return
    }

    rid := r.FormValue("id")
    pid, e := strconv.Atoi(rid)
    gcore.Cherr(e)

    t, e := getct(db)

    bp := getbenchplayers(t)
    bp = rmitemfromintslice(pid, bp)
    blen := len(bp)

    if blen > 0 {
        opp :=  bp[rand.Intn(blen)]
        game := mkgame(t)
        game.W, game.B = blackwhite(pid, opp, t)
        t.G = append(t.G, game)
    }

    e = storect(db, t)
    gcore.Cherr(e)

    enc := json.NewEncoder(w)
    enc.Encode(t)
}

// HTTP handler - edit tournament
func ethandler(w http.ResponseWriter, r *http.Request, db *bolt.DB) {

    rskey := r.FormValue("skey")

    if !valskey(db, rskey) {
        et := gcore.Tournament{}
        enc := json.NewEncoder(w)
        enc.Encode(et)
        return
    }

    t, e := getct(db)
    gcore.Cherr(e)

    act := r.FormValue("action")

    if act == "end" {
        t = endtournament(db, t)
        et := gcore.Tournament{}
        e = storect(db, et)
        gcore.Cherr(e)

    } else if act == "rem" {
        rid := r.FormValue("id")
        id, e := strconv.Atoi(rid)
        gcore.Cherr(e)
        t = rtplayer(db, id, t)
        e = storect(db, t)
        gcore.Cherr(e)
    }

    enc := json.NewEncoder(w)
    enc.Encode(t)
}

// Launches mapped handler functions
func starthlr(url string, fn gcore.Hfn, db *bolt.DB) {

    http.HandleFunc(url, func(w http.ResponseWriter, r *http.Request) {
        fn(w, r, db)
    })
}

// Enables clean shutdown. Needs delay for caller to send response
func shutdown(pidfile string) {

    go func() {
        time.Sleep(1 * time.Second)
        os.Remove(pidfile)
        os.Exit(0)
    }()
}

// Setting up signal handler
func sighandler(pidfile string) {

    sigc := make(chan os.Signal, 1)
    signal.Notify(sigc, os.Interrupt)
    go func(){
        for sig := range sigc {
            fmt.Printf("Caught %+v - cleaning up.\n", sig)
            shutdown(pidfile)
        }
    }()
}

// Creates PID file and launches signal handler
func ginit() {

    prgname := filepath.Base(os.Args[0])
    pid := os.Getpid()

    pidfile := fmt.Sprintf("%s.pid", prgname)
    e := ioutil.WriteFile(pidfile, []byte(strconv.Itoa(pid)), 0644)
    gcore.Cherr(e)

    sighandler(pidfile)
}

func main() {

    pptr := flag.Int("p", gcore.DEF_PORT, "port number to listen")
    dbptr := flag.String("d", gcore.DEF_DBNAME, "specify database to open")
    flag.Parse()

    rand.Seed(time.Now().UnixNano())
    ginit()

    db, e := bolt.Open(*dbptr, 0640, nil)
    gcore.Cherr(e)
    defer db.Close()

    et := gcore.Tournament{}
    e = storect(db, et)
    gcore.Cherr(e)

    http.Handle("/", http.FileServer(http.Dir("static")))

    var hlrs = map[string]gcore.Hfn {
        "/reg":             reghandler,     // Admin registration
        "/login":           loginhandler,   // Admin login
        "/admin":           adminhandler,   // Admin settings
        "/chkadm":          chkadmhandler,  // Check if admin exists in db
        "/verskey":         verskeyhandler, // Verifies skey with database
        "/mkgame":          mkgamehandler,  // Requests creation of new game
        "/ap":              aphandler,      // Add player
        "/ep":              ephandler,      // Edit player
        "/gp":              gphandler,      // Get player
        "/gtp":             gtphandler,     // Get top players
        "/ct":              cthandler,      // Create tournament
        "/et":              ethandler,      // Edit tournament
        "/apt":             apthandler,     // Add player to tournament
        "/ts":              tshandler,      // Get tournament status
        "/th":              thhandler,      // Get tournament history
        "/dr":              drhandler,      // Declare game result
    }

    for url, fn := range hlrs { starthlr(url, fn, db) }

    lport := fmt.Sprintf(":%d", *pptr)
    e = http.ListenAndServe(lport, nil)
    gcore.Cherr(e)
}
