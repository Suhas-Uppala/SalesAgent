/**
 * SalesAgent AI — Agent Engine
 * 
 * Deterministic conversation engine that simulates the AI Voice Agent.
 * Implements state management, eligibility rules, and conversation flow.
 */

class AgentEngine {
    constructor(config = {}) {
        this.config = {
            agentName: config.agentName || 'Priya',
            agentGender: config.agentGender || 'Female',
            customerName: config.customerName || 'Rahul Sharma',
            companyName: config.companyName || 'Home Credit',
            language: config.language || 'English',
            ...config
        };

        this.reset();
    }

    reset() {
        this.state = {
            // Call status
            callActive: false,
            callPhase: 'INIT', // INIT, GREETING, VERIFICATION, AVAILABILITY, OFFER, TRANSFER_CHECK, ELIGIBILITY, DECISION, HANDOFF, ENDED
            customerVerified: 'UNKNOWN',
            customerAvailable: 'UNKNOWN',
            offerPresented: false,
            interestConfirmed: 'UNKNOWN',

            // Eligibility data
            propertyType: 'UNKNOWN',
            ownershipStatus: 'UNKNOWN',
            documentsAvailable: 'UNKNOWN',
            loanAmount: 'UNKNOWN',
            occupation: 'UNKNOWN',
            incomeMode: 'UNKNOWN',
            marketValue: 'UNKNOWN',
            tenure: 'UNKNOWN',

            // Decision flags
            existingPropertyLoan: false,
            emiReductionRequest: false,
            disqualified: false,
            disqualificationReason: null,
            transferRequired: false,
            allQuestionsAnswered: false,
            callbackTime: null,

            // Current question being asked
            currentQuestion: null,
            // Which eligibility question index we're on (1-7)
            currentEligibilityIndex: 0,

            // Outcome
            outcome: null, // QUALIFIED, DISQUALIFIED, TRANSFER, CALLBACK, DECLINED, ENDED
        };

        this.conversationHistory = [];
        this.nextQuickReplies = [];
    }

    startCall() {
        this.state.callActive = true;
        this.state.callPhase = 'GREETING';

        const greeting = `Hello! Am I speaking with ${this.config.customerName}? Hi, this is ${this.config.agentName} calling from ${this.config.companyName}. How are you doing today?`;

        this.addToHistory('agent', greeting);
        this.nextQuickReplies = [
            `Yes, this is ${this.config.customerName.split(' ')[0]}.`,
            'Who is calling?',
            "I'm busy right now.",
            "No, wrong number."
        ];

        return {
            message: greeting,
            quickReplies: this.nextQuickReplies,
            stateUpdate: { ...this.state }
        };
    }

    processCustomerInput(input) {
        if (!this.state.callActive) {
            return { message: 'Call has ended.', quickReplies: [], stateUpdate: { ...this.state } };
        }

        this.addToHistory('customer', input);

        const normalizedInput = input.toLowerCase().trim();

        // First: check for transfer triggers at any point
        if (this.state.callPhase !== 'ENDED' && this.detectTransferIntent(normalizedInput)) {
            return this.handleTransfer(normalizedInput);
        }

        // Route to the appropriate phase handler
        switch (this.state.callPhase) {
            case 'GREETING':
                return this.handleGreeting(normalizedInput, input);
            case 'VERIFICATION':
                return this.handleVerification(normalizedInput, input);
            case 'AVAILABILITY':
                return this.handleAvailability(normalizedInput, input);
            case 'OFFER':
                return this.handleOffer(normalizedInput, input);
            case 'ELIGIBILITY':
                return this.handleEligibility(normalizedInput, input);
            case 'LOAN_AMOUNT_NEGOTIATION':
                return this.handleLoanNegotiation(normalizedInput, input);
            default:
                return this.generateResponse('I appreciate your time. Is there anything else I can help with?', []);
        }
    }

    // ==========================================
    // PHASE HANDLERS
    // ==========================================

