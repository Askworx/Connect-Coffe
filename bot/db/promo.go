package db

import "context"

// GetPromoCandidates returns opted-in contacts who started chatting at least
// delayMinutes ago and are still inside their free 24-hour window, and who
// have not been sent the promotion in the last repeatDays.
//
// "Started chatting" is their first message within the last 24 hours, so the
// promotion follows a conversation by the delay rather than following every
// message. While that first message is inside the last 24 hours the window is
// open, because the window runs from their latest message, never an earlier
// one.
func GetPromoCandidates(delayMinutes, repeatDays int) ([]string, error) {
	rows, err := Pool.Query(context.Background(), `
		SELECT c.phone
		FROM contacts c
		JOIN (
			SELECT RIGHT(phone, 10) AS phone10, MIN(sent_at) AS first_in
			FROM messages_log
			WHERE direction = 'incoming'
			  AND sent_at > NOW() - INTERVAL '24 hours'
			GROUP BY 1
		) w ON RIGHT(c.phone, 10) = w.phone10
		WHERE c.opt_out = FALSE
		  AND w.first_in <= NOW() - make_interval(mins => $1)
		  AND NOT EXISTS (
			SELECT 1 FROM promo_sends p
			WHERE RIGHT(p.phone, 10) = RIGHT(c.phone, 10)
			  AND p.sent_at > NOW() - make_interval(days => $2))`,
		delayMinutes, repeatDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	phones := []string{}
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		phones = append(phones, p)
	}
	return phones, rows.Err()
}

// RecordPromoSend marks the promotion as sent to phone. It is written before
// the message goes out, so a slow send cannot let the next minute's tick pick
// the same person up again.
func RecordPromoSend(phone string) error {
	_, err := Pool.Exec(context.Background(),
		`INSERT INTO promo_sends (phone) VALUES ($1)`, phone)
	return err
}
