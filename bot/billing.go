package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"sync"
	"time"

	"connect-coffee-bot/db"
)

// Meta does not let this app read the prepaid balance (only Business
// Solution Providers can), but it does report what was spent. So the panel
// keeps the balance someone last read off WhatsApp Manager, and when, and
// takes off what Meta reports spent since.
const (
	settingBalance   = "meta_balance"
	settingBalanceAt = "meta_balance_at"
	// India's marketing rate as charged on the cafe's account (₹120.83 for
	// 140 on 25 Oct 2026). Used until Meta reports a rate of its own.
	defaultMarketingRate = 0.8631
)

type Billing struct {
	Currency     string   `json:"currency"`
	Rate         float64  `json:"rate"` // per delivered marketing message
	RateFromMeta bool     `json:"rate_from_meta"`
	SpentToday   float64  `json:"spent_today"` // from midnight, the cafe's time
	PaidToday    int      `json:"paid_today"`  // marketing messages charged today
	Spent7d      float64  `json:"spent_7d"`
	SpentMonth   float64  `json:"spent_month"`
	Balance      *float64 `json:"balance"`          // as entered; nil until someone does
	BalanceAt    string   `json:"balance_at"`       // when it was entered
	SpentSince   float64  `json:"spent_since"`      // since then, from Meta
	BalanceNow   *float64 `json:"balance_estimate"` // Balance - SpentSince
	Problem      string   `json:"problem"`
}

type spend struct {
	cost, marketingCost float64
	marketingCount      int
}

// metaSpend is what Meta charged between two times. Half-hour data lets a
// balance entered mid-day count only what came after; for longer ranges it
// falls back to whole days.
func metaSpend(start, end time.Time) (spend, error) {
	var s spend
	var err error
	for _, granularity := range []string{"HALF_HOUR", "DAILY"} {
		s, err = metaSpendBy(start, end, granularity)
		if err == nil {
			return s, nil
		}
	}
	return s, err
}