    handleGreeting(input, original) {
        // Check if they confirm identity
        if (this.matchesAny(input, ['yes', 'speaking', 'this is', 'that\'s me', 'haan', 'ha ji', 'myself', 'i am', `i'm ${this.config.customerName.split(' ')[0].toLowerCase()}`])) {
            this.state.customerVerified = 'TRUE';
            this.state.callPhase = 'AVAILABILITY';

            const response = `Great! Thank you, ${this.config.customerName.split(' ')[0]}. I hope I'm not catching you at a bad time. Do you have a couple of minutes to talk?`;

            return this.generateResponse(response, [
                'Yes, sure. Go ahead.',
                "I'm in a meeting, can you call later?",
                'What is this regarding?'
            ]);
        }

        // Wrong number
        if (this.matchesAny(input, ['wrong number', 'not here', 'wrong person', 'no one by that name'])) {
            this.state.customerVerified = 'FALSE';
            return this.endCall(`I apologize for the inconvenience. It seems I have the wrong number. Thank you for your time. Have a good day!`, 'ENDED');
        }

        // Who is calling?
        if (this.matchesAny(input, ['who is', 'who are you', 'which company', 'where from', 'why calling', 'what is this about', 'purpose'])) {
            this.state.callPhase = 'VERIFICATION';
            const response = `Of course! I'm ${this.config.agentName} from ${this.config.companyName}. We're reaching out to some of our valued customers regarding a special financial offer. Could you confirm if I'm speaking with ${this.config.customerName}?`;

            return this.generateResponse(response, [
                `Yes, I'm ${this.config.customerName.split(' ')[0]}.`,
                "No, wrong number.",
                "What kind of offer?"
            ]);
        }

        // Busy
        if (this.matchesAny(input, ['busy', 'meeting', 'driving', 'can\'t talk', 'not now', 'later', 'call back', 'call me later'])) {
            this.state.customerAvailable = 'FALSE';
            this.state.callPhase = 'AVAILABILITY';
            const response = `Certainly, I completely understand. What would be a convenient time for us to call you back?`;

            return this.generateResponse(response, [
                'Tomorrow morning around 10 AM.',
                'This evening after 6 PM.',
                'Maybe this weekend.',
                "Don't call me again."
            ]);
        }

        // Default — assume positive
        this.state.customerVerified = 'TRUE';
        this.state.callPhase = 'AVAILABILITY';
        const response = `Thank you! I hope I'm not catching you at a bad time. Do you have a couple of minutes for a quick chat?`;

        return this.generateResponse(response, [
            'Yes, go ahead.',
            "I'm busy right now.",
            'What is this about?'
        ]);
    }

    handleVerification(input, original) {
        if (this.matchesAny(input, ['yes', 'speaking', 'that\'s me', 'i am', 'correct', 'right'])) {
            this.state.customerVerified = 'TRUE';
            this.state.callPhase = 'AVAILABILITY';
            const response = `Wonderful! Thank you for confirming. Do you have a couple of minutes to hear about something that could be really beneficial for you?`;

            return this.generateResponse(response, [
                'Sure, tell me.',
                "I'm a bit busy.",
                'What kind of benefit?'
            ]);
        }

        if (this.matchesAny(input, ['no', 'wrong', 'not me'])) {
            return this.endCall(`I apologize for the confusion. Thank you for your time. Have a good day!`, 'ENDED');
        }

        // Handle "what kind of offer?"
        if (this.matchesAny(input, ['offer', 'what kind', 'tell me more'])) {
            const response = `It's regarding a special pre-approved loan offer for our valued customers. But first, may I confirm — am I speaking with ${this.config.customerName}?`;
            return this.generateResponse(response, [
                `Yes, this is ${this.config.customerName.split(' ')[0]}.`,
                'No, wrong number.'
            ]);
        }

        // Default
        const response = `Could you confirm if I'm speaking with ${this.config.customerName}?`;
        return this.generateResponse(response, [
            `Yes, I am ${this.config.customerName.split(' ')[0]}.`,
            'No, wrong person.'
        ]);
    }

