// Alias to reduce typing
var gid = document.getElementById.bind(document);
var gss = sessionStorage.getItem.bind(sessionStorage);

const S_OK = 0;
const S_ERR = 1;

// HTTP request wrapper
function mkxhr(dest, params, rfunc) {

    var xhr = new XMLHttpRequest();

    xhr.open("POST", dest, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4 && xhr.status == 200) {
            rfunc(xhr);
        }
    }

    xhr.send(params);
}

// Returns player name from ID in tournament struct
function getplayername(id, t) {

    for(const p of t.P) {
        if(p.ID === id) return p.Name;
    }

    return null;
}

// Requests processing of won game
function declareresult(gid, pid, wname) {

    if(pid === 0) log("Game " + gid + " is a draw.")
    else log("Game " + gid + " won by " + wname)

    var params = "id=" + pid + "&game=" + gid + "&skey=" + gss("gambotkey");

    mkxhr("/dr", params, playersadded); // TOOD temp
}

// Returns true if player with name ID is currently in a game
function ingame(id, t) {

    for(const g of t.G) {
        if((g.W === id || g.B === id) && timezero(g.End)) return true;
    }

    return false;
}


// Adds player to bench by id
function addbench(id, t) {

    var pdiv = gid("bench");
    var player = document.createElement("div");

    player.appendChild(document.createTextNode(getplayername(id, t)));
    player.className = "benchp";

    pdiv.appendChild(player);
}

// Populates the bench (waiting players)
function popbench(t) {

    var bp = [];

    for(const p of t.P) {
        if(!ingame(p.ID, t)) bp.push(p.ID)
    }

    if(bp.length === 0) gid("bench").style.display = "none";
    else gid("bench").style.display = "block";

    for(const p of bp) addbench(p, t)
}

// Adds a game to the display window
function addgame(g, t) {

    var pdiv = gid("games");
    var game = document.createElement("div");
    var bw = document.createElement("div");
    var W = document.createElement("div");
    var B = document.createElement("div");
    var draw = document.createElement("div");
    var dtext = document.createElement("span");

    game.className = "game";
    draw.className = "draw";
    bw.className = "bw";
    W.className = "wp";
    B.className = "bp";

    W.appendChild(document.createTextNode(getplayername(g.W, t)));
    B.appendChild(document.createTextNode(getplayername(g.B, t)));
    dtext.appendChild(document.createTextNode("draw"));

    W.addEventListener("click", () => {
        declareresult(g.ID, g.W, getplayername(g.W, t));
    });

    B.addEventListener("click", () => {
        declareresult(g.ID, g.B, getplayername(g.W, t));
    });

    draw.addEventListener("click", () => {
        declareresult(g.ID, 0, "");
    });

    bw.appendChild(W);
    bw.appendChild(B);
    draw.appendChild(dtext);
    game.appendChild(bw);
    game.appendChild(draw);
    pdiv.appendChild(game);
}

// Creates bench element
function makebench(pdiv) {

    var bench = document.createElement("div");

    bench.id = "bench";

    pdiv.appendChild(bench);
}

// Updates game window with tournament data
function updatewindow(t) {

    var pdiv = gid("games");

    pdiv.innerHTML = "";

    if(t.P == null || t.G == null) return;
    if(t.ID != 0) gettopplayers(5, "c");
    else gettopplayers(5, "a");

    for(const g of t.G) {
        if(timezero(g.End)) addgame(g, t);
    }

    makebench(pdiv);
    popbench(t);
}

// Formats server date codes to a more easily readable format
function formatdate(d) {

    var date = d.substring(0, 10);
    var time = d.substring(11, 16);

    return date + " " + time;
}

// Returns names & score for n# of top players in tournament t
function ttop(n, t) {

    var tc = structuredClone(t.P)
    var ret = [];
    var plen = tc.length;

    tc.sort((i, j) => i.Points - j.Points);
    tc.reverse();

    if(n > plen) n = plen;

    for(var i = 0; i < n; i++) ret.push(tc[i].Name + " " + tc[i].Points)

    return ret;
}

