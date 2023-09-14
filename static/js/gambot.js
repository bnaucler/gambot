// Alias to reduce typing
let gid = document.getElementById.bind(document);
let gss = sessionStorage.getItem.bind(sessionStorage);

let mac;

// HTTP request wrapper
async function gofetch(ep, params, rfunc) {

    let url = ep + "?" + params;
    let resp = await fetch(url);

    if(resp.ok) rfunc(await resp.json());
}

// Returns DOM object of requested type, and with class & text defined if requested
function mkobj(type, cl, txt) {

    let ret = document.createElement(type);

    if(cl !== undefined && cl != "") ret.classList.add(cl);

    if(txt !== undefined) {
        let tc = document.createTextNode(txt);
        ret.appendChild(tc);
    }

    return ret;
}

// Returns player name from ID in tournament struct
function getplayername(id, t) {

    for(const p of t.P) {
        if(p.ID === id) return p.Pi.Name;
    }

    return null;
}

// Requests processing of won game
function declareresult(gid, pid, wname) {

    if(pid === 0) statuspopup("Game " + gid + " is a draw.");
    else statuspopup("Game " + gid + " won by " + wname);

    let params = "id=" + pid + "&game=" + gid + "&skey=" + gss("gambotkey");

    gofetch("/dr", params, playersadded); // TOOD temp
}

// Returns true if player with name ID is currently in a game
function ingame(id, t) {

    if(t.G != null) {
        for(const g of t.G) {
            if((g.W === id || g.B === id) && timezero(g.End)) return true;
        }
    }

    return false;
}

// Creates a minipop element
function mkminipop() {

    let elem = mkobj("div", "minipop");

    elem.style.left = (event.clientX - 5) + "px";
    elem.style.top = (event.clientY - 5) + "px";

    elem.addEventListener("mouseleave", function(event) {
        elem.remove();
    });

    return elem;
}

// Requests a game when seeding algo is not automatically creating one
function forcegame(id) {

    let params = "id=" + id + "&skey=" + gss("gambotkey");

    gofetch("/mkgame", params, playersadded); // TODO
}

// Verifies receipt of player object and calls for refresh
function verpauseplayer(p) {

    if(p.ID != 0) gettournamentstatus();
}

// Puts a player on pause to exclude from game seeding
function togglepause(id) {

    let params = "id=" + id + "&action=pause&skey=" + gss("gambotkey");

    gofetch("/ep", params, verpauseplayer);
}

// Creates a popup menu for bench players
function benchpopup(id, t, pstat) {

    let bpop = mkminipop();
    let pdiv = gid("tnmt");
    let ptext = pstat ? "Unpause" : "Pause";

    let rembtn = mkobj("div", "minipopitem", "Remove");
    let forcebtn = mkobj("div", "minipopitem", "Force");
    let pausebtn = mkobj("div", "minipopitem", ptext);

    mkminipop(bpop);

    rembtn.addEventListener("click", () => {
        edittournament("rem", id);
        bpop.remove();
    });

    forcebtn.addEventListener("click", () => {
        forcegame(id);
        bpop.remove();
    });

    pausebtn.addEventListener("click", () => {
        togglepause(id);
        bpop.remove();
    });

    bpop.appendChild(rembtn);
    bpop.appendChild(forcebtn);
    bpop.appendChild(pausebtn);
    pdiv.appendChild(bpop);
}

// Creates popup menu for in-game players
function igppopup(id, gameid, t) {

    let bpop = mkminipop();
    let dwbtn = mkobj("div", "minipopitem", "Declare win");
    let rembtn = mkobj("div", "minipopitem", "Remove");
    let pausebtn = mkobj("div", "minipopitem", "Pause");
    let pdiv = gid("tnmt");

    dwbtn.addEventListener("click", () => {
        let pname = getplayername(id, t);
        declareresult(gameid, id, pname);
        bpop.remove();
    });

    pausebtn.addEventListener("click", () => {
        togglepause(id);
        bpop.remove();
    });

    rembtn.addEventListener("click", () => {
        edittournament("rem", id);
        bpop.remove();
    });

    bpop.appendChild(dwbtn);
    bpop.appendChild(pausebtn);
    bpop.appendChild(rembtn);
    pdiv.appendChild(bpop);
}

// Returns player pause stat by id
function getpstat(id, t) {

    for(const p of t.P) {
        if(p.ID === id) return p.Pause;
    }

    return null;
}