    handleAvailability(input, original) {
        // Customer is busy
        if (this.matchesAny(input, ['busy', 'meeting', 'driving', 'can\'t talk', 'not now', 'later', 'call back', 'call me later', 'call later'])) {
            if (this.state.customerAvailable === 'FALSE') {
                // Already asked, capture callback time from this input
                const time = this.extractCallbackTime(input);
                if (time) {
                    this.state.callbackTime = time;
                    return this.endCall(`Perfect, I'll note that down. We'll call you back ${time}. Thank you for your time, ${this.config.customerName.split(' ')[0]}. Have a great day!`, 'CALLBACK');
                }
            }
            this.state.customerAvailable = 'FALSE';
            const response = `Absolutely, I understand. When would be a good time for us to call you back?`;
            return this.generateResponse(response, [
                'Tomorrow morning around 10 AM.',
                'This evening after 6 PM.',
                'Maybe this weekend.',
                "Don't call me again."
            ]);
        }

        // Don't call again
        if (this.matchesAny(input, ['don\'t call', 'stop calling', 'not interested', 'remove my number'])) {
            return this.endCall(`I completely understand and respect your preference. We won't disturb you again. Thank you, ${this.config.customerName.split(' ')[0]}. Have a wonderful day!`, 'DECLINED');
        }

        // Callback time provided
        if (this.state.customerAvailable === 'FALSE') {
            const time = this.extractCallbackTime(input) || original;
            this.state.callbackTime = time;
            return this.endCall(`Perfect. We'll call you back ${time}. Thank you for your time, ${this.config.customerName.split(' ')[0]}. Have a great day!`, 'CALLBACK');
        }

        // Available
        if (this.matchesAny(input, ['yes', 'sure', 'go ahead', 'tell me', 'okay', 'fine', 'proceed', 'haan', 'boliye'])) {
            this.state.customerAvailable = 'TRUE';
            this.state.callPhase = 'OFFER';

            const response = `Excellent! The reason I'm calling is that as one of our valued ${this.config.companyName} customers, you've been selected for a special pre-approved Loan Against Property offer of up to ₹75 lakhs. I'd just like to ask a few quick questions to check the preliminary eligibility. Shall we proceed?`;

            this.state.offerPresented = true;
            return this.generateResponse(response, [
                "Yes, I'm interested. Let's proceed.",
                "I already have a loan on my property.",
                "What's the interest rate?",
                "No, I'm not interested."
            ]);
        }

        // What is this about?
        if (this.matchesAny(input, ['what', 'about', 'regarding', 'tell me', 'purpose'])) {
            this.state.customerAvailable = 'TRUE';
            this.state.callPhase = 'OFFER';

            const response = `Of course! As one of our loyal customers at ${this.config.companyName}, you've been selected for a special pre-approved Loan Against Property offer of up to ₹75 lakhs. I'd just like to ask a few quick questions to see if this offer suits you. Would you like to proceed?`;

            this.state.offerPresented = true;
            return this.generateResponse(response, [
                'Sure, go ahead.',
                'What interest rate?',
                "Not interested, thanks.",
                'I want to reduce my existing EMI.'
            ]);
        }

        // Default — treat as available
        this.state.customerAvailable = 'TRUE';
        this.state.callPhase = 'OFFER';
        const response = `Thank you! The reason for my call — as a valued ${this.config.companyName} customer, you've been selected for a pre-approved Loan Against Property offer of up to ₹75 lakhs. I'd like to run through a few quick eligibility questions. Shall we get started?`;
        this.state.offerPresented = true;

        return this.generateResponse(response, [
            'Yes, let\'s go.',
            'Tell me more first.',
            'Not interested.'
        ]);
    }

    handleOffer(input, original) {
        // 1. Not interested / decline first
        if (this.matchesAny(input, ['not interested', 'no thanks', 'don\'t want', 'no need', 'not now', 'no, not interested', 'nah', 'no i am not interested', 'no i\'m not interested'])) {
            return this.endCall(`I completely understand, ${this.config.customerName.split(' ')[0]}. If you change your mind in the future, please don't hesitate to reach out to us. Thank you for your time, and have a wonderful day!`, 'DECLINED');
        }

        // 2. Interest rate questions (diversion) — specifically rate, NOT generic "interested"
        if (this.matchesAny(input, ['interest rate', 'rate of interest', 'what rate', 'what is the rate', 'what\'s the rate', 'how much rate', 'how much interest', 'roi', 'byaj'])) {
            const response = `That's a great question! The exact interest rate will be determined by our senior loan expert based on your specific profile, after this preliminary qualification. For now, shall we proceed with a few quick eligibility questions?`;
            return this.generateResponse(response, [
                'Okay, go ahead.',
                'Can you give me a ballpark?',
                'Not interested without knowing the rate.'
            ]);
        }

        // 3. Ballpark rate
        if (this.matchesAny(input, ['ballpark', 'approximate', 'rough idea', 'roughly'])) {
            const response = `I understand you'd like an estimate. However, the rate depends on several factors like your profile and property details, which our senior loan expert will customize for you. Let me first check your preliminary eligibility — shall we proceed?`;
            return this.generateResponse(response, [
                'Alright, let\'s proceed.',
                'Not interested.'
            ]);
        }

        // 4. Without knowing rate — not interested
        if (this.matchesAny(input, ['without knowing', 'need to know rate first'])) {
            return this.endCall(`I understand your concern. I'd recommend speaking with our team directly for rate details. You can reach out to ${this.config.companyName} customer service anytime. Thank you for your time, ${this.config.customerName.split(' ')[0]}!`, 'DECLINED');
        }

        // 5. Interested — move to eligibility
        if (this.matchesAny(input, ['yes', 'sure', 'go ahead', 'interested', 'proceed', 'let\'s', 'okay', 'fine', 'tell me', 'alright', 'haan', 'theek hai'])) {
            this.state.interestConfirmed = 'TRUE';
            this.state.callPhase = 'ELIGIBILITY';
            this.state.currentEligibilityIndex = 1;

            // Before asking Q1, extract any information already provided
            this.extractAllEligibilityInfo(input, original);

            if (this.state.disqualified) {
                return this.handleDisqualification();
            }
            if (this.checkAllAnswered()) {
                return this.handleQualified();
            }

            return this.askNextEligibilityQuestion();
        }

        // Default — try to move forward
        this.extractAllEligibilityInfo(input, original);
        if (this.hasAnyEligibilityData()) {
            this.state.interestConfirmed = 'TRUE';
            this.state.callPhase = 'ELIGIBILITY';
            this.state.currentEligibilityIndex = 1;

            if (this.state.disqualified) {
                return this.handleDisqualification();
            }
            if (this.checkAllAnswered()) {
                return this.handleQualified();
            }

            return this.askNextEligibilityQuestion();
        }

        const response = `Would you like to proceed with the quick eligibility check? It'll only take a couple of minutes.`;
        return this.generateResponse(response, [
            'Sure, go ahead.',
            'Not interested, thanks.'
        ]);
    }

