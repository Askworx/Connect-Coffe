package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"connect-coffee-bot/db"
)

const StateQuizExplanation SessionState = "quiz_explanation"

// quizSessionStore holds the quiz a person is being asked about.
var quizSessionStore = map[string]*db.Quiz{}

// tryAutomationModules handles quiz answers and FAQ keywords, and reports
// whether it did.
func tryAutomationModules(phone, rawInput string) bool {
	upper := strings.ToUpper(strings.TrimSpace(rawInput))

	if sessions[phone] == StateQuizExplanation {
		handleQuizExplanationReply(phone, upper)
		return true
	}

	quiz, err := db.GetActiveQuiz()
	if err != nil {
		log.Printf("[Quiz] DB error: %v", err)
	}
	if quiz != nil {
		if answered, _ := db.HasUserResponded(quiz.ID, phone); !answered {
			switch {
			case upper == "A" || strings.Contains(upper, "OPTION A"):
				handleQuizResponse(phone, "A", quiz)
				return true
			case upper == "B" || strings.Contains(upper, "OPTION B"):
				handleQuizResponse(phone, "B", quiz)
				return true
			case upper == "C" || strings.Contains(upper, "OPTION C"):
				handleQuizResponse(phone, "C", quiz)
				return true
			}
		}
	}

	if ans, ok := tryFAQMatch(rawInput); ok {
		sendFAQAnswer(phone, ans)
		return true
	}
	return false
}

// ── Coffee quiz ──────────────────────────────────────────────────────────

func handleQuizResponse(phone, answer string, quiz *db.Quiz) {
	isCorrect := answer == strings.ToUpper(quiz.CorrectAnswer)
	if err := db.SaveQuizResponse(quiz.ID, phone, answer, isCorrect); err != nil {
		log.Printf("[Quiz] Save error: %v", err)
	}

	msg := "☕ *Thanks for playing!*\n\n❌ Not quite — but it was a tricky one.\n\nWant to see the answer?"
	if isCorrect {
		msg = "☕ *Thanks for playing!*\n\n✅ *That's right!*\n\nWant to see why?"
	}
	quizSessionStore[phone] = quiz
	sessions[phone] = StateQuizExplanation
	sendInteractiveButtons(phone, msg, []Button{
		{ID: "YES", Title: "Yes, show me"},
		{ID: "NO", Title: "Maybe later"},
	})
}

func handleQuizExplanationReply(phone, upper string) {
	quiz := quizSessionStore[phone]
	if quiz == nil {
		sessions[phone] = StateMain
		return
	}
	switch upper {
	case "YES":
		msg := fmt.Sprintf("🎯 *The answer is %s*\n\n%s", strings.ToUpper(quiz.CorrectAnswer), quiz.Explanation)
		if quiz.YouTubeLink != "" {
			msg += "\n\n🎥 " + quiz.YouTubeLink
		}
		sendInteractiveButtons(phone, msg, homeButtons())
	case "NO":
		sendInteractiveButtons(phone, "👍 No problem! Come taste the real thing soon ☕", homeButtons())
	default:
		sendTextMessage(phone, "Please tap *Yes* or *No* above 👆")
		return
	}
	sessions[phone] = StateMain
	delete(quizSessionStore, phone)
}

// sendEngagementNudge follows a quiz two minutes later with an invitation.
func sendEngagementNudge(phone string) {
	body := fmt.Sprintf("☕ While you're here — come taste it at *%s*.\n\nFreshly roasted, hand-brewed, in RR Nagar.", os.Getenv("COMPANY_NAME"))
	sendInteractiveButtons(phone, body, homeButtons())
}

// ── FAQ keywords ─────────────────────────────────────────────────────────

func tryFAQMatch(input string) (string, bool) {
	lower := strings.ToLower(input)
	// Button ids contain underscores and are never questions.
	if strings.Contains(lower, "_") {
		return "", false
	}
	faqs, err := db.GetAllFAQs()
	if err != nil {
		log.Printf("[FAQ] DB error: %v", err)
		return "", false
	}
	for _, entry := range faqs {
		for _, kw := range strings.Split(entry.Keywords, ",") {
			if kw = strings.TrimSpace(kw); kw != "" && strings.Contains(lower, strings.ToLower(kw)) {
				return entry.Answer, true
			}
		}
	}
	return "", false
}

// ── Team alerts ──────────────────────────────────────────────────────────

// NotifyTeam sends a message to the cafe's own WhatsApp. Like any free-form
// message it only arrives if that phone has messaged the bot in the last 24
// hours, so the team phone should say "hi" to the bot once a day.
func NotifyTeam(message string) {
	teamNumber := os.Getenv("TEAM_WHATSAPP_NUMBER")
	if teamNumber == "" {
		log.Println("[Team] TEAM_WHATSAPP_NUMBER not set — skipping:", strings.SplitN(message, "\n", 2)[0])
		return
	}
	sendTextMessage(teamNumber, message)
}
