// Alias to reduce typing
var gid = document.getElementById.bind(document);
var gss = sessionStorage.getItem.bind(sessionStorage);

// Macro definitions for readability
const S_OK = 0;
const S_ERR = 1;

const WWIN = 0;
const WDRAW = 1;
const WLOSS = 2;
const BWIN = 3;
const BDRAW = 4;
const BLOSS = 5;

const WHITE = 0;
const BLACK = 1;
const TOTAL = 2;

const WIN = 0;
const DRAW = 1;
const LOSS = 2;

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

// Returns DOM object of requested type, and with class & text defined if requested
function mkobj(type, cl, txt) {

    var ret = document.createElement(type);

    if(cl !== undefined && cl != "") ret.classList.add(cl);

    if(txt !== undefined) {
        var tc = document.createTextNode(txt);
        ret.appendChild(tc);
    }

    return ret;
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
    var player = mkobj("div", "benchp", getplayername(id, t));

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

    var game = mkobj("div", "game");
    var bw = mkobj("div", "bw");
    var W = mkobj("div", "wp", getplayername(g.W, t));
    var B = mkobj("div", "bp", getplayername(g.B, t));
    var draw = mkobj("div", "draw");
    var dtext = mkobj("span", "", "draw");

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
        var tp = mkobj("p", "ttp", p);
        td.appendChild(tp);
    }
}