    handleEligibility(input, original) {
        // Extract ALL information from the response
        this.extractAllEligibilityInfo(input, original);

        // Handle diversions
        if (this.matchesAny(input, ['interest rate', 'rate of interest', 'what rate', 'roi'])) {
            const response = `The exact interest rate will be shared by our senior loan expert after the preliminary qualification. Shall we continue? `;
            const nextQ = this.getNextMissingQuestion();
            if (nextQ) {
                return this.generateResponse(response + nextQ.question, nextQ.quickReplies);
            }
        }

        // Handle "what documents do you need" diversion
        if (this.matchesAny(input, ['what documents', 'which documents', 'what papers'])) {
            const response = `Great question! We would need the original sale deed and related property documents for verification. `;
            const nextQ = this.getNextMissingQuestion();
            if (nextQ) {
                return this.generateResponse(response + nextQ.question, nextQ.quickReplies);
            }
        }

        // Check for disqualification after extraction
        if (this.state.disqualified) {
            return this.handleDisqualification();
        }

        // Check if all questions answered
        if (this.checkAllAnswered()) {
            return this.handleQualified();
        }

        // Ask next missing question
        return this.askNextEligibilityQuestion();
    }

    handleLoanNegotiation(input, original) {
        if (this.matchesAny(input, ['yes', 'sure', 'okay', 'fine', 'proceed', 'alright', 'that works', 'go ahead', 'let\'s do that', '75'])) {
            this.state.loanAmount = '₹75,00,000';
            this.state.callPhase = 'ELIGIBILITY';

            // Check if all answered now
            if (this.checkAllAnswered()) {
                return this.handleQualified();
            }

            const response = `Great, I've noted that as ₹75 lakhs. `;
            const nextQ = this.getNextMissingQuestion();
            if (nextQ) {
                return this.generateResponse(response + nextQ.question, nextQ.quickReplies);
            }
        }

        if (this.matchesAny(input, ['no', 'not interested', 'that\'s too low', 'forget it', 'never mind'])) {
            return this.endCall(`I understand. If your requirements change in the future, please don't hesitate to reach out to us at ${this.config.companyName}. Thank you for your time, ${this.config.customerName.split(' ')[0]}. Have a good day!`, 'DECLINED');
        }

        const response = `Just to confirm — would you like to proceed with the maximum eligible amount of ₹75 lakhs?`;
        return this.generateResponse(response, [
            'Yes, that works.',
            "No, I'll pass."
        ]);
    }

    // ==========================================
    // TRANSFER & DISQUALIFICATION
    // ==========================================

    detectTransferIntent(input) {
        const transferPatterns = [
            'already have a loan', 'existing loan', 'loan on this property',
            'loan on my property', 'property loan', 'paying emi', 'reduce my emi',
            'reduce emi', 'lower my emi', 'lower emi', 'reduce my existing emi',
            'reduce existing emi', 'transfer my loan', 'loan transfer',
            'balance transfer', 'refinance', 'better rate on my current',
            'already mortgaged', 'existing mortgage'
        ];
        if (this.matchesAny(input, transferPatterns)) return true;

        const hasExisting = this.matchesAny(input, ['existing', 'already', 'current']);
        const hasLoanOrEmi = this.matchesAny(input, ['loan', 'emi', 'mortgage']);
        const hasReduction = this.matchesAny(input, ['reduce', 'lower', 'decrease', 'cut', 'transfer']);

        if (hasReduction && this.matchesAny(input, ['emi', 'rate'])) return true;
        if (hasExisting && hasLoanOrEmi && (hasReduction || this.matchesAny(input, ['property', 'home']))) return true;

        return false;
    }

    handleTransfer(input) {
        if (this.matchesAny(input, ['reduce', 'emi', 'lower'])) {
            this.state.emiReductionRequest = true;
        }
        this.state.existingPropertyLoan = true;
        this.state.transferRequired = true;

        const response = `Thank you for sharing that, ${this.config.customerName.split(' ')[0]}. Since you have an existing loan on the property, this would be handled by our specialized loan-transfer team. A loan-transfer specialist will contact you shortly to discuss the best options available for you. Thank you for your time and have a great day!`;

        return this.endCall(response, 'TRANSFER');
    }

