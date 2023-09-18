package gelo

import (
    "fmt"
    "math"

    "github.com/bnaucler/gambot/lib/gcore"
)

// Calculates probability that r1 would win over r2
func geloprob(r1 float64, r2 float64) float64 {

    prob := 1.0 / (1 + math.Pow(10, (r1 - r2) / 400))

    return prob
}

// Updates and returns new gELO numbers
func gelocalc(rp1 float64, rp2 float64, K int, p1r int) (float64, float64) {

    prob1 := geloprob(rp2, rp1)
    prob2 := geloprob(rp1, rp2)

    if p1r == gcore.Mac["WIN"] {
        rp1 = rp1 + float64(K) * (1 - prob1);
        rp2 = rp2 + float64(K) * (0 - prob2);

    } else if p1r == gcore.Mac["DRAW"] {
        rp1 = rp1 + float64(K) * (.5 - prob1);
        rp2 = rp2 + float64(K) * (.5 - prob2);

    } else if p1r == gcore.Mac["LOSS"] {
        rp1 = rp1 + float64(K) * (0 - prob1);
        rp2 = rp2 + float64(K) * (1 - prob2);
    }

    return rp1, rp2
}

// Updates players in requested game with new gELO
func Geloupdate(t gcore.Tournament, gid string, K int, winner int) gcore.Tournament {

    wid := 0
    bid := 0

    widx := 0
    bidx := 0

    for i := 0; i < len(t.G); i++ {
        if t.G[i].ID == gid {
            wid = t.G[i].W
            bid = t.G[i].B
        }
    }

    for i := 0; i < len(t.P); i++ {
        if t.P[i].ID == wid {
            widx = i
        } else if t.P[i].ID == bid {
            bidx = i
        }
    }

    wpelo := t.P[widx].ELO
    bpelo := t.P[bidx].ELO

    if winner == wid {
        t.P[widx].ELO, t.P[bidx].ELO = gelocalc(wpelo, bpelo, K, gcore.Mac["WIN"])

    } else if winner == bid {
        t.P[widx].ELO, t.P[bidx].ELO = gelocalc(wpelo, bpelo, K, gcore.Mac["LOSS"])

    } else {
        t.P[widx].ELO, t.P[bidx].ELO = gelocalc(wpelo, bpelo, K, gcore.Mac["DRAW"])
    }

    fmt.Printf("DEBUG: Updating gELO for %s: %.2f -> %.2f\n", t.P[widx].Pi.Name, wpelo, t.P[widx].ELO)
    fmt.Printf("DEBUG: Updating gELO for %s: %.2f -> %.2f\n", t.P[bidx].Pi.Name, bpelo, t.P[bidx].ELO)

    return t
}