func metaSpendBy(start, end time.Time, granularity string) (spend, error) {
	var s spend
	token, waba := os.Getenv("ACCESS_TOKEN"), os.Getenv("WABA_ID")
	if token == "" || waba == "" {
		return s, fmt.Errorf("WhatsApp is not connected")
	}
	if granularity == "DAILY" {
		start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())
	}
	q := url.Values{"fields": {fmt.Sprintf(
		`pricing_analytics.start(%d).end(%d).granularity(%s).dimensions(["PRICING_CATEGORY"])`,
		start.Unix(), end.Unix(), granularity)}}
	req, _ := http.NewRequest("GET", "https://graph.facebook.com/v21.0/"+waba+"?"+q.Encode(), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := metaClient.Do(req)
	if err != nil {
		return s, err
	}
	defer resp.Body.Close()
	var body struct {
		Pricing struct {
			Data []struct {
				Points []struct {
					Start    int64   `json:"start"`
					Category string  `json:"pricing_category"`
					Volume   int     `json:"volume"`
					Cost     float64 `json:"cost"`
				} `json:"data_points"`
			} `json:"data"`
		} `json:"pricing_analytics"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return s, err
	}
	if body.Error != nil {
		return s, fmt.Errorf("%s", body.Error.Message)
	}
	for _, d := range body.Pricing.Data {
		for _, p := range d.Points {
			s.cost += p.Cost
			if p.Category == "MARKETING" {
				s.marketingCost += p.Cost
				s.marketingCount += p.Volume
			}
		}
	}
	return s, nil
}

var billingCache struct {
	sync.Mutex
	b  Billing
	at time.Time
}

// cafeZone is the cafe's clock, for "today" and "this month".
var cafeZone = func() *time.Location {
	if loc, err := time.LoadLocation("Asia/Kolkata"); err == nil {
		return loc
	}
	return time.FixedZone("IST", 5*3600+1800)
}()

// billing gathers spend and balance, asking Meta at most every two minutes.
var billingFetch sync.Mutex

// billing returns the spend and balance. The last figures come back at once
// and are refreshed in the background once two minutes old, so the panel
// does not wait on Meta; fresh (after a send, or a new balance) waits for
// Meta's latest instead.
func billing(fresh bool) Billing {
	billingCache.Lock()
	b, at := billingCache.b, billingCache.at
	billingCache.Unlock()
	if !fresh && !at.IsZero() {
		if time.Since(at) >= 2*time.Minute {
			go refreshBilling(at)
		}
		return b
	}
	return refreshBilling(at)
}

// refreshBilling asks Meta again, unless another refresh finished since the
// figures dated seen were read.
func refreshBilling(seen time.Time) Billing {
	billingFetch.Lock()
	defer billingFetch.Unlock()
	billingCache.Lock()
	if billingCache.at.After(seen) {
		defer billingCache.Unlock()
		return billingCache.b
	}
	billingCache.Unlock()

	b := computeBilling()
	billingCache.Lock()
	billingCache.b, billingCache.at = b, time.Now()
	billingCache.Unlock()
	return b
}

// computeBilling asks Meta for each period's spend. The questions are
// independent, so they go out together: one after another they took about
// three seconds.
func computeBilling() Billing {
	b := Billing{Currency: "INR", Rate: defaultMarketingRate}
	now := time.Now().In(cafeZone)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, cafeZone)
	month := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, cafeZone)

	var balance *float64
	balanceAt := ""
	var balanceFrom time.Time
	if raw := db.GetSetting(settingBalance); raw != "" {
		if amount, err := strconv.ParseFloat(raw, 64); err == nil {
			balance = &amount
			balanceAt = db.GetSetting(settingBalanceAt)
			balanceFrom, _ = time.Parse(time.RFC3339, balanceAt)
		}
	}

	type answer struct {
		s   spend
		err error
	}
	var todayA, weekA, rateA, monthA, sinceA answer
	var wg sync.WaitGroup
	ask := func(out *answer, f func() (spend, error)) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			out.s, out.err = f()
		}()
	}
	ask(&todayA, func() (spend, error) { return metaSpend(today, now) })
	ask(&weekA, func() (spend, error) { return metaSpendBy(now.AddDate(0, 0, -7), now, "DAILY") })
	ask(&rateA, func() (spend, error) { return metaSpendBy(now.AddDate(0, 0, -30), now, "DAILY") })
	ask(&monthA, func() (spend, error) { return metaSpendBy(month, now, "DAILY") })
	if balance != nil && !balanceFrom.IsZero() {
		ask(&sinceA, func() (spend, error) { return metaSpend(balanceFrom, now) })
	}
	wg.Wait()

	if todayA.err == nil {
		b.SpentToday, b.PaidToday = todayA.s.cost, todayA.s.marketingCount
	} else {
		b.Problem = "Could not read spending from WhatsApp: " + todayA.err.Error()
	}
	if weekA.err == nil {
		b.Spent7d = weekA.s.cost
	}
	if rateA.err == nil && rateA.s.marketingCount > 0 {
		b.Rate, b.RateFromMeta = rateA.s.marketingCost/float64(rateA.s.marketingCount), true
	}
	if monthA.err == nil {
		b.SpentMonth = monthA.s.cost
	}

	if balance != nil {
		b.Balance, b.BalanceAt = balance, balanceAt
		left := *balance
		if !balanceFrom.IsZero() {
			if sinceA.err == nil {
				b.SpentSince = sinceA.s.cost
				left -= sinceA.s.cost
			} else if b.Problem == "" {
				b.Problem = "Could not read spending since the balance was entered: " + sinceA.err.Error()
			}
		}
		b.BalanceNow = &left
	}
	return b
}

func setBalance(amount float64) error {
	if err := db.UpdateSetting(settingBalance, strconv.FormatFloat(amount, 'f', 2, 64)); err != nil {
		return err
	}
	if err := db.UpdateSetting(settingBalanceAt, time.Now().UTC().Format(time.RFC3339)); err != nil {
		return err
	}
	billingCache.Lock()
	billingCache.at = time.Time{}
	billingCache.Unlock()
	log.Printf("[Billing] Balance set to ₹%.2f", amount)
	return nil
}