    handleDisqualification() {
        let reason = '';
        let response = '';

        switch (this.state.disqualificationReason) {
            case 'AGRICULTURAL_PROPERTY':
                response = `I appreciate you sharing that, ${this.config.customerName.split(' ')[0]}. Unfortunately, agricultural properties are not covered under this particular offer at the moment. However, I'd encourage you to stay in touch with us as our product offerings evolve. Thank you for your time!`;
                break;
            case 'NO_ORIGINAL_DOCUMENTS':
                response = `I understand, ${this.config.customerName.split(' ')[0]}. For this offer, original property documents are required for the verification process. If you're able to arrange them in the future, please don't hesitate to reach out. Thank you for your time!`;
                break;
            case 'CASH_INCOME':
                response = `Thank you for that information. For this particular offer, the income needs to be routed through a bank account. If your income arrangement changes in the future, we'd be happy to assist you. Thank you for your time, ${this.config.customerName.split(' ')[0]}!`;
                break;
            case 'TENURE_TOO_SHORT':
                response = `I see. This offer is available for tenures between 3 and 15 years. Unfortunately, a tenure shorter than 3 years falls outside the eligible range for this product. Thank you for your time, ${this.config.customerName.split(' ')[0]}!`;
                break;
            case 'TENURE_TOO_LONG':
                response = `I see. This offer is available for tenures between 3 and 15 years. Unfortunately, a tenure exceeding 15 years falls outside the eligible range for this product. Thank you for your time, ${this.config.customerName.split(' ')[0]}!`;
                break;
            default:
                response = `Thank you for your time, ${this.config.customerName.split(' ')[0]}. Unfortunately, based on the information provided, this particular offer may not be the best fit at this time. If your circumstances change, please don't hesitate to reach out. Have a wonderful day!`;
        }

        return this.endCall(response, 'DISQUALIFIED');
    }

    handleQualified() {
        const response = `Wonderful, ${this.config.customerName.split(' ')[0]}! Based on the information you've shared, you meet the preliminary eligibility criteria for our Loan Against Property offer. A senior loan expert from our team will be reaching out to you shortly to discuss the exact terms, interest rates, and next steps. Is there anything else you'd like to know before we wrap up?`;

        this.state.outcome = 'QUALIFIED';
        this.state.callPhase = 'HANDOFF';

        this.addToHistory('agent', response);
        this.state.callActive = false;
        this.state.callPhase = 'ENDED';

        return {
            message: response,
            quickReplies: [],
            stateUpdate: { ...this.state },
            systemMessage: { type: 'success', text: '✅ Customer QUALIFIED — Handoff to Senior Loan Expert' },
            callEnded: true
        };
    }

    // ==========================================
    // ELIGIBILITY EXTRACTION
    // ==========================================

