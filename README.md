# SalesAgent AI — Home Credit LAP Voice Agent

> **AI Intern (Prompt Engineer) Assignment Solution**  
> An intelligent, conversational AI Voice Agent for Home Credit that presents pre-approved Loan Against Property (LAP) offers, sequentially collects 7 eligibility data points, handles diversions and interruptions, immediately disqualifies ineligible applicants, detects loan-transfer opportunities, and seamlessly hands qualified leads to senior loan experts.

---

## 🌟 Executive Summary

This repository contains the complete production-grade implementation for the **SalesAgents AI - AI Intern Assignment**. The solution features:

1. **Deterministic State-Engine Core (`agent-engine.js`)**: A finite state machine implementing 6 call phases, 7 sequential eligibility checks, real-time qualification tracking, adversarial correction handling, and transfer intent detection.
2. **Comprehensive System Prompt (`system_prompt.md`)**: A voice-optimized, production-ready system prompt structured with explicit guardrails, conversation flows, business rules, out-of-order data extraction rules, and edge-case behaviors.
3. **Interactive Web Simulator (`index.html`, `app.js`, `styles.css`)**: A sleek, dark-mode web application featuring:
   - **Real-Time Voice Agent Chat Simulator** with speech synthesis, audio wave visualization, quick replies, and live qualification state sidebar.
   - **Automated Scenario Testing Suite** with 15 pre-built test cases covering all edge cases, with batch execution and real-time pass/fail metrics (100% pass rate).
   - **Live Qualification State Dashboard** showing internal state machine variables, checklist completion, and decision flags.
   - **Conversation Transcripts Manager** with instant export (Markdown, TXT, JSON).
   - **Visual Call Flow Diagram** mapping every decision node, handoff point, and disqualification branch.
   - **System Prompt Viewer** with section navigation and one-click copy.
4. **Approach Document (`APPROACH.md`)**: In-depth architectural design, rationale, business logic decision tables, and interview-readiness guide.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)

### Running Locally
To launch the interactive simulator:

```bash
# From the project root
npx -y serve . -l 3000
```

Open your browser at **`http://localhost:3000`**.

### Running the Automated Test Suite

To run all 15 test scenarios headlessly in Node.js:

```bash
node -e "
const fs = require('fs'), vm = require('vm');
global.window = global;
vm.runInThisContext(fs.readFileSync('scenarios.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('agent-engine.js', 'utf8'));
let passed = 0;
global.TEST_SCENARIOS.forEach(sc => {
  const engine = new AgentEngine(); engine.startCall();
  for (const r of sc.customerResponses) { if (!engine.state.callActive) break; engine.processCustomerInput(r); }
  const ok = engine.state.outcome === sc.expectedOutcome;
  if (ok) passed++;
  console.log((ok ? '✅ [PASS] ' : '❌ [FAIL] ') + sc.id + ': ' + sc.name + ' -> ' + engine.state.outcome);
});
console.log('\nResult: ' + passed + '/' + global.TEST_SCENARIOS.length + ' passed');
"
```

---

## 📋 Business Rules & Eligibility Logic

The agent enforces Home Credit's Loan Against Property (LAP) qualification rules across **7 checklist items**:

| # | Question / Attribute | Eligible Values | Disqualification Trigger | Special Handling |
|---|----------------------|-----------------|--------------------------|------------------|
| **Q1** | **Property Type** | Residential, Commercial, Industrial | **Agricultural property** ❌ | Immediate polite disqualification |
| **Q2** | **Ownership Status** | Sole ownership, Joint ownership | — | Joint owners are fully eligible |
| **Q3** | **Property Documents** | Originals available | **Photocopies only / originals with bank** ❌ | Disqualification (originals required) |
| **Q4** | **Loan Amount** | Up to ₹75 Lakhs | — | If > ₹75L requested: explain cap, offer ₹75L max; if accepted, continue; if declined, exit |
| **Q5** | **Occupation & Income** | Salaried or Self-Employed with Bank credit | **Cash income** ❌ | Disqualification (bank credit mandatory) |
| **Q6** | **Market Value** | Any estimated value | — | Captured for loan-to-value assessment |
| **Q7** | **Loan Tenure** | 3 to 15 Years | **< 3 years or > 15 years** ❌ | Immediate polite disqualification |

### Global Triggers Monitored at Every Turn

1. **Existing Property Loan / EMI Reduction Trigger**:
   - Any mention of an existing mortgage or intent to reduce EMIs immediately routes the customer to the **Loan-Transfer Specialist**.
2. **Customer Busy / Meeting**:
   - Offer a callback, capture the preferred day/time, confirm, and end call cleanly.
3. **Not Interested / Opt-Out**:
   - Acknowledge warmly, respect customer preference, and exit without being pushy.
4. **Interest Rate Questions (Diversion)**:
   - Acknowledge transparently: explain that the exact rate is customized by the Senior Loan Expert after preliminary qualification. Defer without quoting unverified numbers, and steer back to the current checklist question.

---

## 🧪 Automated Test Suite (15 Test Scenarios)

The test suite thoroughly evaluates all business logic and edge cases:

| Scenario ID | Test Case Name | Category | Expected Outcome | Actual Result |
|-------------|----------------|----------|------------------|---------------|
| **TC-01** | Perfect Eligible Customer | Happy Path | `QUALIFIED` | ✅ **PASS** |
| **TC-02** | Agricultural Property | Disqualification | `DISQUALIFIED` | ✅ **PASS** |
| **TC-03** | Cash Income | Disqualification | `DISQUALIFIED` | ✅ **PASS** |
| **TC-04** | No Original Documents | Disqualification | `DISQUALIFIED` | ✅ **PASS** |
| **TC-05** | Tenure Too Short (< 3 yrs) | Disqualification | `DISQUALIFIED` | ✅ **PASS** |
| **TC-06** | Tenure Too Long (> 15 yrs) | Disqualification | `DISQUALIFIED` | ✅ **PASS** |
| **TC-07** | Loan Over ₹75L (Cap Negotiation) | Negotiation | `QUALIFIED` | ✅ **PASS** |
| **TC-08** | Joint Ownership | Happy Path | `QUALIFIED` | ✅ **PASS** |
| **TC-09** | Existing Loan on Property | Loan Transfer | `TRANSFER` | ✅ **PASS** |
| **TC-10** | EMI Reduction Request | Loan Transfer | `TRANSFER` | ✅ **PASS** |
| **TC-11** | Out-of-Order Multi-Answers | Natural Flow | `QUALIFIED` | ✅ **PASS** |
| **TC-12** | Busy Customer (Callback Scheduling) | Availability | `CALLBACK` | ✅ **PASS** |
| **TC-13** | Contradiction (Agricultural Override) | Adversarial | `DISQUALIFIED` | ✅ **PASS** |
| **TC-14** | Diversion Handling (Interest Rate Inquiry) | Diversion | `QUALIFIED` | ✅ **PASS** |
| **TC-15** | Customer Declines Offer | Opt-Out | `DECLINED` | ✅ **PASS** |

**Test Pass Rate: 15 / 15 (100%)**

---

## 🏗 Architecture & The Core Algorithm

```
                             [ INCOMING CALL ]
                                    │
                                    ▼
                             1. GREETING & ID
                                    │
                         ┌──────────┴──────────┐
                    Wrong Number            Verified
                         │                     │
                         ▼                     ▼
                     [ END ]            2. AVAILABILITY
                                               │
                                    ┌──────────┴──────────┐
                                  Busy                  Available
                                    │                     │
                                    ▼                     ▼
                              [ CALLBACK ]         3. PRESENT OFFER
                                                          │
                         ┌────────────────────────────────┼────────────────┐
                     Declined                      Transfer Intent    Interested
                         │                                │                │
                         ▼                                ▼                ▼
                      [ END ]                        [ TRANSFER ]    4. ELIGIBILITY
                                                                           │
               ┌───────────────────────────────────────────────────────────┴────────────────────────┐
               ▼                                                           ▼                        ▼
       [ EXTRACT ALL DATA ]                                      [ CHECK DISQUALIFY ]       [ CHECK ALL ANSWERED ]
   - Parse all 7 fields in turn                                  - Agri property?                   │
   - Prioritize negative cues                                    - No originals?             ┌──────┴──────┐
   - Disambiguate amount vs value                                - Cash income?             Yes            No
                                                                 - Tenure <3 or >15?         │              │
                                                                           │                 ▼              ▼
                                                                     ┌─────┴─────┐     [ QUALIFIED ]   [ ASK EARLIEST ]
                                                                    Yes          No          │          [ MISSING Q ]
                                                                     │           │           ▼
                                                                     ▼           └───► [ HANDOFF TO EXPERT ]
                                                               [ DISQUALIFIED ]
```

### The 6-Step Extraction Pipeline (Executed Every Turn)

1. **EXTRACT**: Parse customer response for **all 7 checklist facts** (capturing out-of-order answers provided in advance).
2. **VALIDATE**: Compare each extracted fact against the business rules table.
3. **UPDATE**: Store valid values in the internal qualification state.
4. **DETECT**: Check for loan transfer / EMI reduction cues or diversions.
5. **IDENTIFY**: Find the earliest unanswered checklist item (`propertyType`, `ownershipStatus`, `documentsAvailable`, `loanAmount`, `occupation`/`incomeMode`, `marketValue`, `tenure`).
6. **ASK**: Ask only the earliest missing question in natural, voice-friendly prose.

---

## 📁 Repository Structure

```
SalesAgent/
├── index.html          # Main web application dashboard & simulator interface
├── styles.css          # Premium dark-theme CSS design system
├── app.js              # Application controller, view switching, audio & event handling
├── agent-engine.js     # Deterministic conversation engine & state machine
├── scenarios.js        # 15 comprehensive test scenario definitions
├── system_prompt.md    # Production-ready system prompt for LLM voice agents
├── APPROACH.md         # Detailed methodology, architecture, and design document
└── README.md           # Project documentation and user guide
```

---

## 🎯 Alignment with Assignment Rubric

| Rubric Dimension | Implementation Details |
|------------------|------------------------|
| **Eligibility Rules Accuracy** | All 7 criteria enforced; strict immediate disqualification for agricultural land, cash income, missing original documents, and invalid tenures. |
| **Out-of-Order Handling** | Full entity extraction on every turn; previously answered items are never re-asked. |
| **Adversarial / Contradiction** | The latest explicit customer statement overrides previous assumptions (verified in TC-13). |
| **Loan Cap Negotiation** | Requests exceeding ₹75L gracefully trigger the cap explanation and alternative offer rather than immediate disqualification. |
| **Voice-Agent Tone & Economy** | Concise, warm, conversational responses (1–3 sentences), suitable for low-latency voice synthesis without confusing markdown. |
| **Testing & Robustness** | 15 automated test cases with 100% pass rate, interactive web UI simulator, and reproducible CLI test script. |

---

*Developed for the SalesAgents AI - AI Intern (Prompt Engineer) Assessment.*