// Adds player to bench by id
function addbench(id, t) {

    let pdiv = gid("bench");
    let player = mkobj("div", "benchp", getplayername(id, t));
    let pstat = getpstat(id, t);

    if(pstat) {
        let picon = mkobj("div", "picon");
        player.appendChild(picon);
    }

    player.addEventListener("click", () => {
        benchpopup(id, t, pstat);
    });

    pdiv.appendChild(player);
}

// Populates the bench (waiting players)
function popbench(t) {

    let bp = [];

    for(const p of t.P) {
        if(!ingame(p.ID, t)) bp.push(p.ID);
    }

    if(bp.length === 0) gid("bench").style.display = "none";
    else gid("bench").style.display = "block";

    for(const p of bp) addbench(p, t)
}

// Adds a game to the display window
function addgame(g, t) {

    let pdiv = gid("games");

    let game = mkobj("div", "game");
    let bw = mkobj("div", "bw");
    let W = mkobj("div", "wp", getplayername(g.W, t));
    let B = mkobj("div", "bp", getplayername(g.B, t));
    let draw = mkobj("div", "draw");
    let dtext = mkobj("span", "", "draw");

    W.addEventListener("click", () => {
        igppopup(g.W, g.ID, t);
    });

    B.addEventListener("click", () => {
        igppopup(g.B, g.ID, t);
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

    let bench = document.createElement("div");

    bench.id = "bench";

    pdiv.appendChild(bench);
}

// Updates game window with tournament data
function updatewindow(t) {

    let pdiv = gid("games");

    pdiv.innerHTML = "";

    if(t.P == null) return;
    if(t.ID != 0) gettopplayers(5, "c");
    else gettopplayers(5, "a");

    if(t.G != null) {
        for(const g of t.G) {
            if(timezero(g.End)) addgame(g, t);
        }
    }

    makebench(pdiv);
    popbench(t);
}

// Formats server date codes to a more easily readable format
function formatdate(d) {

    let date = d.substring(0, 10);
    let time = d.substring(11, 16);

    return date + " " + time;
}

// Returns names & score for n# of top players in tournament t
function ttop(n, t) {

    let tc = structuredClone(t.P)
    let ret = [];
    let plen = tc.length;

    tc.sort((i, j) => i.TN.Points - j.TN.Points);
    tc.reverse();

    if(n > plen) n = plen;

    for(let i = 0; i < n; i++) ret.push(tc[i].Pi.Name + " " + tc[i].TN.Points);

    return ret;
}

// Adds individual player & score to tournament history list
function createtlistplayer(t, td) {

    let tpl = ttop(3, t);

    for(const p of tpl) {
        let tp = mkobj("p", "ttp", p);
        td.appendChild(tp);
    }
}

// Creates list item for tournament history
function createtlistitem(t) {

    let pdiv = gid("thist");
    let td = mkobj("div", "tlitm");
    let id = mkobj("p", "tid", t.ID);
    let stext = formatdate(t.Start) + " - " + formatdate(t.End);
    let stime = mkobj("p", "ttime", stext);

    td.appendChild(id);
    td.appendChild(stime);

    if(!(t.P == null)) {
        createtlistplayer(t, td);

    } else {
        let tp = mkobj("p", "ttp", "No players in tournament");
        td.appendChild(tp);
    }

    pdiv.appendChild(td);
}

// Displays tournament history
function updatethist(ts) {

    gid("thist").innerHTML = "";

    if(ts.length === 0) {
        statuspopup("No data received!");
        return;
    }

    for(const t of ts) {
        if(!timezero(t.End)) createtlistitem(t);
    }
}

// Call updatewindow() if request contains players
function playersadded(t) {

    if(t.P != undefined) updatewindow(t);
}

// Request adding selected players to current tournament
function playertotournament(elem) {

    let selectedplayers = document.querySelectorAll('input[name="selected"]:checked');
    let ids = [];

    selectedplayers.forEach((checkbox) => {
        ids.push(checkbox.value);
    });

    let olen = ids.length;
    let params = "?id=" + JSON.stringify(ids) + "&skey=" + gss("gambotkey");

    gofetch("/apt", params, playersadded);

    gid("playerdata").style.display = "none"; // TODO
}

// Fills the horizontal bar for win / draw / loss
function fillbar(col, win, draw, loss) {

    let sum = win + draw + loss;
    let wbar, dbar, lbar;
    let wwidth, dwidth, lwidth;

    if(col == mac.TOTAL) {
        wbar = gid("indtwin");
        dbar = gid("indtdraw");
        lbar = gid("indtloss");

    } else if(col == mac.WHITE) {
        wbar = gid("indwwin");
        dbar = gid("indwdraw");
        lbar = gid("indwloss");

    } else if(col == mac.BLACK) {
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

// Sets form submit button to add or edit player
function setapbutton(func) {

    let btn = gid("apsubmit");
    let form = gid("addplayerform");

    if(func == "edit") {
        btn.value = "Edit player";

    } else {
        btn.value = "Add new player";
    }
}

// Populates the player edit window
function popplayereditwin(obj) {

    showpopup("addplayer"); // Needs to run before setting pd

    let form = gid("addplayerform");
    let pd = obj[0].Pi;

    form.id.value = obj[0].ID;
    form.fname.value = pd.FName;
    form.lname.value = pd.LName;
    form.dbirth.value = timezero(pd.Dbirth) ? "" : pd.Dbirth.slice(0, 10);
    form.gender.value = pd.Gender;
    form.email.value = pd.Email;
    form.postal.value = pd.PostalAddr;
    form.zip.value = pd.Zip;
    form.phone.value = pd.Phone;
    form.club.value = pd.Club;

    setapbutton("edit");
}

// Requests to open and populate the edit player data form
function openplayeredit(id) {

    let params = "id=" + id + "&skey=" + gss("gambotkey");

    gofetch("/gp", params, popplayereditwin);
}

// Shows data on individual player
function showplayerdata(obj) {

    let pname = gid("indplayername");
    let indgames = gid("indgamesval");
    let indpoints = gid("indpointsval");
    let indppg = gid("indppgval");
    let indppgw = gid("indppgwval");
    let indppgb = gid("indppgbval");
    let editbtn = gid("editplayer");
    let editdatabtn = gid("indplayeredit");
    let intourn = gss("gambotintournament");
    let statobj = intourn == 1 ? obj[0].TN : obj[0].AT;

    pname.innerHTML = obj[0].Pi.Name;
    pname.setAttribute("name", obj[0].ID);

    indgames.innerHTML = statobj.Ngames;
    indpoints.innerHTML = statobj.Points;
    indppg.innerHTML = statobj.APPG.toFixed(2);
    indppgw.innerHTML = statobj.WAPPG.toFixed(2);
    indppgb.innerHTML = statobj.BAPPG.toFixed(2);

    if(obj[0].Active == true) {
        editbtn.innerHTML = "Deactivate";
        editbtn.setAttribute("name", "deac");

    } else {
        editbtn.innerHTML = "Activate";
        editbtn.setAttribute("name", "activate");
    }

    editdatabtn.addEventListener("click", () => {
        openplayeredit(obj[0].ID);
    });

    fillbar(mac.TOTAL, statobj.Stat[mac.WWIN] + statobj.Stat[mac.BWIN],
                   statobj.Stat[mac.WDRAW] + statobj.Stat[mac.BDRAW],
                   statobj.Stat[mac.WLOSS] + statobj.Stat[mac.BLOSS]);
    fillbar(mac.WHITE, statobj.Stat[mac.WWIN], statobj.Stat[mac.WDRAW], statobj.Stat[mac.WLOSS]);
    fillbar(mac.BLACK, statobj.Stat[mac.BWIN], statobj.Stat[mac.BDRAW], statobj.Stat[mac.BLOSS]);
    showpopup("indplayer");
}

// Requests player data
function getplayerdata(p) {

    let params = "id=" + p.getAttribute("name") + "&skey=" + gss("gambotkey");

    gofetch("/gp", params, showplayerdata);
}

// Adds player to list
function showplayer(p, pdiv, intourn) {

    let pl = mkobj("div", "pln");
    let name = mkobj("p", "pntxt", p.Pi.Name);

    pl.appendChild(name);

    if(p.Active == false && gss("gambotshowdeac") == "true") {
        pl.style.backgroundColor = "#772222";

    } else if(p.Active == true && intourn == 1) {
        let cb = mkobj("input", "", "");

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
function showplayers(obj) {

    let pdiv = gid("playerdata");
    let intourn = gss("gambotintournament");
    let br = mkobj("br", "", "");

    pdiv.innerHTML = "";
    pdiv.style.display = "block";
    pdiv.appendChild(br);

    for(const p of obj) {
        if(p.Status == mac.S_OK) showplayer(p, pdiv, intourn);
        else console.log("Error displaying player"); // TMP
    }

    if(intourn == 1) {
        let btn = mkobj("button", "", "Add selected players to tournament");

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

    let pdiv = gid("logdata");
    let item = mkobj("div", "log", data);

    pdiv.appendChild(item);
}

// Processes tournament start request and creates appropriate log entries
function tournamentstart(obj) {

    let date = obj.Start.slice(0, 10);
    let time = obj.Start.slice(11, 16);

    if(obj.Status === mac.S_ERR) statuspopup("Could not start new tournament");
    else {
        statuspopup("Tournament " + obj.ID + " started at " + date + " "+ time);

        if(obj.P === undefined) gid("games").innerHTML = "";
        else updatewindow(obj);
    }

    tournamentstarted();
}

// Processes tournament end request and creates appropriate log entries
function tournamentend(obj) {

    let date = obj.End.slice(0, 10);
    let time = obj.End.slice(11, 16);

    if(obj.Status === mac.S_ERR) statuspopup("No tournament running - cannot end!");
    else statuspopup("Tournament " + obj.ID + " ended at " + date + " "+ time);

    tournamentended();
    updatestatus(obj);
}

// Makes call to start tournament with selected algo
function launchtournament(algo) {

    let params = "algo=" + algo + "&skey=" + gss("gambotkey");

    gofetch("/ct", params, tournamentstart);
    gettopplayers(5);
}

// Requests start of new tournament
function newtournament() {

    let bpop = mkminipop();
    let pdiv = gid("tnmt");

    let rndbtn = mkobj("div", "minipopitem", "Random");
    let winwinbtn = mkobj("div", "minipopitem", "Winner meets winner");
    let monradbtn = mkobj("div", "minipopitem", "Monrad");

    mkminipop(bpop);

    rndbtn.addEventListener("click", () => {
        launchtournament(mac.RANDOM);
        bpop.remove();
    });

    winwinbtn.addEventListener("click", () => {
        launchtournament(mac.WINWIN);
        bpop.remove();
    });

    monradbtn.addEventListener("click", () => {
        launchtournament(mac.MONRAD);
        bpop.remove();
    });

    bpop.appendChild(rndbtn);
    bpop.appendChild(winwinbtn);
    bpop.appendChild(monradbtn);
    pdiv.appendChild(bpop);
}

// Requests ending current tournament
function edittournament(action, id) {

    let params = "action=" + action + "&id=" + id + "&skey=" + gss("gambotkey");

    gofetch("/et", params, tournamentend); // TODO
}

// Shows a temporary status message on the screen
function statuspopup(msg) {

    let mdiv = mkobj("div", "statuspop", msg);
    let pdiv = gid("tnmt");

    setTimeout(() => { mdiv.remove(); }, 4000);
    setTimeout(() => { mdiv.classList.add("fade-out"); }, 3000);

    pdiv.appendChild(mdiv);
}

// Processes confirmation of added player
function veraddplayer(p) {

    let msg;

    if(p[0].Status == mac.S_OK) msg = p[0].Pi.Name + " added/edited successfully";
    else msg = "Could not add player";

    statuspopup(msg);
    gettournamentstatus();
}

// Requests adding new player to database
function addplayer(elem) {

    let id = elem.elements["id"].value;
    let fname = elem.elements["fname"].value;
    let lname = elem.elements["lname"].value;
    let dbirth = elem.elements["dbirth"].value;
    let gender = elem.elements["gender"].value;
    let email = elem.elements["email"].value;
    let postal = elem.elements["postal"].value;
    let zip = elem.elements["zip"].value;
    let phone = elem.elements["phone"].value;
    let club = elem.elements["club"].value;

    let params = "id=" + id +
                 "&fname=" + fname +
                 "&lname=" + lname +
                 "&dbirth=" + dbirth +
                 "&gender=" + gender +
                 "&email=" + email +
                 "&postal=" + postal +
                 "&zip=" + zip +
                 "&phone=" + phone +
                 "&club=" + club +
                 "&skey=" + gss("gambotkey");

    gid("addplayerform").reset();
    showpopup("pmgmt");

    gofetch("/ap", params, veraddplayer);
}

// Sends request to search database for players
function getplayers(elem) {

    let id = elem.elements["ID"].value;
    let name = elem.elements["name"].value;
    let cb = gid("showdeac").checked;
    let params = "id=" + id + "&name=" + name + "&skey=" + gss("gambotkey");

    sessionStorage.gambotshowdeac = cb;

    gofetch("/gp", params, showplayers);
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
    let text;

    if(s == "a") text = p.Pi.Name + " " + p.AT.Points;
    else if(s == "c") text = p.Pi.Name + " " + p.TN.Points;

    let item = mkobj("div", "topplayer");
    let name = mkobj("p", "tpname", text);

    name.addEventListener("click", () => {
        getplayerdata(item);
    });

    item.setAttribute("name", p.ID);

    item.appendChild(name);
    pdiv.appendChild(item);
}

// Retrieves number of top players to show from session storage
function gettpcount() {

    return Number(gss("gambottopplayers"));
}

// Stores number of top players to show in session storage
function addtpcount(n) {

    let cur = gettpcount();

    cur += n;

    if(Number.isInteger(cur)) sessionStorage.gambottopplayers = cur;
}

// Adds 'more' button to top player list
function addtopmorebtn(s, pdiv) {

    let morebtn = mkobj("p", "morebtn", "more");

    morebtn.addEventListener("click", () => {
        addtpcount(5);
        gettopplayers(gettpcount(), s);
    });

    pdiv.appendChild(morebtn);
}

// Adds 'less' button to top player list
function addtoplessbtn(s, pdiv) {

    let lessbtn = mkobj("p", "lessbtn", "less");
    let nop = gettpcount() - 5;

    if(nop < 5 || nop === undefined || nop == NaN) nop = 5;

    lessbtn.addEventListener("click", () => {
        gettopplayers(nop, s);
        sessionStorage.gambottopplayers = nop;
    });

    pdiv.appendChild(lessbtn);
}

// Updates top list
function updatetopplayers(obj) {

    let pdiv = gid("topfivecontents");
    let oplen = obj.P.length;

    pdiv.innerHTML = "";

    if(obj.S == "a" || oplen == 0) {
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

    if(!obj.Ismax) addtopmorebtn(obj.S, pdiv);

    if(oplen > 5) addtoplessbtn(obj.S, pdiv);
}

// Process tournament status request and sets appropriate mode
function updatestatus(obj) {

    if(obj.ID === 0 || !timezero(obj.End)) {
        tournamentended();
        gettopplayers(gettpcount(), "a");
        gid("games").innerHTML = "";

    } else {
        tournamentstarted();
        updatewindow(obj);
        gettopplayers(gettpcount(), "c");
    }
}

// Requests tournament status
function gettournamentstatus() {

    let params = "skey=" + gss("gambotkey");
    gofetch("/ts", params, updatestatus);
}

// Requests tournament history (n games starting at index i)
function getthist(elem) {

    let id = elem.elements["ID"].value;
    let n = elem.elements["n"].value;
    let params = "i=" + id + "&n=" + n + "&skey=" + gss("gambotkey");

    gofetch("/th", params, updatethist);
}

// Verifies server response after adjustment of admin settings
function verchangeadmin(obj) {

    if(obj.Status == mac.S_ERR) {
        logout();

    } else {
        statuspopup("Admin settings successfully updated")
    }
}

// Updates fields of current values for pwin, pdraw & ploss
function updatepcur(obj) {

    gid("pwinnum").value = obj.Pwin;
    gid("pdrawnum").value = obj.Pdraw;
    gid("plossnum").value = obj.Ploss;
}

// Gets current values for pwin, pdraw and ploss
function getpcur() {

    let params = "skey=" + gss("gambotkey");

    gofetch("/admin", params, updatepcur);
}

// Submits change of admin settings
function changeadmin(elem) {

    let pwin = elem.elements["pwin"].value;
    let pdraw = elem.elements["pdraw"].value;
    let ploss = elem.elements["ploss"].value;
    let params = "pwin=" + pwin + "&pdraw=" + pdraw + "&ploss=" + ploss + "&skey=" + gss("gambotkey");

    gid("adminform").reset();
    showpopup("none");

    gofetch("/admin", params, verchangeadmin);
}

// Requests top players (n players of type t: (a)ll or (c)urrent)
function gettopplayers(n, t) {

    let params = "n=" + n + "&t=" + t + "&skey=" + gss("gambotkey");

    gofetch("/gtp", params, updatetopplayers);
}

// Checks for session key
function trylogin(obj) {

    if(obj.Skey) {
        gettournamentstatus();
        sessionStorage.gambotkey = obj.Skey;
        gid("login").style.display = "none";
    }
}

// Initiates login procedure
function loginuser(form) {

    let pass = gid("loginpass").value;
    let ep = gid("logintype").value;

    form.preventDefault();
    gid("loginform").reset();
    gofetch(ep, "pass=" + pass, trylogin);
}

// Changes admin password
function chpass(elem) {

    let opass = elem.elements["opass"].value;
    let npass = elem.elements["npass"].value;

    let params = "pass=" + npass + "&opass=" + opass;

    gid("apassform").reset();

    gofetch("/reg", params, trylogin); // TODO: Update with proper logging / user feedback
    showpopup("none");
}

// Iterates through elem list and selected popups to show / hide
function setdisp(elem, popup) {

    for(let pg in elem) {
        elem[pg].style.display = popup.indexOf(pg) < 0 ? "none" : "block";
    }
}

// Requests change of the public page setting
async function toggleppage() {

    let cstat = Number(gss("gambotppstat"));
    let ppreq = await fetch("/ppstat?set=" + !cstat + "&skey=" + gss("gambotkey"));

    if(ppreq.ok) setppbutton();
}

// Sets correct text and action for ppage button
async function setppbutton() {

    let ppst = await fetch("/ppstat?ppage=getstat");
    let btn = gid("toggleppage");
    let resp;

    if(ppst.ok) resp = await ppst.json();

    btn.innerHTML = "Pulic page: " + (resp == mac.FALSE ? "disabled" : "enabled");
    sessionStorage.gambotppstat = resp;
}

// Shows & hides popup windows
function showpopup(popup) {

    let elems = { pmgmt: gid("playermgmt"),
                  addplayer: gid("addplayer"),
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
            gid("addplayerform").reset();
            gid("getplayers").reset();
            break;

        case "addplayer":
            gid("addplayerform").reset();
            setdisp(elems, ["addplayer"]);
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
            setppbutton();
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

// Receives data on if admin exists in db and changes button endpoint accordingly
function veradminindb(res) {

    let btn = gid("loginbutton");
    let type = gid("logintype");
    let form = gid("loginform");
    let btxt;

    if(res == true) {
        btxt = "Login";
        type.value = "/login";

    } else {
        btxt = "Register";
        type.value = "/reg";
    }

    btn.value = btxt;
    form.addEventListener("submit", loginuser);
}

// Verifies skey match and shows appropriate window
function verskey(res) {

    let lgwin = gid("login");

    if(res == true) {
        lgwin.style.display = "none";
        gettournamentstatus();

    } else {
        logout();
    }
}

// Validates local skey with backend
function chkskey() {

    let params = "skey=" + gss("gambotkey");

    gofetch("/verskey", params, verskey);
}

// Verifies player edit response
function verplayeredit(obj) {

    if(obj.ID != undefined) {
        statuspopup("Successfully updated player data");

    } else {
        statuspopup("Error updating player data");
    }
}

// Requests edit of player properties
function editplayer() {

    let pid = gid("indplayername").getAttribute("name");
    let action = gid("editplayer").getAttribute("name");
    let params = "id=" + pid + "&action=" + action + "&skey=" + gss("gambotkey");

    gofetch("/ep", params, verplayeredit);

    showpopup("pmgmt");
}

// Checks if admin account exists in db
function adminindb() {

    gofetch("/chkadm", "", veradminindb);
}

// Checks if admin is logged in
function checklogin() {

    adminindb();
    chkskey();
}

// Displays log
function verlog(llist) {

    gid("logdata").innerHTML = "";
    for(const l of llist) log(l);
    storelogindex(10);
}

// Returns current log number
function getlogindex() {

    return Number(gss("gambotlogindex"));
}

// Stores log index in session storage
function storelogindex(n) {

    let cur = getlogindex();

    cur += n;

    if(Number.isInteger(cur)) sessionStorage.gambotlogindex = cur;
}

// Retrieves log from server
function getlog(i, n) {

    let li = getlogindex();

    if(i === undefined && li === "") i = 0;
    else if(i === undefined) i = li;

    if(i == 0) sessionStorage.gambotlogindex = 0;

    if(n === undefined) n = 10;

    let params = "i=" + i + "&n=" + n + "&skey=" + gss("gambotkey");

    gofetch("/log", params, verlog);
    showpopup("log");
}

// Retrieves macro definitions
async function getdefaults() {

    let resp = await fetch("../mac.json");
    if(resp.ok) mac = await resp.json();
}

// Request necessary data after window refresh
window.onbeforeunload = function() {
    getdefaults();
    checklogin();
};

// Request necessary data after load
window.onload = function() {
    getdefaults();
    checklogin();
    sessionStorage.gambottopplayers = 5;
    sessionStorage.gambotlogindex = 0;
}