    extractAllEligibilityInfo(input, original) {
        const normalizedInput = input.toLowerCase();

        // Property Type
        if (this.state.propertyType === 'UNKNOWN') {
            if (this.matchesAny(normalizedInput, ['agricultural', 'farm', 'farmland', 'agriculture', 'khet', 'zameen'])) {
                this.state.propertyType = 'Agricultural';
                this.state.disqualified = true;
                this.state.disqualificationReason = 'AGRICULTURAL_PROPERTY';
                return;
            } else if (this.matchesAny(normalizedInput, ['residential', 'house', 'flat', 'apartment', 'villa', 'my home', 'my house'])) {
                this.state.propertyType = 'Residential';
            } else if (this.matchesAny(normalizedInput, ['commercial', 'office', 'shop', 'showroom'])) {
                this.state.propertyType = 'Commercial';
            } else if (this.matchesAny(normalizedInput, ['industrial', 'factory', 'warehouse', 'godown'])) {
                this.state.propertyType = 'Industrial';
            }
        } else {
            // Check for correction — any mention of agricultural overrides
            if (this.matchesAny(normalizedInput, ['agricultural', 'farm', 'farmland', 'agriculture', 'khet', 'zameen'])) {
                this.state.propertyType = 'Agricultural';
                this.state.disqualified = true;
                this.state.disqualificationReason = 'AGRICULTURAL_PROPERTY';
                return;
            }
        }

        // Ownership
        if (this.state.ownershipStatus === 'UNKNOWN') {
            if (this.matchesAny(normalizedInput, ['joint', 'jointly', 'co-owned', 'wife', 'husband', 'brother', 'father', 'mother', 'sister', 'spouse', 'partner', 'shared'])) {
                this.state.ownershipStatus = 'Joint';
            } else if (this.matchesAny(normalizedInput, ['sole', 'only mine', 'my name only', 'single owner', 'i own it', 'my own', 'it\'s mine', 'solely', 'only my name'])) {
                this.state.ownershipStatus = 'Sole';
            }
        }

        // Documents (negative check FIRST)
        if (this.state.documentsAvailable === 'UNKNOWN') {
            if (this.matchesAny(normalizedInput, ['photocopy', 'photocopies', 'xerox', 'don\'t have original', 'no original', 'lost', 'not available', 'only copies', 'with the bank', 'bank has the original', 'only have photocopy'])) {
                this.state.documentsAvailable = 'FALSE';
                this.state.disqualified = true;
                this.state.disqualificationReason = 'NO_ORIGINAL_DOCUMENTS';
                return;
            } else if (this.matchesAny(normalizedInput, ['original', 'originals available', 'have the papers', 'have the documents', 'yes i have', 'papers at home', 'available at home', 'documents available', 'have them', 'got the original', 'originals are with me', 'can arrange', 'all documents', 'all papers'])) {
                this.state.documentsAvailable = 'TRUE';
            }
        }

        // Loan Amount & Market Value
        let marketMatch = normalizedInput.match(/(?:worth|value|valued\s*at|market\s*value|property\s*value|costs?|price)\s*(?:is|about|around|approx|approximately|of)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lakhs|lac|lacs)?/i);
        let loanMatch = normalizedInput.match(/(?:need|require|looking\s*for|want|loan\s*of|amount\s*of|borrow)\s*(?:about|around|approx)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lakhs|lac|lacs)?/i);

        if (this.state.marketValue === 'UNKNOWN') {
            if (marketMatch) {
                let mVal = parseFloat(marketMatch[1]);
                let unit = marketMatch[2] ? marketMatch[2].toLowerCase() : '';
                if (unit === 'crore' || unit === 'cr') mVal *= 10000000;
                else if (unit.startsWith('lak') || unit.startsWith('lac')) mVal *= 100000;
                else if (mVal < 100) mVal *= 10000000; // e.g. "worth 1.2"
                this.state.marketValue = this.formatAmount(mVal);
            } else if (this.state.currentQuestion === 'marketValue') {
                const amount = this.extractAmount(normalizedInput);
                if (amount !== null) this.state.marketValue = this.formatAmount(amount);
            }
        }

        if (this.state.loanAmount === 'UNKNOWN') {
            let amount = null;
            if (loanMatch) {
                let lVal = parseFloat(loanMatch[1]);
                let unit = loanMatch[2] ? loanMatch[2].toLowerCase() : '';
                if (unit === 'crore' || unit === 'cr') lVal *= 10000000;
                else if (unit.startsWith('lak') || unit.startsWith('lac')) lVal *= 100000;
                else if (lVal < 100) lVal *= 100000; // e.g. "need 40"
                amount = lVal;
            } else if (this.state.currentQuestion === 'loanAmount') {
                amount = this.extractAmount(normalizedInput);
            } else if (!marketMatch) {
                // General amount check only if not attributed to market value
                amount = this.extractAmount(normalizedInput);
            }

            if (amount !== null) {
                if (amount > 7500000) {
                    this.state.loanAmount = 'OVER_LIMIT';
                    this.state.callPhase = 'LOAN_AMOUNT_NEGOTIATION';
                } else {
                    this.state.loanAmount = this.formatAmount(amount);
                }
            }
        }

        // Occupation
        if (this.state.occupation === 'UNKNOWN') {
            if (this.matchesAny(normalizedInput, ['salaried', 'salary', 'job', 'employed', 'service', 'private job', 'government', 'govt', 'working in', 'work at', 'naukri'])) {
                this.state.occupation = 'Salaried';
            } else if (this.matchesAny(normalizedInput, ['self-employed', 'self employed', 'business', 'freelance', 'own business', 'entrepreneur', 'consultant', 'apna kaam', 'vyapaar', 'businessman', 'startup', 'run a'])) {
                this.state.occupation = 'Self-employed';
            }
        }

        // Income Mode
        if (this.state.incomeMode === 'UNKNOWN') {
            if (this.matchesAny(normalizedInput, ['cash', 'mostly cash', 'paid in cash', 'cash income', 'naqad', 'naqdi'])) {
                this.state.incomeMode = 'Cash';
                this.state.disqualified = true;
                this.state.disqualificationReason = 'CASH_INCOME';
                return;
            } else if (this.matchesAny(normalizedInput, ['bank', 'bank transfer', 'bank account', 'direct deposit', 'salary account', 'credited to bank', 'account me', 'bank me', 'neft', 'rtgs', 'transfer'])) {
                this.state.incomeMode = 'Bank';
            }
        }

        // Market Value general fallback if asked
        if (this.state.marketValue === 'UNKNOWN') {
            if (this.matchesAny(normalizedInput, ['worth', 'value', 'market value', 'valued at', 'costs', 'price'])) {
                const amount = this.extractAmount(normalizedInput);
                if (amount !== null) {
                    this.state.marketValue = this.formatAmount(amount);
                }
            }
        }

        // Tenure
        if (this.state.tenure === 'UNKNOWN') {
            const tenureMatch = normalizedInput.match(/(\d+)\s*(?:year|yr|sal|saal)/);
            if (tenureMatch) {
                const years = parseInt(tenureMatch[1]);
                if (years < 3) {
                    this.state.tenure = `${years} years`;
                    this.state.disqualified = true;
                    this.state.disqualificationReason = 'TENURE_TOO_SHORT';
                    return;
                } else if (years > 15) {
                    this.state.tenure = `${years} years`;
                    this.state.disqualified = true;
                    this.state.disqualificationReason = 'TENURE_TOO_LONG';
                    return;
                } else {
                    this.state.tenure = `${years} years`;
                }
            }
        }
    }

    extractAmount(input) {
        // Handle crore
        let match = input.match(/(\d+(?:\.\d+)?)\s*(?:crore|cr)/);
        if (match) return parseFloat(match[1]) * 10000000;

        // Handle lakh/lac
        match = input.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)/);
        if (match) return parseFloat(match[1]) * 100000;

        // Handle ₹ with commas
        match = input.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/);
        if (match) return parseFloat(match[1].replace(/,/g, ''));

        // Handle plain large numbers
        match = input.match(/(\d{5,})/);
        if (match) return parseFloat(match[1]);

        return null;
    }

    formatAmount(amount) {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)} Cr`;
        }
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)} L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    }

    extractCallbackTime(input) {
        if (this.matchesAny(input, ['tomorrow morning', 'kal subah'])) return 'tomorrow morning';
        if (this.matchesAny(input, ['tomorrow evening', 'kal shaam'])) return 'tomorrow evening';
        if (this.matchesAny(input, ['tomorrow', 'kal'])) return 'tomorrow';
        if (this.matchesAny(input, ['evening', 'shaam', 'after 6', 'after six'])) return 'this evening';
        if (this.matchesAny(input, ['morning', 'subah', 'after 10', 'around 10'])) return 'tomorrow morning around 10 AM';
        if (this.matchesAny(input, ['weekend', 'saturday', 'sunday'])) return 'this weekend';
        if (this.matchesAny(input, ['afternoon', 'dopahar', 'after lunch'])) return 'tomorrow afternoon';

        const timeMatch = input.match(/(\d{1,2})\s*(am|pm|o'clock)/i);
        if (timeMatch) return `at ${timeMatch[1]} ${timeMatch[2].toUpperCase()}`;

        return null;
    }

    // ==========================================
    // QUESTION LOGIC
    // ==========================================

    getNextMissingQuestion() {
        const questions = [
            {
                key: 'propertyType',
                question: `Could you tell me what type of property you're looking to use? For example, is it residential, commercial, or industrial?`,
                quickReplies: ['It\'s a residential property.', 'It\'s a commercial property.', 'It\'s industrial.', 'It\'s agricultural land.']
            },
            {
                key: 'ownershipStatus',
                question: `Is this property solely in your name, or is it jointly owned with someone?`,
                quickReplies: ['It\'s solely in my name.', 'It\'s jointly owned with my wife.', 'Joint ownership with my brother.']
            },
            {
                key: 'documentsAvailable',
                question: `Do you have the original property documents available for verification?`,
                quickReplies: ['Yes, I have the originals.', 'The originals are at home.', 'I only have photocopies.']
            },
            {
                key: 'loanAmount',
                question: `How much loan amount are you looking for?`,
                quickReplies: ['Around ₹40 lakhs.', 'About ₹50 lakhs.', '₹75 lakhs.', '₹90 lakhs.']
            },
            {
                key: ['occupation', 'incomeMode'],
                question: `May I know your current occupation? And is your income primarily received through bank transfers or in cash?`,
                quickReplies: [
                    'I\'m salaried, income goes to bank.',
                    'Self-employed, income via bank transfer.',
                    'I\'m salaried but paid in cash.',
                    'I run a business, mostly cash.'
                ]
            },
            {
                key: 'marketValue',
                question: `Approximately, what would you estimate the current market value of your property to be?`,
                quickReplies: ['Around ₹80 lakhs.', 'About ₹1 crore.', 'Roughly ₹1.5 crore.', 'Maybe ₹2 crore.']
            },
            {
                key: 'tenure',
                question: `And what loan tenure would you be comfortable with? We offer tenures ranging from 3 to 15 years.`,
                quickReplies: ['5 years.', '10 years.', '12 years.', '15 years.', '2 years.', '20 years.']
            }
        ];

        for (const q of questions) {
            if (Array.isArray(q.key)) {
                const allAnswered = q.key.every(k => this.state[k] !== 'UNKNOWN');
                if (!allAnswered) return q;
            } else {
                if (this.state[q.key] === 'UNKNOWN') return q;
            }
        }

        return null;
    }

    askNextEligibilityQuestion() {
        // Check for over-limit loan negotiation
        if (this.state.loanAmount === 'OVER_LIMIT') {
            this.state.callPhase = 'LOAN_AMOUNT_NEGOTIATION';
            this.state.currentQuestion = 'LOAN_AMOUNT_NEGOTIATION';
            const response = `I should mention that the current offer is available for up to ₹75 lakhs. Would you like to proceed with the maximum eligible amount of ₹75 lakhs?`;
            return this.generateResponse(response, [
                'Yes, ₹75 lakhs works for me.',
                "No, I'll pass on this."
            ]);
        }

        const nextQ = this.getNextMissingQuestion();

        if (!nextQ) {
            // All answered
            if (this.checkAllAnswered()) {
                return this.handleQualified();
            }
        }

        this.state.currentQuestion = Array.isArray(nextQ.key) ? nextQ.key[0] : nextQ.key;
        const response = nextQ.question;
        return this.generateResponse(response, nextQ.quickReplies);
    }

    checkAllAnswered() {
        const allAnswered = (
            this.state.propertyType !== 'UNKNOWN' &&
            this.state.ownershipStatus !== 'UNKNOWN' &&
            this.state.documentsAvailable !== 'UNKNOWN' &&
            this.state.loanAmount !== 'UNKNOWN' &&
            this.state.loanAmount !== 'OVER_LIMIT' &&
            this.state.occupation !== 'UNKNOWN' &&
            this.state.incomeMode !== 'UNKNOWN' &&
            this.state.marketValue !== 'UNKNOWN' &&
            this.state.tenure !== 'UNKNOWN'
        );

        if (allAnswered) {
            this.state.allQuestionsAnswered = true;
        }

        return allAnswered;
    }

    hasAnyEligibilityData() {
        return (
            this.state.propertyType !== 'UNKNOWN' ||
            this.state.ownershipStatus !== 'UNKNOWN' ||
            this.state.documentsAvailable !== 'UNKNOWN' ||
            this.state.loanAmount !== 'UNKNOWN' ||
            this.state.occupation !== 'UNKNOWN' ||
            this.state.incomeMode !== 'UNKNOWN' ||
            this.state.marketValue !== 'UNKNOWN' ||
            this.state.tenure !== 'UNKNOWN'
        );
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    matchesAny(input, patterns) {
        return patterns.some(p => input.includes(p.toLowerCase()));
    }

    addToHistory(role, message) {
        this.conversationHistory.push({
            role,
            message,
            timestamp: new Date().toISOString()
        });
    }

    generateResponse(message, quickReplies = []) {
        this.addToHistory('agent', message);
        this.nextQuickReplies = quickReplies;

        return {
            message,
            quickReplies,
            stateUpdate: { ...this.state },
            callEnded: false
        };
    }

    endCall(message, outcome) {
        this.state.outcome = outcome;
        this.state.callActive = false;
        this.state.callPhase = 'ENDED';

        this.addToHistory('agent', message);

        const systemMessages = {
            QUALIFIED: { type: 'success', text: '✅ Customer QUALIFIED — Handoff to Senior Loan Expert' },
            DISQUALIFIED: { type: 'error', text: `❌ Customer DISQUALIFIED — ${this.state.disqualificationReason}` },
            TRANSFER: { type: 'warning', text: '🔄 TRANSFER — Routing to Loan-Transfer Specialist' },
            CALLBACK: { type: 'info', text: `📞 CALLBACK Scheduled — ${this.state.callbackTime || 'Time TBD'}` },
            DECLINED: { type: 'info', text: '👋 Customer DECLINED the offer' },
            ENDED: { type: 'info', text: '📵 Call Ended' }
        };

        return {
            message,
            quickReplies: [],
            stateUpdate: { ...this.state },
            systemMessage: systemMessages[outcome] || systemMessages.ENDED,
            callEnded: true
        };
    }

    getTranscript() {
        return this.conversationHistory.map(entry => ({
            role: entry.role.toUpperCase(),
            message: entry.message,
            timestamp: entry.timestamp
        }));
    }

    getFormattedTranscript() {
        let transcript = `=== CALL TRANSCRIPT ===\n`;
        transcript += `Date: ${new Date().toLocaleDateString()}\n`;
        transcript += `Agent: ${this.config.agentName} (${this.config.companyName})\n`;
        transcript += `Customer: ${this.config.customerName}\n`;
        transcript += `Outcome: ${this.state.outcome || 'In Progress'}\n`;
        transcript += `========================\n\n`;

        this.conversationHistory.forEach(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const speaker = entry.role === 'agent' ? this.config.agentName : this.config.customerName;
            transcript += `[${time}] ${speaker}:\n${entry.message}\n\n`;
        });

        if (this.state.outcome) {
            transcript += `========================\n`;
            transcript += `RESULT: ${this.state.outcome}\n`;
            if (this.state.disqualificationReason) {
                transcript += `REASON: ${this.state.disqualificationReason}\n`;
            }
            transcript += `========================\n`;
        }

        return transcript;
    }
}

// Export for use
window.AgentEngine = AgentEngine;