// Adds individual player & score to tournament history list
function createtlistplayer(t, td) {

    var tpl = ttop(3, t);

    for(const p of tpl) {
        var tp = document.createElement("p");
        tp.className = "ttp";
        tp.appendChild(document.createTextNode(p));
        td.appendChild(tp);
    }
}

// Creates list item for tournament history
function createtlistitem(t) {

    var pdiv = gid("thist");
    var td = document.createElement("div");
    var id = document.createElement("p");
    var stime = document.createElement("p");

    td.className = "tlitm";
    id.className = "tid";
    stime.className = "ttime";

    id.appendChild(document.createTextNode(t.ID));
    stime.appendChild(document.createTextNode(
        formatdate(t.Start) + " - " + formatdate(t.End)));

    td.appendChild(id);
    td.appendChild(stime);

    if(!(t.P == null)) {
        createtlistplayer(t, td);

    } else {
        var tp = document.createElement("p");
        tp.className = "ttp";
        tp.appendChild(document.createTextNode("No players in tournament!"));
        td.appendChild(tp);
    }

    pdiv.appendChild(td);
}

// Displays tournament history
function updatethist(xhr) {

    var ts = JSON.parse(xhr.responseText);

    gid("thist").innerHTML = "";

    if(ts.length === 0) {
        log("No data received!");
        return;
    }

    for(const t of ts) {
        if(!timezero(t.End)) createtlistitem(t);
    }
}

// Call updatewindow() if request contains players
function playersadded(xhr) {

    var t = JSON.parse(xhr.responseText);
    if(t.P != undefined) updatewindow(t);
}

// Request adding selected players to current tournament
function playertotournament(elem) {

    let selectedplayers = document.querySelectorAll('input[name="selected"]:checked');
    let ids = [];

    selectedplayers.forEach((checkbox) => {
        ids.push(checkbox.value);
    });

    var olen = ids.length;
    var params = "?id=" + JSON.stringify(ids) + "&skey=" + gss("gambotkey");

    mkxhr("/apt", params, playersadded);

    gid("playerdata").style.display = "none";
}

// Displays list of players
function showplayers(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var pdiv = gid("playerdata");

    pdiv.innerHTML = "";
    pdiv.style.display = "block";

    for(const p of obj) {
        var post = document.createElement("div");
        var name = document.createElement("h4");

        post.className = "post";
        name.appendChild(document.createTextNode(p.Name));
        post.appendChild(name);

        if(p.Active === false) {
            post.style.backgroundColor = "#772222";

        } else {
            var cb = document.createElement("input");

            cb.type = "checkbox";
            cb.name = "selected";
            cb.value = p.ID;
            name.appendChild(cb);
        }

        pdiv.appendChild(post);
    }

    var btn = document.createElement("button");
    btn.appendChild(document.createTextNode("Add selected players to tournament"));

    btn.addEventListener("click", () => {
        playertotournament(pdiv);
    });

    pdiv.appendChild(btn);
}

// Returns true if time object is zero / null
function timezero(ttime) {

    if(ttime.startsWith("0001")) return true;
    else return false;
}

// Creates an entry in the local log
function log(data) {

    var pdiv = gid("logwin");
    var item = document.createElement("div");
    var msg = document.createElement("p");

    item.className = "log";

    msg.appendChild(document.createTextNode(data));
    item.appendChild(msg);
    pdiv.appendChild(item);
}

// Processes tournament start request and creates appropriate log entries
function tournamentstart(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var date = obj.Start.slice(0, 10)
    var time = obj.Start.slice(11, 16)

    if(obj.Status === S_ERR) log("Could not start new tournament");
    else {
        log("Tournament " + obj.ID + " started at " + date + " "+ time)

        if(obj.P === undefined) gid("games").innerHTML = "";
        else updatewindow(obj);
    }

    tournamentstarted();
}

// Processes tournament end request and creates appropriate log entries
function tournamentend(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var date = obj.End.slice(0, 10)
    var time = obj.End.slice(11, 16)

    if(obj.Status === S_ERR) log("No tournament running - cannot end!");
    else log("Tournament " + obj.ID + " ended at " + date + " "+ time)

    tournamentended();
    updatestatus(xhr);
}

