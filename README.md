# Collections Strategy Optimizer

A Node.js service that helps collection agents decide how to contact borrowers who missed payments. It figures out the best action, picks the right channel, and drafts a message.

## How It Works

1. Takes borrower data (how late they are, payment history, any hardship)
2. Puts them in a segment (like "willing but delayed" or "hardship case")
3. Picks the best action (send SMS, call them, escalate, etc.)
4. Generates a polite message draft using an LLM
5. If LLM fails or says something bad, uses a safe template instead

The key idea: **rules decide what to do, LLM only writes the message**. This keeps decisions explainable.

## Quick Start

```bash
npm install
cp .env.example .env    # add your LLM token
npm start               # runs on port 3000
npm test                # run tests
```

## API

All endpoints except /health need a Bearer token.

```
GET  /health                          Public health check
GET  /api/v1/borrowers                List borrowers you can see
POST /api/v1/borrowers/:id/recommend  Get recommendation + message
POST /api/v1/borrowers/:id/explain    Ask why a decision was made
```

Test tokens (set in .env):
- `agent-token-1` - agent A001, sees only their borrowers
- `supervisor-token-1` - supervisor S001, sees everyone

Example:
```bash
curl -H "Authorization: Bearer agent-token-1" \
  http://localhost:3000/api/v1/borrowers

curl -X POST -H "Authorization: Bearer agent-token-1" \
  http://localhost:3000/api/v1/borrowers/B-1001/recommend
```

## Data Schema

### Borrower (what goes in)

```js
{
  borrowerId: "B-1001",
  daysPastDue: 7,                    // days since payment was due
  overdueAmount: 1250000,            // amount in paise (125000 = Rs 1250)
  priorPaymentBehavior: "on_time",   // on_time, occasional_late, frequent_late, defaulter
  preferredChannel: "sms",           // sms, email, call, whatsapp
  hardshipIndicators: {
    jobLoss: false,
    medical: false,
    naturalDisaster: false
  },
  assignedAgentId: "A001",
  responseHistory: [...],            // past contact attempts
  repaymentPromises: [...]           // promises made and if kept
}
```

### Recommendation (what comes out)

```js
{
  borrowerId: "B-1001",
  recommendation: {
    segment: "WILLING_BUT_DELAYED",
    nextBestAction: "SMS_REMINDER",
    channel: "sms",
    recoveryProbability: 0.85,
    segmentReasons: ["DPD=7", "No hardship"]
  },
  message: {
    message: "Hi, friendly reminder about your balance...",
    source: "llm"        // or "fallback" if LLM failed
  },
  explainability: {
    rules: ["hardshipRule", "highRiskRule", ...],
    reasons: ["DPD=7", "Prior: on_time"]
  }
}
```

## Segments

The system checks these rules in order. First match wins.

| Rule | When it triggers | Segment |
|------|------------------|---------|
| Hardship | Any hardship flag is true | HARDSHIP_CASE |
| High Risk | 90+ days late or prior defaulter | HIGH_RISK_ESCALATION |
| Unresponsive | 3+ contacts, no response | UNRESPONSIVE |
| Habitual Late | Frequently late payer | HABITUAL_LATE_PAYER |
| Default | Everyone else | WILLING_BUT_DELAYED |

Hardship always comes first. We never escalate someone in crisis.

## Assumptions

- **Mock data**: 5 sample borrowers, one per segment
- **Mock auth**: tokens map to roles, no real JWT
- **In memory**: data resets on restart
- **English only**: fallback messages are in English
- **Recovery probability**: just estimates, not from real data
- **No real integrations**: no actual SMS, calls, or payments

## Limitations

- Keyword filter for bad messages is basic. Could be bypassed.
- No persistence. Real system would use a database.
- Single tenant. No multi lender support.
- Best contact time is a guess, not learned from data.

## Project Structure

```
src/
  server.js           Entry point
  app.js              Puts everything together
  config/             Environment config
  data/               Mock borrowers
  repositories/       Data access with role checks
  services/           Business logic (segmentation, strategy, messages)
  prompts/            LLM prompts and safety checks
  controllers/        HTTP handlers
  routes/             URL mapping
  middleware/         Auth
  utils/              Helpers
tests/
  unit/               All tests
  fixtures/           Test data
```
