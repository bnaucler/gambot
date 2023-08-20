// Alias to reduce typing
var gid = document.getElementById.bind(document);
var gss = sessionStorage.getItem.bind(sessionStorage);

const S_OK = 0;
const S_ERR = 1;
const SHOW = 0;
const HIDE = 1;

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

    var plen = t.P.length;

    for(var i = 0; i < plen; i++) {
        if(t.P[i].ID === id) return t.P[i].Name;
    }

    return null;
}

// Requests processing of won game
function declareresult(gid, pid, wname) {

    if(pid === 0) log("Game " + gid + " is a draw.")
    else log("Game " + gid + " won by " + wname)

    mkxhr("/dr", "id=" + pid + "&game=" + gid, playersadded); // TOOD temp
}

// Returns name of player from tournament struct, by ID
function getplayername(id, t) {

    var plen = t.P.length;

    for(var i = 0; i < plen; i++) {
        if(t.P[i].ID === id) return t.P[i].Name;
    }

    return null
}

// Returns true if player with name ID is currently in a game
function ingame(id, t) {

    var glen = t.G.length;

    for(var i = 0; i < glen; i++) {
        if((t.G[i].W === id || t.G[i].B === id) && timezero(t.G[i].End)) return true;
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

    var plen = t.P.length;
    var bp = [];

    for(var i = 0; i < plen; i++) {
        if(!ingame(t.P[i].ID, t)) bp.push(t.P[i].ID)
    }

    var blen = bp.length;
    if(blen === 0) gid("bench").style.display = "none";
    else gid("bench").style.display = "block";

    for(var i = 0; i < blen; i++) addbench(bp[i], t)
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

    var glen = t.G.length;

    for(var i = 0; i < glen; i++) {
        if(timezero(t.G[i].End)) addgame(t.G[i], t);
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
    var tplen = tpl.length;

    for(var i = 0; i < tplen; i++) {
        var tp = document.createElement("p");
        tp.className = "ttp";
        tp.appendChild(document.createTextNode(tpl[i]));
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
    var tlen = ts.length;
    gid("thist").innerHTML = "";

    if(tlen == 0) {
        log("No data received!");
        return;
    }

    for(var i = 0; i < tlen; i++) createtlistitem(ts[i]);
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
    var params = "?id=" + JSON.stringify(ids);

    mkxhr("/apt", params, playersadded);

    gid("playerdata").style.display = "none";
}

// Displays list of players
function showplayers(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var olen = obj.length;
    var pdiv = gid("playerdata");

    pdiv.innerHTML = "";
    pdiv.style.display = "block";

    for(var i = 0; i < olen; i++) {
        var post = document.createElement("div");
        var name = document.createElement("h4");

        post.className = "post";
        name.appendChild(document.createTextNode(obj[i].Name));
        post.appendChild(name);

        if(obj[i].Active === false) {
            post.style.backgroundColor = "#772222";

        } else {
            var cb = document.createElement("input");

            cb.type = "checkbox";
            cb.name = "selected";
            cb.value = obj[i].ID;
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

    mkxhr("/et", "", tournamentend);
}

// Requests adding new player to database
function addplayer(elem) {

    var id = elem.elements["name"].value;
    var params = "name=" + id;

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
    gid("startgap").style.display = "none";

    gid("tend").style.display = "inline-block";
    gid("endgap").style.display = "block";

}

// Shows & hides appropriate divs for no-tournament-mode
function tournamentended() {

    gid("tstart").style.display = "inline-block";
    gid("startgap").style.display = "block";

    gid("tend").style.display = "none";
    gid("endgap").style.display = "none";
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

    var olen = obj.P.length;

    for(var i = 0; i < olen; i++) {

        var item = document.createElement("div");
        var name = document.createElement("p");
        var text;

        if(obj.S == "a") text = obj.P[i].Name + " " + obj.P[i].TPoints;
        if(obj.S == "c") text = obj.P[i].Name + " " + obj.P[i].Points;

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

    } else {
        tournamentstarted();
        updatewindow(obj);
        gettopplayers(5, "c");
    }
}

// Requests tournament status
function gettournamentstatus() {

    mkxhr("/ts", "", updatestatus);
}

// Requests tournament history (n games starting at index i)
function getthist(elem) {

    var id = elem.elements["ID"].value;
    var n = elem.elements["n"].value;
    var params = "i=" + id + "&n=" + n;

    mkxhr("/th", params, updatethist);
}

// Requests top players (n players of type t: (a)ll or (c)urrent)
function gettopplayers(n, t) {

    mkxhr("/gtp", "n=" + n + "&t=" + t, updatetopplayers);
}

// Shows / hides log window
function logwin(state) {

    var logwin = gid("logwin");

    if(state === SHOW) {
        logwin.style.display = "block";
    } else if (state === HIDE) {
        logwin.style.display = "none";
    }
}

// Shows / hides player management window
function playermgmt(state) {

    var pwin = gid("playermgmt");

    if(state === SHOW) {
        pwin.style.display = "block";
        gid("playerdata").style.display = "none";
        gid("pidtxt").value = "";
        gid("pntxt").value = "";
        gid("pnatxt").value = "";

    } else if (state == HIDE) {
        pwin.style.display = "none";
    }
}

// Shows / hides tournament management window
function tmgmt(state) {

    var twin = gid("tmgmt");

    if(state === SHOW) {
        twin.style.display = "block";
        gid("thist").innerHTML = "";
        gid("tidtxt").value = "";
        gid("tntxt").value = "";

    } else if (state == HIDE) {
        twin.style.display = "none";
    }
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
function login(elem) {

    var pass = elem.elements["pass"].value;
    var params = "pass=" + pass;

    gid("loginform").reset();

    mkxhr("/login", params, trylogin);
}

// Resets skey and shows login screen
function logout() {

    gid("login").style.display = "block";
    sessionStorage.gabmotkey = "";
}

// Request necessary data after window refresh
window.onbeforeunload = function() {
    gettournamentstatus();
};

// Request necessary data after load
window.onload = function() {
    gettournamentstatus();
}