// Requests start of new tournament
function newtournament() {

    var params = "skey=" + gss("gambotkey");

    mkxhr("/ct", params, tournamentstart);
    gettopplayers(5);
}

// Requests ending current tournament
function endtournament() {

    var params = "skey=" + gss("gambotkey");

    mkxhr("/et", params, tournamentend);
}

// Requests adding new player to database
function addplayer(elem) {

    var id = elem.elements["name"].value;
    var params = "name=" + id + "&skey=" + gss("gambotkey");

    gid("addplayer").reset();

    mkxhr("/ap", params, showplayers);
}

// Sends request to search database for players
function getplayers(elem) {

    var id = elem.elements["ID"].value;
    var name = elem.elements["name"].value;
    var params = "id=" + id + "&name=" + name;

    mkxhr("/gp", params, showplayers);
}

// Shows & hides appropriate divs for in-tournament-mode
function tournamentstarted() {

    gid("tstart").style.display = "none";
    gid("tend").style.display = "block";
}

// Shows & hides appropriate divs for no-tournament-mode
function tournamentended() {

    gid("tstart").style.display = "inline-block";
    gid("tend").style.display = "none";
}

// Updates top list
function updatetopplayers(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var pdiv = gid("topfivecontents");

    pdiv.innerHTML = "";

    if(obj.S == "a") {
        gid("games").style.width = "0";
        gid("topfive").style.width = "100%";
        gid("topfive").style.display = "block";
        gid("topfiveheader").innerHTML = "ALL TIME TOP 5";

    } else if (obj.S == "c" && obj.P.length > 0) {
        gid("games").style.width = "75%";
        gid("topfive").style.width = "25%";
        gid("topfive").style.display = "block";
        gid("topfiveheader").innerHTML = "TOP 5";

    } else {
        gid("topfive").style.display = "none";
    }

    for(const p of obj.P) {
        var item = document.createElement("div");
        var name = document.createElement("p");
        var text;

        if(obj.S == "a") text = p.Name + " " + p.TPoints;
        if(obj.S == "c") text = p.Name + " " + p.Points;

        item.className = "topplayer";

        name.appendChild(document.createTextNode(text));
        item.appendChild(name);
        pdiv.appendChild(item);
    }
}

// Process tournament status request and sets appropriate mode
function updatestatus(xhr) {

    var obj = JSON.parse(xhr.responseText);

    if(obj.ID === 0 || !timezero(obj.End)) {
        tournamentended();
        gettopplayers(5, "a");
        gid("games").innerHTML = "";

    } else {
        tournamentstarted();
        updatewindow(obj);
        gettopplayers(5, "c");
    }
}

// Requests tournament status
function gettournamentstatus() {

    var params = "skey=" + gss("gambotkey");
    mkxhr("/ts", params, updatestatus);
}

// Requests tournament history (n games starting at index i)
function getthist(elem) {

    var id = elem.elements["ID"].value;
    var n = elem.elements["n"].value;
    var params = "i=" + id + "&n=" + n + "&skey=" + gss("gambotkey");

    mkxhr("/th", params, updatethist);
}

// Verifies server response after adjustment of admin settings
function verchangeadmin(xhr) {

    var obj = JSON.parse(xhr.responseText);

    if(obj.Status == S_ERR) {
        logout();

    } else {
        log("Admin settings successfully updated")
    }
}

// Updates fields of current values for pwin, pdraw & ploss
function updatepcur(xhr) {

    var obj = JSON.parse(xhr.responseText);

    gid("pwinnum").value = obj.Pwin;
    gid("pdrawnum").value = obj.Pdraw;
    gid("plossnum").value = obj.Ploss;
}

// Gets current values for pwin, pdraw and ploss
function getpcur() {

    var params = "skey=" + gss("gambotkey");

    mkxhr("/admin", params, updatepcur);
}

