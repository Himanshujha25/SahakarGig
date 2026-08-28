# AI Chatbot — Common Documentation

## Overview
Gemini-powered AI assistant embedded in all portals. Context-aware: the prompt changes based on the logged-in user role.

## Component
`client/src/components/AIChatbot.jsx`

## Backend
- Controller: `server/src/controllers/aiController.js`
- Route: `server/src/routes/ai.js`
- External API: Google Gemini (via `GEMINI_API_KEY` in `.env`)

## ✅ Implemented
- [x] Floating chatbot button in all layouts
- [x] Role-aware system prompt (household / provider / cooperative / admin)
- [x] Conversation history maintained in session
- [x] Gemini API integration
- [x] AI Voice Search Modal (`AIVoiceSearchModal.jsx`)
- [x] Typing indicator and message bubbles

## ❌ Not Yet Implemented
- [ ] Persistent chat history saved to DB per user
- [ ] AI-suggested provider recommendations based on booking history
- [ ] AI-powered dispute summarization for admin
- [ ] Function calling / tool use (e.g., AI can trigger a booking)
- [ ] Rate limiting per user on AI endpoint
- [ ] Fallback when Gemini API is down or quota exceeded
- [ ] Voice-to-text (speech recognition beyond browser API)

## Environment Variables Required
```
GEMINI_API_KEY=your_key_here
```