// Creates list item for tournament history
function createtlistitem(t) {

    var pdiv = gid("thist");
    var td = mkobj("div", "tlitm");
    var id = mkobj("p", "tid", t.ID);
    var stext = formatdate(t.Start) + " - " + formatdate(t.End);
    var stime = mkobj("p", "ttime", stext);

    td.appendChild(id);
    td.appendChild(stime);

    if(!(t.P == null)) {
        createtlistplayer(t, td);

    } else {
        var tp = mkobj("p", "ttp", "No players in tournament");
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

// Calculates points per game value
function calcppg(points, games) {

    var ret = points / games;

    if(ret !== ret) ret = 0;

    return ret.toFixed(2);
}

// Fills the horizontal bar for win / draw / loss
function fillbar(col, win, draw, loss) {

    var sum = win + draw + loss;
    var wbar, dbar, lbar;
    var wwidth, dwidth, lwidth;

    if(col == TOTAL) {
        wbar = gid("indtwin");
        dbar = gid("indtdraw");
        lbar = gid("indtloss");

    } else if(col == WHITE) {
        wbar = gid("indwwin");
        dbar = gid("indwdraw");
        lbar = gid("indwloss");

    } else if(col == BLACK) {
        wbar = gid("indbwin");
        dbar = gid("indbdraw");
        lbar = gid("indbloss");
    }

    if(sum == 0) {
        wwidth = dwidth = lwidth = 0;

    } else {
        wwidth = Math.floor(win / sum * 100);
        dwidth = Math.floor(draw / sum * 100);
        lwidth = Math.floor(loss / sum * 100);
    }

    wbar.style.width = wwidth + "%";
    dbar.style.width = dwidth + "%";
    lbar.style.width = lwidth + "%";
}

// Shows data on individual player
function showplayerdata(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var pname = gid("indplayername");
    var indgames = gid("indgamesval");
    var indpoints = gid("indpointsval");
    var indppg = gid("indppgval");
    var editbtn = gid("editplayer");

    pname.innerHTML = obj[0].Name;
    pname.setAttribute("name", obj[0].ID);

    indgames.innerHTML = obj[0].TNgames;
    indpoints.innerHTML = obj[0].TPoints;
    indppg.innerHTML = calcppg(obj[0].TPoints, obj[0].TNgames)

    if(obj[0].Active == true) {
        editbtn.innerHTML = "Deactivate";
        editbtn.setAttribute("name", "deac");

    } else {
        editbtn.innerHTML = "Activate";
        editbtn.setAttribute("name", "activate");
    }

    fillbar(TOTAL, obj[0].Stat[WWIN] + obj[0].Stat[BWIN],
                   obj[0].Stat[WDRAW] + obj[0].Stat[BDRAW],
                   obj[0].Stat[WLOSS] + obj[0].Stat[BLOSS]);
    fillbar(WHITE, obj[0].Stat[WWIN], obj[0].Stat[WDRAW], obj[0].Stat[WLOSS]);
    fillbar(BLACK, obj[0].Stat[BWIN], obj[0].Stat[BDRAW], obj[0].Stat[BLOSS]);
    showpopup("indplayer");
}

// Requests player data
function getplayerdata(p) {

    var params = "id=" + p.getAttribute("name");

    mkxhr("/gp", params, showplayerdata);
}

// Adds player to list
function showplayer(p, pdiv, intourn) {

    var pl = mkobj("div", "pln");
    var name = mkobj("p", "pntxt", p.Name);

    pl.appendChild(name);

    if(p.Active == false && gss("gambotshowdeac") == "true") {
        pl.style.backgroundColor = "#772222";

    } else if(p.Active == true && intourn == 1) {
        var cb = mkobj("input", "", "");

        cb.type = "checkbox";
        cb.name = "selected";
        cb.value = p.ID;
        pl.appendChild(cb);

    } else if(p.Active == false) {
        return;
    }

    name.addEventListener("click", () => {
        getplayerdata(pl);
    });

    pl.setAttribute("name", p.ID);
    pdiv.appendChild(pl);
}

// Displays list of players
function showplayers(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var pdiv = gid("playerdata");
    var intourn = gss("gambotintournament");
    var br = mkobj("br", "", "");

    pdiv.innerHTML = "";
    pdiv.style.display = "block";
    pdiv.appendChild(br);

    for(const p of obj) showplayer(p, pdiv, intourn);

    if(intourn == 1) {
        var btn = mkobj("button", "", "Add selected players to tournament");

        btn.addEventListener("click", () => {
            playertotournament(pdiv);
        });

        pdiv.appendChild(btn);
    }
}

// Returns true if time object is zero / null
function timezero(ttime) {

    if(ttime.startsWith("0001")) return true;
    else return false;
}

// Creates an entry in the local log
function log(data) {

    var pdiv = gid("logwin");
    var item = mkobj("div", "log");
    var msg = mkobj("p", "", data);

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
    var cb = gid("showdeac").checked;
    var params = "id=" + id + "&name=" + name;

    sessionStorage.gambotshowdeac = cb;

    mkxhr("/gp", params, showplayers);
}

// Shows & hides appropriate divs for in-tournament-mode
function tournamentstarted() {

    gid("tstart").style.display = "none";
    gid("tend").style.display = "block";
    sessionStorage.gambotintournament = 1;
}

// Shows & hides appropriate divs for no-tournament-mode
function tournamentended() {

    gid("tstart").style.display = "inline-block";
    gid("tend").style.display = "none";
    sessionStorage.gambotintournament = 0;
}

// Adds top player to list
function addtopplayer(p, s, pdiv) {
    var text;

    if(s == "a") text = p.Name + " " + p.TPoints;
    else if(s == "c") text = p.Name + " " + p.Points;

    var item = mkobj("div", "topplayer");
    var name = mkobj("p", "tpname", text);

    name.addEventListener("click", () => {
        getplayerdata(item);
    });

    item.setAttribute("name", p.ID);

    item.appendChild(name);
    pdiv.appendChild(item);
}

// Adds 'more' button to top player list
function addtopmorebtn(len, s, pdiv) {

    var morebtn = mkobj("p", "morebtn", "more");

    morebtn.addEventListener("click", () => {
        gettopplayers(len + 5, s);
    });

    pdiv.appendChild(morebtn);
}

// Adds 'less' button to top player list
function addtoplessbtn(len, s, pdiv) {

    var lessbtn = mkobj("p", "lessbtn", "less");
    var nop = len - 5;

    if(nop < 5) nop = 5;

    lessbtn.addEventListener("click", () => {
        gettopplayers(nop, s);
    });

    pdiv.appendChild(lessbtn);
}

// Updates top list
function updatetopplayers(xhr) {

    var obj = JSON.parse(xhr.responseText);
    var pdiv = gid("topfivecontents");
    var oplen = obj.P.length;

    pdiv.innerHTML = "";

    if(obj.S == "a") {
        gid("games").style.width = "0";
        gid("topfive").style.width = "100%";
        gid("topfive").style.display = "block";
        gid("topfiveheader").innerHTML = "ALL TIME TOP " + oplen;

    } else if (obj.S == "c" && obj.P.length > 0) {
        gid("games").style.width = "75%";
        gid("topfive").style.width = "25%";
        gid("topfive").style.display = "block";
        gid("topfiveheader").innerHTML = "TOP " + oplen;

    } else {
        gid("topfive").style.display = "none";
    }

    for(const p of obj.P) addtopplayer(p, obj.S, pdiv);

    addtopmorebtn(oplen, obj.S, pdiv);

    if(oplen > 5) addtoplessbtn(oplen, obj.S, pdiv);

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
                  indplayer: gid("indplayer"),
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

        case "indplayer":
            setdisp(elems, ["indplayer"]);
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

// Verifies player edit response
function verplayeredit(xhr) {

    var obj = JSON.parse(xhr.responseText);

    if(obj.ID != undefined) {
        log("Successfully updated player data");
    } else {
        log("Error updating player data");
    }
}

// Requests edit of player properties
function editplayer() {

    var pid = gid("indplayername").getAttribute("name");
    var action = gid("editplayer").getAttribute("name");
    var params = "id=" + pid + "&action=" + action + "&skey=" + gss("gambotkey");

    mkxhr("/ep", params, verplayeredit);

    showpopup("pmgmt");
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
