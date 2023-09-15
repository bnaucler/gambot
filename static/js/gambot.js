// Alias to reduce typing
const gid = document.getElementById.bind(document);
const gss = sessionStorage.getItem.bind(sessionStorage);

let mac;

// HTTP request wrapper
async function gofetch(url) {

    const resp = await fetch(url);

    if(resp.ok) return resp.json();
}

// Returns DOM object of requested type, and with class & text defined if requested
function mkobj(type, cl, txt) {

    let ret = document.createElement(type);

    if(cl !== undefined && cl != "") ret.classList.add(cl);

    if(txt !== undefined) {
        const tc = document.createTextNode(txt);
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
async function declareresult(gid, pid, wname) {

    const url = "/dr?id=" + pid + "&game=" + gid + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    if(resp.P != undefined) updatewindow(resp);

    if(pid === 0) statuspopup("Game " + gid + " is a draw.");
    else statuspopup("Game " + gid + " won by " + wname);
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

    const elem = mkobj("div", "minipop");

    elem.style.left = (event.clientX - 5) + "px";
    elem.style.top = (event.clientY - 5) + "px";

    elem.addEventListener("mouseleave", function(event) {
        elem.remove();
    });

    return elem;
}

// Requests a game when seeding algo is not automatically creating one
async function forcegame(id) {

    const url = "/mkgame?id=" + id + "&skey=" + gss("gambotkey");

    const resp = await gofetch(url);
    if(resp.P != undefined) updatewindow(resp);
}

// Puts a player on pause to exclude from game seeding
async function togglepause(id) {

    const url = "/ep?id=" + id + "&action=pause&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    if(resp.ID != 0) gettournamentstatus();
}

// Creates a popup menu for bench players
function benchpopup(id, t, pstat) {

    const bpop = mkminipop();
    const pdiv = gid("tnmt");
    const ptext = pstat ? "Unpause" : "Pause";
    const rembtn = mkobj("div", "minipopitem", "Remove");
    const forcebtn = mkobj("div", "minipopitem", "Force");
    const pausebtn = mkobj("div", "minipopitem", ptext);

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

    const bpop = mkminipop();
    const dwbtn = mkobj("div", "minipopitem", "Declare win");
    const rembtn = mkobj("div", "minipopitem", "Remove");
    const pausebtn = mkobj("div", "minipopitem", "Pause");
    const pdiv = gid("tnmt");

    dwbtn.addEventListener("click", () => {
        const pname = getplayername(id, t);
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

    const pdiv = gid("bench");
    const player = mkobj("div", "benchp", getplayername(id, t));
    const pstat = getpstat(id, t);

    if(pstat) {
        const picon = mkobj("div", "picon");
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

    const pdiv = gid("games");
    const game = mkobj("div", "game");
    const bw = mkobj("div", "bw");
    const W = mkobj("div", "wp", getplayername(g.W, t));
    const B = mkobj("div", "bp", getplayername(g.B, t));
    const draw = mkobj("div", "draw");
    const dtext = mkobj("span", "", "draw");

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

// Updates game window with tournament data
function updatewindow(t) {

    const pdiv = gid("games");
    const bench = mkobj("div");

    pdiv.innerHTML = "";
    bench.id = "bench";

    if(t.P == null) return;
    if(t.ID != 0) gettopplayers(5, "c");
    else gettopplayers(5, "a");

    if(t.G != null) {
        for(const g of t.G) {
            if(timezero(g.End)) addgame(g, t);
        }
    }

    pdiv.appendChild(bench);
    popbench(t);
}

// Formats server date codes to a more easily readable format
function formatdate(d) {

    const date = d.substring(0, 10);
    const time = d.substring(11, 16);

    return date + " " + time;
}

// Returns names & score for n# of top players in tournament t
function ttop(n, t) {

    let tc = structuredClone(t.P)
    let ret = [];
    const plen = tc.length;

    tc.sort((i, j) => i.TN.Points - j.TN.Points);
    tc.reverse();

    if(n > plen) n = plen;

    for(let i = 0; i < n; i++) ret.push(tc[i].Pi.Name + " " + tc[i].TN.Points);

    return ret;
}

// Adds individual player & score to tournament history list
function createtlistplayer(t, td) {

    const tpl = ttop(3, t);

    for(const p of tpl) {
        const tp = mkobj("p", "ttp", p);
        td.appendChild(tp);
    }
}

// Creates list item for tournament history
function createtlistitem(t) {

    const pdiv = gid("thist");
    const td = mkobj("div", "tlitm");
    const id = mkobj("p", "tid", t.ID);
    const stext = formatdate(t.Start) + " - " + formatdate(t.End);
    const stime = mkobj("p", "ttime", stext);

    td.appendChild(id);
    td.appendChild(stime);

    if(!(t.P == null)) {
        createtlistplayer(t, td);

    } else {
        const tp = mkobj("p", "ttp", "No players in tournament");
        td.appendChild(tp);
    }

    pdiv.appendChild(td);
}

// Request adding selected players to current tournament
async function playertotournament(elem) {

    const selectedplayers = document.querySelectorAll('input[name="selected"]:checked');
    let ids = [];

    selectedplayers.forEach((checkbox) => {
        ids.push(checkbox.value);
    });

    const url = "/apt?id=" + ids.toString() + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    if(resp.P != undefined) updatewindow(resp);

    showpopup("none");
}

// Fills the horizontal bar for win / draw / loss
function fillbar(col, win, draw, loss) {

    const sum = win + draw + loss;
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

    gid("apsubmit").value = func == "edit" ? "Edit player" : "Add new player";
}

// Requests to open and populate the edit player data form
async function openplayeredit(id) {

    const url = "/gp?id=" + id + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    showpopup("addplayer"); // Needs to run before setting pd

    const form = gid("addplayerform");
    const pd = resp[0].Pi;

    form.id.value = resp[0].ID;
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

// Retrieves and displays data on individual player
async function getplayerdata(p) {

    const url = "/gp?id=" + p.getAttribute("name") + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    const pname = gid("indplayername");
    const indgames = gid("indgamesval");
    const indpoints = gid("indpointsval");
    const indppg = gid("indppgval");
    const indppgw = gid("indppgwval");
    const indppgb = gid("indppgbval");
    const editbtn = gid("editplayer");
    const editdatabtn = gid("indplayeredit");
    const intourn = gss("gambotintournament");
    const statobj = intourn == 1 ? resp[0].TN : resp[0].AT;

    pname.innerHTML = resp[0].Pi.Name;
    pname.setAttribute("name", resp[0].ID);

    indgames.innerHTML = statobj.Ngames;
    indpoints.innerHTML = statobj.Points;
    indppg.innerHTML = statobj.APPG.toFixed(2);
    indppgw.innerHTML = statobj.WAPPG.toFixed(2);
    indppgb.innerHTML = statobj.BAPPG.toFixed(2);

    if(resp[0].Active == true) {
        editbtn.innerHTML = "Deactivate";
        editbtn.setAttribute("name", "deac");

    } else {
        editbtn.innerHTML = "Activate";
        editbtn.setAttribute("name", "activate");
    }

    editdatabtn.addEventListener("click", () => {
        openplayeredit(resp[0].ID);
    });

    fillbar(mac.TOTAL, statobj.Stat[mac.WWIN] + statobj.Stat[mac.BWIN],
                   statobj.Stat[mac.WDRAW] + statobj.Stat[mac.BDRAW],
                   statobj.Stat[mac.WLOSS] + statobj.Stat[mac.BLOSS]);
    fillbar(mac.WHITE, statobj.Stat[mac.WWIN], statobj.Stat[mac.WDRAW], statobj.Stat[mac.WLOSS]);
    fillbar(mac.BLACK, statobj.Stat[mac.BWIN], statobj.Stat[mac.BDRAW], statobj.Stat[mac.BLOSS]);
    showpopup("indplayer");
}

// Adds player to list
function showplayer(p, pdiv, intourn) {

    const pl = mkobj("div", "pln");
    const name = mkobj("p", "pntxt", p.Pi.Name);

    pl.appendChild(name);

    if(p.Active == false && gss("gambotshowdeac") == "true") {
        pl.style.backgroundColor = "#772222";

    } else if(p.Active == true && intourn == 1) {
        const cb = mkobj("input", "", "");

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

// Returns true if time object is zero / null
function timezero(ttime) {

    if(ttime.startsWith("0001")) return true;
    else return false;
}

// Creates an entry in the local log
function log(data) {

    const pdiv = gid("logdata");
    const item = mkobj("div", "log", data);

    pdiv.appendChild(item);
}

// Processes tournament end request and creates appropriate statuspops
function tournamentend(obj) {

    const date = obj.End.slice(0, 10);
    const time = obj.End.slice(11, 16);

    if(obj.Status === mac.S_ERR) statuspopup("No tournament running - cannot end!");
    else statuspopup("Tournament " + obj.ID + " ended at " + date + " "+ time);

    tournamentended();
    updatestatus(obj);
}

// Makes call to start tournament with selected algo
async function launchtournament(algo) {

    const url = "/ct?algo=" + algo + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    gettopplayers(5);

    const date = resp.Start.slice(0, 10);
    const time = resp.Start.slice(11, 16);

    if(resp.Status === mac.S_ERR) statuspopup("Could not start new tournament");
    else {
        statuspopup("Tournament " + resp.ID + " started at " + date + " "+ time);

        if(resp.P === undefined) gid("games").innerHTML = "";
        else updatewindow(resp);
    }

    tournamentstarted();
}

// Requests start of new tournament
function newtournament() {

    const bpop = mkminipop();
    const pdiv = gid("tnmt");
    const rndbtn = mkobj("div", "minipopitem", "Random");
    const winwinbtn = mkobj("div", "minipopitem", "Winner meets winner");
    const monradbtn = mkobj("div", "minipopitem", "Monrad");

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

// Requests edit of current tournament
async function edittournament(action, id) {

    const url = "/et?action=" + action + "&id=" + id + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    if(timezero(resp.End)) {
        statuspopup("Player removed from tournament");
        updatestatus(resp);

    } else {
        tournamentend(resp);
    }
}

// Shows a temporary status message on the screen
function statuspopup(msg) {

    const mdiv = mkobj("div", "statuspop", msg);
    const pdiv = gid("tnmt");

    setTimeout(() => { mdiv.remove(); }, 4000);
    setTimeout(() => { mdiv.classList.add("fade-out"); }, 3000);

    pdiv.appendChild(mdiv);
}

// Requests adding new player to database
async function addplayer(elem) {

    const id = elem.elements["id"].value;
    const fname = elem.elements["fname"].value;
    const lname = elem.elements["lname"].value;
    const dbirth = elem.elements["dbirth"].value;
    const gender = elem.elements["gender"].value;
    const email = elem.elements["email"].value;
    const postal = elem.elements["postal"].value;
    const zip = elem.elements["zip"].value;
    const phone = elem.elements["phone"].value;
    const club = elem.elements["club"].value;

    const url = "/ap?id=" + id +
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

    let msg;
    const resp = await gofetch(url);

    if(resp[0].Status == mac.S_OK) msg = resp[0].Pi.Name + " added/edited successfully";
    else msg = "Could not add player";

    statuspopup(msg);
    gettournamentstatus();
}

// Sends request to search database for players
async function getplayers(elem) {

    const intourn = gss("gambotintournament");
    const id = elem.elements["ID"].value;
    const name = elem.elements["name"].value;
    const cb = gid("showdeac").checked;
    const pdiv = gid("playerdata");
    const br = mkobj("br", "", "");
    const url = "/gp?id=" + id + "&name=" + name + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    sessionStorage.gambotshowdeac = cb;

    pdiv.innerHTML = "";
    pdiv.style.display = "block";
    pdiv.appendChild(br);

    for(const p of resp) {
        if(p.Status == mac.S_OK) showplayer(p, pdiv, intourn);
    }

    if(intourn == 1) {
        const btn = mkobj("button", "", "Add selected players to tournament");

        btn.addEventListener("click", () => {
            playertotournament(pdiv);
        });

        pdiv.appendChild(btn);
    }
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

    const item = mkobj("div", "topplayer");
    const name = mkobj("p", "tpname", text);

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

    const morebtn = mkobj("p", "morebtn", "more");

    morebtn.addEventListener("click", () => {
        addtpcount(5);
        gettopplayers(gettpcount(), s);
    });

    pdiv.appendChild(morebtn);
}

// Adds 'less' button to top player list
function addtoplessbtn(s, pdiv) {

    const lessbtn = mkobj("p", "lessbtn", "less");
    let nop = gettpcount() - 5;

    if(nop < 5 || nop === undefined || nop == NaN) nop = 5;

    lessbtn.addEventListener("click", () => {
        gettopplayers(nop, s);
        sessionStorage.gambottopplayers = nop;
    });

    pdiv.appendChild(lessbtn);
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
async function gettournamentstatus() {

    const url = "/ts?skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    updatestatus(resp);
}

// Requests tournament history (n games starting at index i)
async function getthist(elem) {

    const id = elem.elements["ID"].value;
    const n = elem.elements["n"].value;
    const url = "/th?i=" + id + "&n=" + n + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    gid("thist").innerHTML = "";

    if(resp.length === 0) {
        statuspopup("No data received!");
        return;
    }

    for(const t of resp) {
        if(!timezero(t.End)) createtlistitem(t);
    }
}

// Gets current values for pwin, pdraw and ploss
async function getpcur() {

    const url = "/admin?skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    gid("pwinnum").value = resp.Pwin;
    gid("pdrawnum").value = resp.Pdraw;
    gid("plossnum").value = resp.Ploss;
}

// Submits change of admin settings
async function changeadmin(elem) {

    const pwin = elem.elements["pwin"].value;
    const pdraw = elem.elements["pdraw"].value;
    const ploss = elem.elements["ploss"].value;
    const url = "/admin?pwin=" + pwin + "&pdraw=" + pdraw +
                "&ploss=" + ploss + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    gid("adminform").reset();
    showpopup("none");

    if(resp.Status == mac.S_ERR) logout();
    else statuspopup("Admin settings successfully updated");
}

// Requests top players (n players of type t: (a)ll or (c)urrent)
async function gettopplayers(n, t) { // TODO refactor

    const url = "/gtp?n=" + n + "&t=" + t + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);
    const pdiv = gid("topfivecontents");
    const plen = resp.P.length;

    pdiv.innerHTML = "";

    if(resp.S == "a" || plen == 0) {
        gid("games").style.width = "0";
        gid("topfive").style.width = "100%";
        gid("topfive").style.display = "block";
        gid("topfiveheader").innerHTML = "ALL TIME TOP " + plen;

    } else if (resp.S == "c" && resp.P.length > 0) {
        gid("games").style.width = "75%";
        gid("topfive").style.width = "25%";
        gid("topfive").style.display = "block";
        gid("topfiveheader").innerHTML = "TOP " + plen;

    } else {
        gid("topfive").style.display = "none";
    }

    for(const p of resp.P) addtopplayer(p, resp.S, pdiv);

    if(!resp.Ismax) addtopmorebtn(resp.S, pdiv);

    if(plen > 5) addtoplessbtn(resp.S, pdiv);
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
async function loginuser(form) {

    const pass = gid("loginpass").value;
    const ep = gid("logintype").value;
    const url = ep + "?pass=" + pass;

    form.preventDefault();
    gid("loginform").reset();

    trylogin(await gofetch(url));
}

// Changes admin password
async function chpass(elem) {

    const opass = elem.elements["opass"].value;
    const npass = elem.elements["npass"].value;
    const url = "/reg?pass=" + npass + "&opass=" + opass;

    gid("apassform").reset();
    showpopup("none");

    trylogin(await gofetch(url));
}

// Requests change of the public page setting
async function toggleppage() {

    const cstat = Number(gss("gambotppstat"));
    const req = await fetch("/ppstat?set=" + !cstat + "&skey=" + gss("gambotkey"));

    if(req.ok) setppbutton();
}

// Sets correct text and action for ppage button
async function setppbutton() {

    const resp = await gofetch("/ppstat?ppage=getstat");
    const btn = gid("toggleppage");

    btn.innerHTML = "Pulic page: " + (resp == mac.FALSE ? "disabled" : "enabled");
    sessionStorage.gambotppstat = resp;
}

// Iterates through elem list and selected popups to show / hide
function setdisp(elem, popup) {

    for(let pg in elem) {
        elem[pg].style.display = popup.indexOf(pg) < 0 ? "none" : "block";
    }
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

// Validates local skey with backend
async function chkskey() {

    const url = "/verskey?skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    if(resp == true) {
        gid("login").style.display = "none";
        gettournamentstatus();

    } else {
        logout();
    }
}

// Requests edit of player properties
async function editplayer() {

    const pid = gid("indplayername").getAttribute("name");
    const action = gid("editplayer").getAttribute("name");
    const url = "/ep?id=" + pid + "&action=" + action + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    if(resp.ID != undefined) statuspopup("Successfully updated player data");
    else statuspopup("Error updating player data");

    showpopup("pmgmt");
}

// Checks if admin account exists in db
async function adminindb() {

    const btn = gid("loginbutton");
    const type = gid("logintype");
    const form = gid("loginform");
    const resp = await gofetch("/chkadm");

    let btxt;

    if(resp == true) {
        btxt = "Login";
        type.value = "/login";

    } else {
        btxt = "Register";
        type.value = "/reg";
    }

    btn.value = btxt;
    form.addEventListener("submit", loginuser);
}

// Checks if admin is logged in
function checklogin() {

    adminindb();
    chkskey();
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
async function getlog(i, n) {

    const li = getlogindex();

    if(i === undefined && li === "") i = 0;
    else if(i === undefined) i = li;

    if(i == 0) sessionStorage.gambotlogindex = 0;

    if(n === undefined) n = 10;

    const url = "/log?i=" + i + "&n=" + n + "&skey=" + gss("gambotkey");
    const resp = await gofetch(url);

    showpopup("log");

    gid("logdata").innerHTML = "";
    for(const l of resp) log(l);
    storelogindex(10);
}

// Retrieves macro definitions
async function getdefaults() {

    mac = await gofetch("../mac.json");
}

// Request necessary data after window refresh
window.onbeforeunload = () => {
    getdefaults();
    checklogin();
};

// Request necessary data after load
window.onload = () => {
    getdefaults();
    checklogin();
    sessionStorage.gambottopplayers = 5;
    sessionStorage.gambotlogindex = 0;
}
