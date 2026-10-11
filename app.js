/**
 * SalesAgent AI — Main Application
 * 
 * Orchestrates the UI, navigation, simulator, scenarios, state dashboard,
 * transcripts, flowchart, and prompt viewer.
 */

class SalesAgentApp {
    constructor() {
        this.engine = null;
        this.currentView = 'simulator';
        this.callActive = false;
        this.scenarioResults = {};
        this.savedTranscripts = [];
        this.autoplayTimer = null;
    }

    init() {
        this.setupNavigation();
        this.setupSimulator();
        this.renderScenarios();
        this.renderStateDashboard();
        this.renderFlowchart();
        this.renderPrompt();
        this.setupResponsive();
    }

    // ==========================================
    // NAVIGATION
    // ==========================================

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
    }

    switchView(viewName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        // Update top bar title
        const titles = {
            simulator: { h1: 'Voice Agent Simulator', p: 'Test the AI Voice Agent with different customer scenarios' },
            scenarios: { h1: 'Test Scenarios', p: 'Pre-built test scenarios covering all eligibility paths and edge cases' },
            state: { h1: 'Agent Qualification State', p: 'Real-time view of the agent\'s internal state machine' },
            transcripts: { h1: 'Conversation Transcripts', p: 'Review and export conversation transcripts' },
            flowchart: { h1: 'Conversation Flow Architecture', p: 'Visual representation of the call flow and decision points' },
            prompt: { h1: 'System Prompt', p: 'The complete system prompt powering the AI Voice Agent' }
        };

        const titleEl = document.getElementById('viewTitle');
        if (titles[viewName]) {
            titleEl.querySelector('h1').textContent = titles[viewName].h1;
            titleEl.querySelector('p').textContent = titles[viewName].p;
        }

        this.currentView = viewName;

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
    }

    // ==========================================
    // SIMULATOR
    // ==========================================

    setupSimulator() {
        const startBtn = document.getElementById('startCallBtn');
        const endBtn = document.getElementById('endCallBtn');
        const sendBtn = document.getElementById('sendBtn');
        const input = document.getElementById('customerInput');
        const resetBtn = document.getElementById('resetChat');
        const exportBtn = document.getElementById('exportChat');

        startBtn.addEventListener('click', () => this.startCall());
        endBtn.addEventListener('click', () => this.endCall());
        sendBtn.addEventListener('click', () => this.sendMessage());
        resetBtn.addEventListener('click', () => this.resetChat());
        exportBtn.addEventListener('click', () => this.exportTranscript());

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    startCall() {
        const config = {
            agentName: document.getElementById('cfgAgentName').value,
            agentGender: document.getElementById('cfgAgentGender').value,
            customerName: document.getElementById('cfgCustomerName').value,
            companyName: document.getElementById('cfgCompanyName').value,
            language: document.getElementById('cfgLanguage').value
        };

        this.engine = new AgentEngine(config);
        this.callActive = true;

        // Update UI
        document.getElementById('startCallBtn').classList.add('hidden');
        document.getElementById('endCallBtn').classList.remove('hidden');
        document.getElementById('customerInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('liveState').classList.remove('hidden');
        document.getElementById('agentNameDisplay').textContent = config.agentName;

        // Update status
        this.updateStatus('active', 'Call Active');

        // Clear chat
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';

        // Add system message
        this.addSystemMessage('info', `📞 Call started with ${config.customerName}`);

        // Start the call
        const result = this.engine.startCall();
        this.showAgentMessage(result.message);
        this.showQuickReplies(result.quickReplies);
        this.updateLiveState(result.stateUpdate);
    }

    sendMessage() {
        const input = document.getElementById('customerInput');
        const message = input.value.trim();
        if (!message || !this.callActive) return;

        input.value = '';

        // Show customer message
        this.showCustomerMessage(message);

        // Clear quick replies
        document.getElementById('quickReplies').innerHTML = '';

        // Show typing indicator
        this.showTyping();

        // Process with slight delay for realism
        setTimeout(() => {
            this.removeTyping();
            const result = this.engine.processCustomerInput(message);

            this.showAgentMessage(result.message);
            this.showQuickReplies(result.quickReplies);
            this.updateLiveState(result.stateUpdate);

            if (result.systemMessage) {
                this.addSystemMessage(result.systemMessage.type, result.systemMessage.text);
            }

            if (result.callEnded) {
                this.callEnded();
            }
        }, 600 + Math.random() * 800);
    }

    endCall() {
        if (this.engine) {
            this.addSystemMessage('info', '📵 Call ended by user');
            this.callEnded();
        }
    }

    callEnded() {
        this.callActive = false;
        document.getElementById('startCallBtn').classList.remove('hidden');
        document.getElementById('endCallBtn').classList.add('hidden');
        document.getElementById('customerInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('quickReplies').innerHTML = '';

        this.updateStatus('ended', 'Call Ended');

        // Save transcript
        if (this.engine) {
            this.saveTranscript();
        }
    }

    resetChat() {
        if (this.autoplayTimer) {
            clearTimeout(this.autoplayTimer);
            this.autoplayTimer = null;
        }

        this.callActive = false;
        this.engine = null;

        document.getElementById('startCallBtn').classList.remove('hidden');
        document.getElementById('endCallBtn').classList.add('hidden');
        document.getElementById('customerInput').disabled = true;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('liveState').classList.add('hidden');
        document.getElementById('quickReplies').innerHTML = '';

        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <h3>Ready to simulate a call</h3>
                <p>Configure the agent settings and click "Start Call" to begin the conversation simulation.</p>
            </div>
        `;

        this.updateStatus('', 'Agent Ready');
    }

    // ==========================================
    // MESSAGE RENDERING
    // ==========================================

    showAgentMessage(text) {
        const chatMessages = document.getElementById('chatMessages');
        const agentName = this.engine?.config?.agentName || 'Agent';

        const messageEl = document.createElement('div');
        messageEl.className = 'message agent';
        messageEl.innerHTML = `
            <div class="message-avatar">${agentName.charAt(0)}</div>
            <div class="message-content">
                <span class="message-sender">${agentName}</span>
                <div class="message-bubble">${this.escapeHtml(text)}</div>
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;

        chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }

    showCustomerMessage(text) {
        const chatMessages = document.getElementById('chatMessages');
        const customerName = this.engine?.config?.customerName || 'Customer';

        const messageEl = document.createElement('div');
        messageEl.className = 'message customer';
        messageEl.innerHTML = `
            <div class="message-avatar">${customerName.charAt(0)}</div>
            <div class="message-content">
                <span class="message-sender">${customerName}</span>
                <div class="message-bubble">${this.escapeHtml(text)}</div>
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;

        chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }

    addSystemMessage(type, text) {
        const chatMessages = document.getElementById('chatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = `system-message ${type}`;
        messageEl.innerHTML = `<span>${text}</span>`;
        chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }

    showTyping() {
        const chatMessages = document.getElementById('chatMessages');
        const agentName = this.engine?.config?.agentName || 'Agent';

        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        typingEl.id = 'typingIndicator';
        typingEl.innerHTML = `
            <div class="message-avatar" style="background: var(--accent-gradient); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">${agentName.charAt(0)}</div>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        chatMessages.appendChild(typingEl);
        this.scrollToBottom();
    }

    removeTyping() {
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
    }

    showQuickReplies(replies) {
        const container = document.getElementById('quickReplies');
        container.innerHTML = '';

        if (!replies || replies.length === 0 || !this.callActive) return;

        replies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'quick-reply-btn';
            btn.textContent = reply;
            btn.addEventListener('click', () => {
                document.getElementById('customerInput').value = reply;
                this.sendMessage();
            });
            container.appendChild(btn);
        });
    }

    // ==========================================
    // STATE MANAGEMENT UI
    // ==========================================

    updateLiveState(state) {
        const grid = document.getElementById('liveStateGrid');
        if (!grid) return;

        const stateItems = [
            { key: 'Phase', value: state.callPhase, type: 'info' },
            { key: 'Property', value: state.propertyType, type: state.propertyType === 'Agricultural' ? 'fail' : state.propertyType !== 'UNKNOWN' ? 'pass' : 'unknown' },
            { key: 'Ownership', value: state.ownershipStatus, type: state.ownershipStatus !== 'UNKNOWN' ? 'pass' : 'unknown' },
            { key: 'Documents', value: state.documentsAvailable === 'TRUE' ? 'Available' : state.documentsAvailable === 'FALSE' ? 'Unavailable' : 'UNKNOWN', type: state.documentsAvailable === 'FALSE' ? 'fail' : state.documentsAvailable === 'TRUE' ? 'pass' : 'unknown' },
            { key: 'Loan Amt', value: state.loanAmount, type: state.loanAmount !== 'UNKNOWN' && state.loanAmount !== 'OVER_LIMIT' ? 'pass' : state.loanAmount === 'OVER_LIMIT' ? 'fail' : 'unknown' },
            { key: 'Occupation', value: state.occupation, type: state.occupation !== 'UNKNOWN' ? 'pass' : 'unknown' },
            { key: 'Income', value: state.incomeMode, type: state.incomeMode === 'Cash' ? 'fail' : state.incomeMode !== 'UNKNOWN' ? 'pass' : 'unknown' },
            { key: 'Mkt Value', value: state.marketValue, type: state.marketValue !== 'UNKNOWN' ? 'pass' : 'unknown' },
            { key: 'Tenure', value: state.tenure, type: state.tenure !== 'UNKNOWN' ? 'pass' : 'unknown' }
        ];

        grid.innerHTML = stateItems.map(item => `
            <div class="state-row">
                <span class="state-key">${item.key}</span>
                <span class="state-value ${item.type}">${item.value}</span>
            </div>
        `).join('');

        // Also update the full state dashboard if visible
        this.renderStateDashboard(state);
    }

    updateStatus(type, text) {
        const indicator = document.getElementById('agentStatus');
        indicator.className = `status-indicator ${type}`;
        indicator.querySelector('.status-text').textContent = text;
    }

    // ==========================================
    // SCENARIOS
    // ==========================================

    renderScenarios() {
        const grid = document.getElementById('scenariosGrid');
        grid.innerHTML = '';

        TEST_SCENARIOS.forEach(scenario => {
            const card = document.createElement('div');
            card.className = 'scenario-card';
            card.id = `scenario-${scenario.id}`;

            const status = this.scenarioResults[scenario.id] || 'pending';
            const statusClass = status === 'pending' ? 'pending' : status === 'pass' ? 'pass' : 'fail';
            const statusText = status === 'pending' ? 'Pending' : status === 'pass' ? 'Passed' : 'Failed';

            card.innerHTML = `
                <div class="scenario-card-header">
                    <span class="scenario-id">${scenario.id}</span>
                    <span class="scenario-status ${statusClass}">${statusText}</span>
                </div>
                <h3>${scenario.name}</h3>
                <p>${scenario.description}</p>
                <span class="scenario-expected ${scenario.outcomeClass}">
                    Expected: ${scenario.expectedOutcome}
                </span>
                <div class="scenario-tags">
                    ${scenario.tags.map(t => `<span class="scenario-tag">${t}</span>`).join('')}
                </div>
                <button class="scenario-run-btn" data-scenario-id="${scenario.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Run Scenario
                </button>
            `;

            grid.appendChild(card);
        });

        // Add click handlers
        grid.querySelectorAll('.scenario-run-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scenarioId = btn.dataset.scenarioId;
                this.runScenario(scenarioId);
            });
        });
    }

    async runScenario(scenarioId) {
        const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) return;

        // Switch to simulator view
        this.switchView('simulator');

        // Reset and start
        this.resetChat();

        // Start call with default config
        this.startCall();

        // Auto-play customer responses with delays
        let index = 0;

        const playNext = () => {
            if (index >= scenario.customerResponses.length || !this.callActive) {
                // Scenario complete — check result
                setTimeout(() => {
                    const actualOutcome = this.engine?.state?.outcome;
                    const passed = actualOutcome === scenario.expectedOutcome;
                    this.scenarioResults[scenarioId] = passed ? 'pass' : 'fail';
                    this.updateScenarioStats();
                    this.renderScenarios();

                    if (passed) {
                        this.addSystemMessage('success', `✅ Scenario ${scenarioId} PASSED — Expected: ${scenario.expectedOutcome}, Got: ${actualOutcome}`);
                    } else {
                        this.addSystemMessage('error', `❌ Scenario ${scenarioId} FAILED — Expected: ${scenario.expectedOutcome}, Got: ${actualOutcome || 'No outcome'}`);
                    }
                }, 500);
                return;
            }

            const response = scenario.customerResponses[index];
            document.getElementById('customerInput').value = response;
            this.sendMessage();
            index++;

            // Schedule next message
            this.autoplayTimer = setTimeout(playNext, 1800 + Math.random() * 600);
        };

        // Start after initial greeting delay
        this.autoplayTimer = setTimeout(playNext, 1500);
    }

    updateScenarioStats() {
        const total = TEST_SCENARIOS.length;
        const passed = Object.values(this.scenarioResults).filter(v => v === 'pass').length;
        const failed = Object.values(this.scenarioResults).filter(v => v === 'fail').length;
        const pending = total - passed - failed;

        document.getElementById('totalScenarios').textContent = total;
        document.getElementById('passScenarios').textContent = passed;
        document.getElementById('failScenarios').textContent = failed;
        document.getElementById('pendingScenarios').textContent = pending;
    }

    // ==========================================
    // STATE DASHBOARD
    // ==========================================

    renderStateDashboard(state) {
        const s = state || (this.engine ? this.engine.state : this.getDefaultState());

        // Call Status
        const callStatusEl = document.getElementById('callStatusItems');
        if (callStatusEl) {
            callStatusEl.innerHTML = this.renderStateItems([
                { key: 'Call Phase', value: s.callPhase, type: s.callPhase === 'ENDED' ? 'fail' : 'info' },
                { key: 'Verified', value: s.customerVerified, type: s.customerVerified === 'TRUE' ? 'pass' : s.customerVerified === 'FALSE' ? 'fail' : 'unknown' },
                { key: 'Available', value: s.customerAvailable, type: s.customerAvailable === 'TRUE' ? 'pass' : s.customerAvailable === 'FALSE' ? 'fail' : 'unknown' },
                { key: 'Offer Presented', value: s.offerPresented ? 'Yes' : 'No', type: s.offerPresented ? 'pass' : 'unknown' },
                { key: 'Interest Confirmed', value: s.interestConfirmed, type: s.interestConfirmed === 'TRUE' ? 'pass' : 'unknown' },
            ]);
        }

        // Eligibility
        const eligibilityEl = document.getElementById('eligibilityItems');
        if (eligibilityEl) {
            eligibilityEl.innerHTML = this.renderStateItems([
                { key: '1. Property Type', value: s.propertyType, type: s.propertyType === 'Agricultural' ? 'fail' : s.propertyType !== 'UNKNOWN' ? 'pass' : 'unknown' },
                { key: '2. Ownership', value: s.ownershipStatus, type: s.ownershipStatus !== 'UNKNOWN' ? 'pass' : 'unknown' },
                { key: '3. Documents', value: s.documentsAvailable === 'TRUE' ? 'Available' : s.documentsAvailable === 'FALSE' ? 'Unavailable' : 'UNKNOWN', type: s.documentsAvailable === 'FALSE' ? 'fail' : s.documentsAvailable === 'TRUE' ? 'pass' : 'unknown' },
                { key: '4. Loan Amount', value: s.loanAmount, type: s.loanAmount !== 'UNKNOWN' && s.loanAmount !== 'OVER_LIMIT' ? 'pass' : s.loanAmount === 'OVER_LIMIT' ? 'fail' : 'unknown' },
                { key: '5a. Occupation', value: s.occupation, type: s.occupation !== 'UNKNOWN' ? 'pass' : 'unknown' },
                { key: '5b. Income Mode', value: s.incomeMode, type: s.incomeMode === 'Cash' ? 'fail' : s.incomeMode !== 'UNKNOWN' ? 'pass' : 'unknown' },
                { key: '6. Market Value', value: s.marketValue, type: s.marketValue !== 'UNKNOWN' ? 'pass' : 'unknown' },
                { key: '7. Tenure', value: s.tenure, type: s.tenure !== 'UNKNOWN' ? 'pass' : 'unknown' },
            ]);
        }

        // Decision Flags
        const decisionEl = document.getElementById('decisionItems');
        if (decisionEl) {
            decisionEl.innerHTML = this.renderStateItems([
                { key: 'Disqualified', value: s.disqualified ? 'YES' : 'NO', type: s.disqualified ? 'fail' : 'pass' },
                { key: 'DQ Reason', value: s.disqualificationReason || 'None', type: s.disqualificationReason ? 'fail' : 'unknown' },
                { key: 'Transfer Required', value: s.transferRequired ? 'YES' : 'NO', type: s.transferRequired ? 'fail' : 'pass' },
                { key: 'All Answered', value: s.allQuestionsAnswered ? 'YES' : 'NO', type: s.allQuestionsAnswered ? 'pass' : 'unknown' },
                { key: 'Outcome', value: s.outcome || 'Pending', type: s.outcome === 'QUALIFIED' ? 'pass' : s.outcome ? 'fail' : 'unknown' },
            ]);
        }

        // Flow Progress
        const flowEl = document.getElementById('flowProgress');
        if (flowEl) {
            const steps = [
                { label: 'Greeting', phase: 'GREETING' },
                { label: 'Verify', phase: 'VERIFICATION' },
                { label: 'Available', phase: 'AVAILABILITY' },
                { label: 'Offer', phase: 'OFFER' },
                { label: 'Q1: Property', phase: 'E1' },
                { label: 'Q2: Owner', phase: 'E2' },
                { label: 'Q3: Docs', phase: 'E3' },
                { label: 'Q4: Amount', phase: 'E4' },
                { label: 'Q5: Job', phase: 'E5' },
                { label: 'Q6: Value', phase: 'E6' },
                { label: 'Q7: Tenure', phase: 'E7' },
                { label: 'Decision', phase: 'DECISION' }
            ];

            const phaseOrder = ['INIT', 'GREETING', 'VERIFICATION', 'AVAILABILITY', 'OFFER', 'ELIGIBILITY', 'LOAN_AMOUNT_NEGOTIATION', 'DECISION', 'HANDOFF', 'ENDED'];
            const currentPhaseIdx = phaseOrder.indexOf(s.callPhase);

            flowEl.innerHTML = steps.map((step, i) => {
                let dotClass = 'pending';
                if (s.callPhase === 'ENDED' && s.outcome === 'QUALIFIED') {
                    dotClass = 'complete';
                } else if (s.callPhase === 'ENDED' && s.disqualified) {
                    if (i <= 4) dotClass = 'complete';
                    else dotClass = i <= this.getFailedStepIndex(s) ? 'failed' : 'pending';
                } else if (i < currentPhaseIdx) {
                    dotClass = 'complete';
                } else if (i === currentPhaseIdx) {
                    dotClass = 'active';
                }

                return `
                    <div class="flow-step">
                        <div class="flow-dot ${dotClass}">${i + 1}</div>
                        <span class="flow-label">${step.label}</span>
                    </div>
                `;
            }).join('');
        }
    }

    getFailedStepIndex(state) {
        switch (state.disqualificationReason) {
            case 'AGRICULTURAL_PROPERTY': return 4;
            case 'NO_ORIGINAL_DOCUMENTS': return 6;
            case 'CASH_INCOME': return 8;
            case 'TENURE_TOO_SHORT':
            case 'TENURE_TOO_LONG': return 10;
            default: return 11;
        }
    }

    renderStateItems(items) {
        return items.map(item => `
            <div class="state-item">
                <span class="state-item-key">${item.key}</span>
                <span class="state-item-value state-value ${item.type}">${item.value}</span>
            </div>
        `).join('');
    }

    getDefaultState() {
        return {
            callPhase: 'INIT',
            customerVerified: 'UNKNOWN',
            customerAvailable: 'UNKNOWN',
            offerPresented: false,
            interestConfirmed: 'UNKNOWN',
            propertyType: 'UNKNOWN',
            ownershipStatus: 'UNKNOWN',
            documentsAvailable: 'UNKNOWN',
            loanAmount: 'UNKNOWN',
            occupation: 'UNKNOWN',
            incomeMode: 'UNKNOWN',
            marketValue: 'UNKNOWN',
            tenure: 'UNKNOWN',
            disqualified: false,
            disqualificationReason: null,
            transferRequired: false,
            allQuestionsAnswered: false,
            outcome: null
        };
    }

    // ==========================================
    // TRANSCRIPTS
    // ==========================================

    saveTranscript() {
        if (!this.engine) return;

        const transcript = {
            id: `TR-${Date.now()}`,
            date: new Date().toLocaleString(),
            agentName: this.engine.config.agentName,
            customerName: this.engine.config.customerName,
            outcome: this.engine.state.outcome || 'ENDED',
            entries: this.engine.getTranscript(),
            formatted: this.engine.getFormattedTranscript(),
            state: { ...this.engine.state }
        };

        this.savedTranscripts.unshift(transcript);
        this.renderTranscripts();
    }

    renderTranscripts() {
        const container = document.getElementById('transcriptsList');

        if (this.savedTranscripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <h3>No transcripts yet</h3>
                    <p>Complete a conversation in the Simulator to generate a transcript.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.savedTranscripts.map((t, index) => {
            const outcomeClass = t.outcome === 'QUALIFIED' ? 'pass' :
                t.outcome === 'DISQUALIFIED' ? 'fail' :
                    t.outcome === 'TRANSFER' ? 'info' : 'unknown';

            return `
                <div class="transcript-card" id="transcript-${index}">
                    <div class="transcript-card-header" onclick="document.getElementById('transcript-body-${index}').classList.toggle('open')">
                        <div class="transcript-card-info">
                            <span class="scenario-status ${outcomeClass}">${t.outcome}</span>
                            <h4>${t.customerName} — ${t.date}</h4>
                        </div>
                        <div class="transcript-card-actions">
                            <button class="icon-btn" onclick="event.stopPropagation(); app.downloadTranscript(${index})" title="Download">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                            <button class="icon-btn" onclick="event.stopPropagation(); app.copyTranscript(${index})" title="Copy">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="transcript-body" id="transcript-body-${index}">
                        ${t.entries.map(entry => `
                            <div class="transcript-entry">
                                <div class="transcript-speaker ${entry.role.toLowerCase()}">${entry.role === 'AGENT' ? t.agentName : t.customerName}</div>
                                <div class="transcript-text">${this.escapeHtml(entry.message)}</div>
                            </div>
                        `).join('')}
                        <div class="transcript-entry">
                            <div class="transcript-speaker system">SYSTEM</div>
                            <div class="transcript-text">Call Outcome: ${t.outcome}${t.state.disqualificationReason ? ` (${t.state.disqualificationReason})` : ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    downloadTranscript(index) {
        const t = this.savedTranscripts[index];
        if (!t) return;

        const blob = new Blob([t.formatted], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${t.outcome}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    copyTranscript(index) {
        const t = this.savedTranscripts[index];
        if (!t) return;
        navigator.clipboard.writeText(t.formatted).then(() => {
            // Brief visual feedback
            const btn = document.querySelector(`#transcript-${index} .icon-btn:last-child`);
            if (btn) {
                btn.style.color = 'var(--success)';
                setTimeout(() => btn.style.color = '', 1500);
            }
        });
    }

    exportTranscript() {
        if (!this.engine) return;
        const text = this.engine.getFormattedTranscript();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ==========================================
    // FLOWCHART
    // ==========================================

    renderFlowchart() {
        const container = document.getElementById('flowchartContent');
        container.innerHTML = `
            <div class="flow-diagram">
                <div class="flow-node start">START — Incoming Call</div>
                <div class="flow-connector"></div>
                <div class="flow-node process">Greeting & Customer Verification</div>
                <div class="flow-connector"></div>
                <div class="flow-node decision">Customer Available?</div>
                <div class="flow-connector"></div>
                
                <div class="flow-branch">
                    <div class="flow-sub">
                        <div class="flow-node" style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); font-size: 12px; min-width: 160px;">NO → Ask Callback Time</div>
                        <div class="flow-connector"></div>
                        <div class="flow-node end-fail">END (Callback)</div>
                    </div>
                    <div class="flow-sub">
                        <div class="flow-node" style="background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success); font-size: 12px; min-width: 160px;">YES → Continue</div>
                        <div class="flow-connector"></div>
                        <div class="flow-node process">Present LAP Offer</div>
                    </div>
                </div>
                
                <div class="flow-connector"></div>
                <div class="flow-node decision">Existing Loan / EMI Transfer?</div>
                <div class="flow-connector"></div>
                
                <div class="flow-branch">
                    <div class="flow-sub">
                        <div class="flow-node" style="background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning); font-size: 12px; min-width: 160px;">YES → Transfer Specialist</div>
                        <div class="flow-connector"></div>
                        <div class="flow-node end-fail">END (Transfer)</div>
                    </div>
                    <div class="flow-sub">
                        <div class="flow-node" style="background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success); font-size: 12px; min-width: 160px;">NO → Fresh Loan</div>
                        <div class="flow-connector"></div>
                        <div class="flow-node process">Eligibility Questions (1-7)</div>
                    </div>
                </div>
                
                <div class="flow-connector"></div>
                
                <h3 style="color: var(--text-secondary); margin: 20px 0 10px; font-size: 14px;">7 ELIGIBILITY CHECKPOINTS</h3>
                
                <table class="eligibility-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Question</th>
                            <th>Eligible</th>
                            <th>Disqualify</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>Property Type</td>
                            <td style="color: var(--success);">Residential / Commercial / Industrial</td>
                            <td style="color: var(--error);">Agricultural ❌</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>Ownership</td>
                            <td style="color: var(--success);">Sole / Joint ✅</td>
                            <td style="color: var(--text-tertiary);">—</td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td>Original Documents</td>
                            <td style="color: var(--success);">Available ✅</td>
                            <td style="color: var(--error);">Not available ❌</td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td>Loan Amount</td>
                            <td style="color: var(--success);">≤ ₹75 Lakh ✅</td>
                            <td style="color: var(--warning);">{">"} ₹75L → Offer cap ⚠️</td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Occupation + Income</td>
                            <td style="color: var(--success);">Any + Bank ✅</td>
                            <td style="color: var(--error);">Cash income ❌</td>
                        </tr>
                        <tr>
                            <td>6</td>
                            <td>Market Value</td>
                            <td style="color: var(--success);">Capture value ✅</td>
                            <td style="color: var(--text-tertiary);">No min threshold</td>
                        </tr>
                        <tr>
                            <td>7</td>
                            <td>Tenure</td>
                            <td style="color: var(--success);">3–15 years ✅</td>
                            <td style="color: var(--error);">{"<"}3 or {">"}15 years ❌</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="flow-connector" style="margin-top: 20px;"></div>
                <div class="flow-node decision">All 7 Passed?</div>
                <div class="flow-connector"></div>
                
                <div class="flow-branch">
                    <div class="flow-sub">
                        <div class="flow-node end-fail">DISQUALIFIED → End</div>
                    </div>
                    <div class="flow-sub">
                        <div class="flow-node process">Senior Loan Expert Handoff</div>
                        <div class="flow-connector"></div>
                        <div class="flow-node end-success">QUALIFIED → END</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // PROMPT VIEWER
    // ==========================================

    renderPrompt() {
        const container = document.getElementById('promptContent');

        // Fetch the prompt content
        fetch('system_prompt.md')
            .then(res => res.text())
            .then(text => {
                // Render as formatted sections
                const sections = text.split(/^## /m);
                container.innerHTML = sections.map((section, i) => {
                    if (i === 0 && section.startsWith('#')) {
                        // Title section
                        const title = section.split('\n')[0].replace(/^# /, '');
                        const body = section.split('\n').slice(1).join('\n').trim();
                        return `
                            <div class="prompt-section">
                                <div class="prompt-section-title" style="font-size: 18px; color: var(--text-primary);">${this.escapeHtml(title)}</div>
                                <div class="prompt-text">${this.escapeHtml(body)}</div>
                            </div>
                        `;
                    }
                    if (!section.trim()) return '';
                    const title = section.split('\n')[0].trim();
                    const body = section.split('\n').slice(1).join('\n').trim();
                    return `
                        <div class="prompt-section">
                            <div class="prompt-section-title">${this.escapeHtml(title)}</div>
                            <div class="prompt-text">${this.escapeHtml(body)}</div>
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {
                container.innerHTML = '<div class="prompt-text">System prompt file not found. Please ensure system_prompt.md is in the root directory.</div>';
            });

        // Copy button
        document.getElementById('copyPrompt').addEventListener('click', () => {
            fetch('system_prompt.md')
                .then(res => res.text())
                .then(text => {
                    navigator.clipboard.writeText(text).then(() => {
                        const btn = document.getElementById('copyPrompt');
                        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
                        setTimeout(() => {
                            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Prompt`;
                        }, 2000);
                    });
                });
        });
    }

    // ==========================================
    // RESPONSIVE
    // ==========================================

    setupResponsive() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        document.getElementById('mainContent').addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }
}

// Global reference for inline handlers
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SalesAgentApp();
    app.init();
});
