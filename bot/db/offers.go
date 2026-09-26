package db

import (
	"context"
	"time"
)

// Offer is one entry on the Offers list a customer gets on tapping Offers.
type Offer struct {
	ID          int        `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url"`
	Active      bool       `json:"active"`
	SortOrder   int        `json:"sort_order"`
	EndsAt      *time.Time `json:"ends_at"` // nil runs until switched off
	CreatedAt   time.Time  `json:"created_at"`
}

const offerColumns = `id, title, description, image_url, active, sort_order, ends_at, created_at`

func scanOffers(query string, args ...any) ([]Offer, error) {
	rows, err := Pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	offers := []Offer{}
	for rows.Next() {
		var o Offer
		if err := rows.Scan(&o.ID, &o.Title, &o.Description, &o.ImageURL, &o.Active, &o.SortOrder, &o.EndsAt, &o.CreatedAt); err != nil {
			return nil, err
		}
		offers = append(offers, o)
	}
	return offers, rows.Err()
}

// ListOffers returns every offer for the panel, live ones first.
func ListOffers() ([]Offer, error) {
	return scanOffers(`SELECT ` + offerColumns + ` FROM offers ORDER BY active DESC, sort_order, created_at DESC`)
}

// LiveOffers returns what a customer is shown: active and not yet ended.
func LiveOffers(limit int) ([]Offer, error) {
	return scanOffers(`SELECT `+offerColumns+` FROM offers
		WHERE active AND (ends_at IS NULL OR ends_at > NOW())
		ORDER BY sort_order, created_at DESC LIMIT $1`, limit)
}

func CreateOffer(o Offer) (int, error) {
	var id int
	err := Pool.QueryRow(context.Background(),
		`INSERT INTO offers (title, description, image_url, active, sort_order, ends_at)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		o.Title, o.Description, o.ImageURL, o.Active, o.SortOrder, o.EndsAt).Scan(&id)
	return id, err
}

func UpdateOffer(o Offer) error {
	_, err := Pool.Exec(context.Background(),
		`UPDATE offers SET title = $2, description = $3, image_url = $4, active = $5,
		 sort_order = $6, ends_at = $7, updated_at = NOW() WHERE id = $1`,
		o.ID, o.Title, o.Description, o.ImageURL, o.Active, o.SortOrder, o.EndsAt)
	return err
}

func DeleteOffer(id int) error {
	_, err := Pool.Exec(context.Background(), `DELETE FROM offers WHERE id = $1`, id)
	return err
}
