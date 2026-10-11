/**
 * SalesAgent AI — Test Scenarios
 * 
 * Pre-built test scenarios covering all eligibility paths, edge cases, and business rules.
 * Each scenario contains a sequence of customer responses to simulate different outcomes.
 */

const TEST_SCENARIOS = [
    {
        id: 'TC-01',
        name: 'Perfect Eligible Customer',
        description: 'All eligibility criteria are met. Expected: Qualified → Senior Loan Expert Handoff.',
        expectedOutcome: 'QUALIFIED',
        outcomeClass: 'qualify',
        tags: ['happy-path', 'handoff'],
        customerResponses: [
            "Yes, this is Rahul.",
            "Yes, go ahead.",
            "Yes, I'm interested. Let's proceed.",
            "It's a residential property.",
            "It's solely in my name.",
            "Yes, I have the original documents.",
            "I need about ₹50 lakhs.",
            "I'm salaried, income goes to my bank account.",
            "The property is worth about ₹1 crore.",
            "10 years would be good."
        ]
    },
    {
        id: 'TC-02',
        name: 'Agricultural Property — Disqualify',
        description: 'Customer has agricultural property. Expected: Immediate disqualification after property type.',
        expectedOutcome: 'DISQUALIFIED',
        outcomeClass: 'disqualify',
        tags: ['disqualification', 'property-type'],
        customerResponses: [
            "Yes, speaking.",
            "Sure, go ahead.",
            "Yes, interested.",
            "It's agricultural land actually."
        ]
    },
    {
        id: 'TC-03',
        name: 'Cash Income — Disqualify',
        description: 'Customer earns in cash. Expected: Disqualification when cash income is revealed.',
        expectedOutcome: 'DISQUALIFIED',
        outcomeClass: 'disqualify',
        tags: ['disqualification', 'income-mode'],
        customerResponses: [
            "Yes, this is Rahul.",
            "Yes, I have time.",
            "Sure, let's proceed.",
            "It's a residential flat.",
            "Sole ownership.",
            "Yes, originals are available.",
            "I need ₹40 lakhs.",
            "I'm self-employed, most of my income is in cash."
        ]
    },
    {
        id: 'TC-04',
        name: 'No Original Documents — Disqualify',
        description: 'Customer only has photocopies. Expected: Disqualification at document check.',
        expectedOutcome: 'DISQUALIFIED',
        outcomeClass: 'disqualify',
        tags: ['disqualification', 'documents'],
        customerResponses: [
            "Yes, Rahul here.",
            "Go ahead.",
            "Yes, I'm interested.",
            "Residential property.",
            "It's jointly owned with my wife.",
            "I only have photocopies, the originals are with the bank."
        ]
    },
    {
        id: 'TC-05',
        name: 'Tenure Too Short — Disqualify',
        description: 'Customer wants 2-year tenure. Expected: Disqualification (minimum 3 years).',
        expectedOutcome: 'DISQUALIFIED',
        outcomeClass: 'disqualify',
        tags: ['disqualification', 'tenure'],
        customerResponses: [
            "Yes, speaking.",
            "Sure.",
            "Yes, let's proceed.",
            "Commercial property.",
            "Sole owner.",
            "Yes, all originals are available.",
            "₹30 lakhs.",
            "Salaried, bank income.",
            "Worth about ₹80 lakhs.",
            "I'd prefer just 2 years."
        ]
    },
    {
        id: 'TC-06',
        name: 'Tenure Too Long — Disqualify',
        description: 'Customer wants 20-year tenure. Expected: Disqualification (maximum 15 years).',
        expectedOutcome: 'DISQUALIFIED',
        outcomeClass: 'disqualify',
        tags: ['disqualification', 'tenure'],
        customerResponses: [
            "Yes, this is Rahul.",
            "Yes, go ahead.",
            "Interested.",
            "Residential house.",
            "Just in my name.",
            "Originals are at home.",
            "₹60 lakhs.",
            "I work in IT, salary credited to my bank.",
            "About ₹1.2 crore.",
            "20 years would be ideal."
        ]
    },
    {
        id: 'TC-07',
        name: 'Loan Over ₹75L — Negotiation',
        description: 'Customer wants ₹90 lakhs. Expected: Offer ₹75L cap, customer accepts.',
        expectedOutcome: 'QUALIFIED',
        outcomeClass: 'qualify',
        tags: ['negotiation', 'loan-amount', 'handoff'],
        customerResponses: [
            "Yes, Rahul speaking.",
            "Sure, I have time.",
            "Yes, go ahead.",
            "Residential apartment.",
            "Sole ownership.",
            "Yes, I have all originals.",
            "I need about ₹90 lakhs.",
            "Yes, ₹75 lakhs works for me.",
            "Self-employed, income via bank transfer.",
            "Property is worth about ₹2 crore.",
            "12 years."
        ]
    },
    {
        id: 'TC-08',
        name: 'Joint Ownership — Continue',
        description: 'Customer has joint ownership. Expected: Joint ownership is eligible, continue.',
        expectedOutcome: 'QUALIFIED',
        outcomeClass: 'qualify',
        tags: ['ownership', 'joint', 'handoff'],
        customerResponses: [
            "Yes, this is Rahul.",
            "Sure, tell me.",
            "Yes, I'm interested.",
            "Residential property.",
            "It's jointly owned with my brother.",
            "Yes, originals are available.",
            "₹40 lakhs.",
            "Salaried, income through bank.",
            "Worth ₹1 crore.",
            "7 years."
        ]
    },
    {
        id: 'TC-09',
        name: 'Existing Loan — Transfer',
        description: 'Customer has existing loan on property. Expected: Route to loan-transfer specialist.',
        expectedOutcome: 'TRANSFER',
        outcomeClass: 'transfer',
        tags: ['transfer', 'existing-loan'],
        customerResponses: [
            "Yes, speaking.",
            "Sure, go ahead.",
            "I already have a loan on this property."
        ]
    },
    {
        id: 'TC-10',
        name: 'EMI Reduction — Transfer',
        description: 'Customer wants to reduce existing EMI. Expected: Route to loan-transfer specialist.',
        expectedOutcome: 'TRANSFER',
        outcomeClass: 'transfer',
        tags: ['transfer', 'emi-reduction'],
        customerResponses: [
            "Yes, Rahul here.",
            "Yes, I have a minute.",
            "Actually, I want to reduce my existing EMI on my property loan."
        ]
    },
    {
        id: 'TC-11',
        name: 'Out-of-Order Answers',
        description: 'Customer provides multiple answers in one response. Agent should capture all and skip asked questions.',
        expectedOutcome: 'QUALIFIED',
        outcomeClass: 'qualify',
        tags: ['out-of-order', 'multi-answer', 'handoff'],
        customerResponses: [
            "Yes, this is Rahul.",
            "Yes, go ahead.",
            "I'm interested. It's my own residential house worth about ₹1.2 crore, jointly owned with my wife.",
            "Yes, original documents are available.",
            "I need around ₹40 lakhs.",
            "I'm salaried, salary goes to my bank account.",
            "10 years."
        ]
    },
    {
        id: 'TC-12',
        name: 'Busy Customer — Callback',
        description: 'Customer is busy. Expected: Schedule callback and end.',
        expectedOutcome: 'CALLBACK',
        outcomeClass: 'callback',
        tags: ['busy', 'callback'],
        customerResponses: [
            "I'm in a meeting right now.",
            "Tomorrow morning around 10 AM."
        ]
    },
    {
        id: 'TC-13',
        name: 'Contradiction — Agricultural Override',
        description: 'Customer first says residential, then corrects to agricultural. Latest answer should apply.',
        expectedOutcome: 'DISQUALIFIED',
        outcomeClass: 'disqualify',
        tags: ['adversarial', 'correction', 'edge-case'],
        customerResponses: [
            "Yes, Rahul here.",
            "Go ahead.",
            "Interested.",
            "It's residential.",
            "Actually no, it's agricultural land."
        ]
    },
    {
        id: 'TC-14',
        name: 'Diversion Handling — Interest Rate',
        description: 'Customer asks about interest rate. Agent should defer to senior expert and continue.',
        expectedOutcome: 'QUALIFIED',
        outcomeClass: 'qualify',
        tags: ['diversion', 'interest-rate'],
        customerResponses: [
            "Yes, speaking.",
            "Sure.",
            "What's the interest rate first?",
            "Can you give me a ballpark?",
            "Alright, let's proceed.",
            "Residential house.",
            "Sole owner.",
            "Originals are with me.",
            "₹50 lakhs.",
            "Salaried, bank transfer.",
            "Worth about ₹90 lakhs.",
            "8 years."
        ]
    },
    {
        id: 'TC-15',
        name: 'Customer Declines Offer',
        description: 'Customer says not interested after hearing the offer.',
        expectedOutcome: 'DECLINED',
        outcomeClass: 'disqualify',
        tags: ['declined', 'not-interested'],
        customerResponses: [
            "Yes, this is Rahul.",
            "Yes, go ahead.",
            "No, I'm not interested. Thanks."
        ]
    }
];

window.TEST_SCENARIOS = TEST_SCENARIOS;
