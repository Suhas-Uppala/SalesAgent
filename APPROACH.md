# SalesAgent AI — Approach Document
## AI Voice Agent for Home Credit LAP Offer

---

## 1. Problem Understanding

Home Credit needs an AI Voice Agent that calls existing customers about a **pre-approved Loan Against Property (LAP)** offer. The agent must:

1. **Verify** the customer's identity
2. **Check availability** and offer callbacks if busy
3. **Present** the LAP offer as a loyalty reward
4. **Detect** existing loan/EMI transfer cases and route appropriately
5. **Collect 7 eligibility data points** sequentially
6. **Apply business rules** with immediate disqualification
7. **Hand off** qualified customers to a senior loan expert

The key challenges are:
- Handling **out-of-order information** (customer provides multiple answers at once)
- **Immediate disqualification** when mandatory criteria fail
- **Diversion handling** (customer asks off-topic questions)
- Maintaining a **conversational, non-robotic** tone
- **State management** to track what's been answered

---

## 2. Architecture Design

### 2.1 State Machine Approach

I designed the agent as a **finite state machine** with clearly defined phases:

```
INIT → GREETING → VERIFICATION → AVAILABILITY → OFFER → ELIGIBILITY → DECISION → HANDOFF/END
```

Each phase has its own handler with specific transition rules. This ensures the agent never skips steps and always knows where it is in the conversation.

### 2.2 Internal Qualification State

The agent maintains an internal state object tracking all eligibility variables:

```
QUALIFICATION_STATE:
├── Call Status (verified, available, offer presented)
├── Eligibility Data (7 data points)
├── Decision Flags (disqualified, transfer, all answered)
└── Outcome (qualified, disqualified, transfer, callback)
```

### 2.3 The Core Algorithm

After **every customer response**, the agent executes this pipeline:

```
1. EXTRACT  → Parse response for ALL eligibility facts (even if not asked)
2. VALIDATE → Check each fact against business rules
3. UPDATE   → Store valid information in state
4. DETECT   → Check for transfer/EMI indicators
5. IDENTIFY → Find the earliest unanswered checklist item
6. ASK      → Ask only that question
```

This is the single most important design decision. It enables:
- Out-of-order information capture
- No redundant questions
- Immediate disqualification
- Seamless flow regardless of how the customer responds

---

## 3. Business Rules Implementation

### 3.1 Eligibility Decision Table

| # | Question | Eligible | Disqualify |
|---|----------|----------|------------|
| 1 | Property Type | Residential, Commercial, Industrial | Agricultural ❌ |
| 2 | Ownership | Sole, Joint | — |
| 3 | Documents | Originals available | Not available ❌ |
| 4 | Loan Amount | ≤ ₹75L | > ₹75L → Offer cap |
| 5 | Occupation + Income | Any + Bank | Cash income ❌ |
| 6 | Market Value | Capture value | No min threshold |
| 7 | Tenure | 3–15 years | <3 or >15 years ❌ |

### 3.2 Special Handling: Loan Amount > ₹75L

When the customer requests more than ₹75 lakh:
1. Explain the cap
2. Offer ₹75L as an alternative
3. If accepted → continue with ₹75L
4. If declined → end call

This is NOT a disqualification — it's a negotiation step.

### 3.3 Transfer Detection

The agent monitors for transfer triggers **at any point** during the conversation:
- "I already have a loan on this property"
- "I want to reduce my EMI"
- Any mention of existing property loan

When detected → route to specialist → end call.

---

## 4. Conversation Design Principles

### 4.1 Voice-Friendly Responses
- 1–3 sentences per response
- Warm, conversational tone
- Natural acknowledgments
- No formatting that doesn't translate to speech

### 4.2 Natural Language Understanding
The agent interprets natural speech, not just keywords:
- "Yeah, it's my house" → Residential + Sole ownership
- "I've got the papers at home" → Documents available
- "I run a small business, income goes to bank" → Self-employed + Bank income

### 4.3 Correction Handling
When the customer corrects themselves, the latest clear answer always wins:
- "It's 10 years — actually, make that 12" → tenure = 12

### 4.4 Ambiguity Resolution
Vague answers trigger clarification, not assumption:
- "I think the papers are somewhere" → Ask for confirmation

### 4.5 Diversion Handling
- Interest rate questions → defer to senior expert
- Branch location → use RAG if available, else defer
- Return to checklist after answering

---

## 5. System Prompt Structure

The prompt is organized into clearly labeled sections:

```
ROLE & OBJECTIVE
IDENTITY & LANGUAGE
CONTEXT VARIABLES
INTERNAL STATE MANAGEMENT
CALL FLOW (6 steps)
THE CORE ALGORITHM
ELIGIBILITY RULES (8 rules)
DISQUALIFICATION FLOW
OUT-OF-ORDER HANDLING
CORRECTION HANDLING
AMBIGUITY HANDLING
INTERRUPTION HANDLING
DIVERSION HANDLING
RAG KNOWLEDGE RULES
HANDOFF GATE
CALL TERMINATION RULES
NATURAL SPEECH UNDERSTANDING
EDGE CASES
STRICT PROHIBITIONS
RESPONSE FORMAT
```

Each section is self-contained and references the others where needed. This modular structure makes the prompt maintainable and testable.

---

## 6. Testing Strategy

### 6.1 Test Matrix

| # | Scenario | Expected Outcome | Tests |
|---|----------|-------------------|-------|
| TC-01 | Perfect eligible customer | QUALIFIED → Handoff | Happy path |
| TC-02 | Agricultural property | DISQUALIFIED | Property rule |
| TC-03 | Cash income | DISQUALIFIED | Income rule |
| TC-04 | No original documents | DISQUALIFIED | Document rule |
| TC-05 | Tenure < 3 years | DISQUALIFIED | Tenure min |
| TC-06 | Tenure > 15 years | DISQUALIFIED | Tenure max |
| TC-07 | Loan > ₹75L (accepts cap) | QUALIFIED | Negotiation |
| TC-08 | Joint ownership | QUALIFIED | Ownership rule |
| TC-09 | Existing loan | TRANSFER | Transfer flow |
| TC-10 | EMI reduction | TRANSFER | Transfer flow |
| TC-11 | Out-of-order answers | QUALIFIED | State mgmt |
| TC-12 | Busy customer | CALLBACK | Availability |
| TC-13 | Contradiction | DISQUALIFIED | Correction |
| TC-14 | Diversion (interest rate) | QUALIFIED | Diversion |
| TC-15 | Customer declines | DECLINED | Respect |

### 6.2 Coverage Analysis

- **All 4 disqualification paths** tested (property, documents, income, tenure)
- **Both tenure boundary conditions** tested (< 3 and > 15)
- **Loan negotiation** flow tested
- **Transfer detection** tested (both existing loan and EMI reduction)
- **Out-of-order information** capture tested
- **Diversion handling** tested
- **Busy customer** callback flow tested
- **Adversarial correction** tested
- **Customer decline** tested

---

## 7. Key Design Decisions

### Decision 1: State Machine vs. Free-form
**Chose state machine** because it provides:
- Deterministic behavior
- Clear phase transitions
- Easier testing and debugging
- Guaranteed coverage of all steps

### Decision 2: Sequential with Smart Extraction
**Ask sequentially but extract eagerly.** This means:
- We have a preferred question order (1-7)
- But we capture information from ANY response
- We only ask the NEXT missing question

### Decision 3: Immediate Disqualification
**Hard stops, not soft warnings.** When a disqualifying condition is found:
- Stop immediately
- Don't ask more questions
- Don't try to persuade

This respects both the customer's time and the business rules.

### Decision 4: No Invented Information
The agent **never** fabricates:
- Interest rates
- Market value thresholds
- Processing fees
- Any product detail not in the RAG context

### Decision 5: Handoff Gate
**ALL 7 data points** must be captured and validated before handoff. No shortcuts, no premature qualification.

---

## 8. Variable Usage

The prompt uses template variables for runtime injection:

| Variable | Usage |
|----------|-------|
| `{{agent_name}}` | Agent identity |
| `{{agent_gender}}` | Gendered language |
| `{{customer_name}}` | Personalized greeting |
| `{{company_name}}` | Company branding |
| `{{language_to_speak}}` | Conversation language |
| `{{current_date/day/time}}` | Context awareness |
| `{{additional_context_from_rag}}` | Knowledge base |
| `{{conversation_history}}` | Context continuity |
| `{{customer_utterance}}` | Current input |

---

## 9. Platform Compatibility

The system prompt is designed to work with:
- **Retell AI** — primary target
- **Bolna** — compatible
- **Any OpenAI-compatible platform** — GPT-4, Claude, etc.

The prompt uses standard markdown formatting and clearly labeled sections that any LLM can parse.

---

## 10. Conclusion

This solution goes beyond a basic questionnaire prompt. It implements:

1. **A complete state machine** with defined phases and transitions
2. **The Extract-Validate-Update-Ask algorithm** for intelligent conversation
3. **15 test scenarios** covering all paths and edge cases
4. **Explicit business rules** with no ambiguity
5. **Natural conversation design** for voice-friendly interactions
6. **Comprehensive edge case handling** for production readiness

The strongest differentiator: **"Extract first, validate second, update state third, ask the next missing question fourth."**