// Submits change of admin settings
function changeadmin(elem) {

    var pwin = elem.elements["pwin"].value;
    var pdraw = elem.elements["pdraw"].value;
    var ploss = elem.elements["ploss"].value;
    var params = "pwin=" + pwin + "&pdraw=" + pdraw + "&ploss=" + ploss + "&skey=" + gss("gambotkey");

    gid("adminform").reset();
    showpopup("none");

    mkxhr("/admin", params, verchangeadmin);
}

// Requests top players (n players of type t: (a)ll or (c)urrent)
function gettopplayers(n, t) {

    mkxhr("/gtp", "n=" + n + "&t=" + t, updatetopplayers);
}

// Checks for session key
function trylogin(xhr) {

    var obj = JSON.parse(xhr.responseText);

    if(obj.Skey) {
        sessionStorage.gambotkey = obj.Skey;
        gid("login").style.display = "none";
    }
}

// Initiates login procedure
function loginuser(elem) {

    var pass = elem.elements["pass"].value;
    var params = "pass=" + pass;

    gid("loginform").reset();

    mkxhr("/login", params, trylogin);
}

// Changes admin password
function chpass(elem) {

    var opass = elem.elements["opass"].value;
    var npass = elem.elements["npass"].value;

    var params = "pass=" + npass + "&opass=" + opass;

    gid("apassform").reset();

    mkxhr("/reg", params, trylogin); // TODO: Update with proper logging / user feedback
    showpopup("none");
}

// Iterates through elem list and selected popups to show / hide
function setdisp(elem, popup) {

    for(var pg in elem) {
        elem[pg].style.display = popup.indexOf(pg) < 0 ? "none" : "block";
    }
}

// Shows & hides popup windows
function showpopup(popup) {

    var elems = { pmgmt: gid("playermgmt"),
                  tmgmt: gid("tmgmt"),
                  admin: gid("admin"),
                  apass: gid("apass"),
                  log: gid("logwin")
                }

    switch(popup) {
        case "none":
            setdisp(elems, []);
            break;

        case "pmgmt":
            setdisp(elems, ["pmgmt"]);
            gid("playerdata").innerHTML = "";
            gid("addplayer").reset();
            gid("getplayers").reset();
            break;

        case "tmgmt":
            setdisp(elems, ["tmgmt"]);
            gid("thist").innerHTML = "";
            gid("getthist").reset();
            break;

        case "admin":
            setdisp(elems, ["admin"]);
            gid("adminform").reset();
            getpcur();
            break;

        case "apass":
            setdisp(elems, ["apass"]);
            gid("apassform").reset();
            break;

        case "log":
            setdisp(elems, ["log"]);
            break;

        default:
            console.log("Trying to open nonexisting page: " + popup);
            break;
    }
}

// Resets skey and shows login screen
function logout() {

    gid("login").style.display = "block";
    sessionStorage.gambotkey = "";
    adminindb();
}

// Receives data on if admin exists in db and opens appropriate window
function veradminindb(xhr) {

    var res = JSON.parse(xhr.responseText);

    if(res == true) {
        gid("regbutton").style.display = "none";
        gid("loginbutton").style.display = "block";

    } else {
        gid("regbutton").style.display = "block";
        gid("loginbutton").style.display = "none";
    }
}

// Verifies skey match and shows appropriate window
function verskey(xhr) {

    var res = JSON.parse(xhr.responseText);
    var lgwin = gid("login");

    if(res == true) {
        lgwin.style.display = "none";
        gettournamentstatus();

    } else {
        lgwin.style.display = "block";
    }
}

// Validates local skey with backend
function chkskey() {

    var params = "skey=" + gss("gambotkey");

    mkxhr("/verskey", params, verskey);
}

// Checks if admin account exists in db
function adminindb() {

    mkxhr("/chkadm", "", veradminindb);
}

// Registers new admin user
function register() {

    var params = "pass=" + gid("loginpass").value;

    gid("loginform").reset();
    mkxhr("/reg", params, trylogin);
}

// Checks if admin is logged in
function checklogin() {

    var skey = gss("gambotkey");

    adminindb();
    chkskey();
}

// Request necessary data after window refresh
window.onbeforeunload = function() {
    checklogin();
};

// Request necessary data after load
window.onload = function() {
    checklogin();
}
