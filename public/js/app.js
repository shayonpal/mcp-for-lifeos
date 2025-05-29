/**
 * LifeOS MCP Web Interface - Main Application
 * Frontend JavaScript for chat interface with Anthropic Claude integration
 */

class MCPWebInterface {
    constructor() {
        this.apiKey = '';
        this.selectedModel = 'claude-sonnet-4-20250514';
        this.messageHistory = [];
        this.isConnected = false;
        this.isLoading = false;
        
        // DOM elements
        this.elements = {};
        
        // Initialize app
        this.init();
    }

    init() {
        this.bindElements();
        this.loadFromStorage();
        this.bindEvents();
        this.updateUI();
        this.setupAutoResize();
        
        console.log('LifeOS MCP Web Interface initialized');
    }

    bindElements() {
        // Configuration elements
        this.elements.apiKey = document.getElementById('apiKey');
        this.elements.toggleApiKey = document.getElementById('toggleApiKey');
        this.elements.testConnection = document.getElementById('testConnection');
        this.elements.modelSelect = document.getElementById('modelSelect');
        
        // Status elements
        this.elements.connectionStatus = document.getElementById('connectionStatus');
        this.elements.statusIndicator = document.getElementById('statusIndicator');
        this.elements.statusText = document.getElementById('statusText');
        
        // Chat elements
        this.elements.chatMessages = document.getElementById('chatMessages');
        this.elements.chatForm = document.getElementById('chatForm');
        this.elements.messageInput = document.getElementById('messageInput');
        this.elements.sendButton = document.getElementById('sendButton');
        this.elements.clearChat = document.getElementById('clearChat');
        
        // Overlay elements
        this.elements.loadingOverlay = document.getElementById('loadingOverlay');
        this.elements.errorToast = document.getElementById('errorToast');
        this.elements.errorMessage = document.getElementById('errorMessage');
        this.elements.closeError = document.getElementById('closeError');
    }

    bindEvents() {
        // API Key management
        this.elements.apiKey.addEventListener('input', (e) => {
            this.apiKey = e.target.value.trim();
            this.saveToStorage();
            this.validateApiKey();
        });

        this.elements.toggleApiKey.addEventListener('click', () => {
            this.toggleApiKeyVisibility();
        });

        this.elements.testConnection.addEventListener('click', () => {
            this.testConnection();
        });

        // Model selection
        this.elements.modelSelect.addEventListener('change', (e) => {
            this.selectedModel = e.target.value;
            this.saveToStorage();
        });

        // Chat functionality
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.elements.clearChat.addEventListener('click', () => {
            this.clearChat();
        });

        // Error handling
        this.elements.closeError.addEventListener('click', () => {
            this.hideError();
        });

        // Auto-hide error after 5 seconds
        let errorTimeout;
        const originalShowError = this.showError.bind(this);
        this.showError = (message) => {
            clearTimeout(errorTimeout);
            this.elements.errorMessage.textContent = message;
            this.elements.errorToast.classList.remove('hidden');
            errorTimeout = setTimeout(() => this.hideError(), 5000);
        };
    }

    setupAutoResize() {
        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => {
            this.elements.messageInput.style.height = 'auto';
            this.elements.messageInput.style.height = Math.min(this.elements.messageInput.scrollHeight, 120) + 'px';
        });
    }

    loadFromStorage() {
        try {
            // Load API key
            const storedApiKey = localStorage.getItem('mcp_api_key');
            if (storedApiKey) {
                this.apiKey = storedApiKey;
                this.elements.apiKey.value = storedApiKey;
            }

            // Load selected model
            const storedModel = localStorage.getItem('mcp_selected_model');
            if (storedModel) {
                this.selectedModel = storedModel;
                this.elements.modelSelect.value = storedModel;
            }

            // Load message history
            const storedHistory = localStorage.getItem('mcp_message_history');
            if (storedHistory) {
                this.messageHistory = JSON.parse(storedHistory);
                this.renderMessageHistory();
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mcp_api_key', this.apiKey);
            localStorage.setItem('mcp_selected_model', this.selectedModel);
            localStorage.setItem('mcp_message_history', JSON.stringify(this.messageHistory));
        } catch (error) {
            console.error('Error saving to storage:', error);
            this.showError('Failed to save settings');
        }
    }

    validateApiKey() {
        const isValid = this.apiKey.length > 0 && this.apiKey.startsWith('sk-ant-');
        
        this.elements.testConnection.disabled = !isValid;
        this.elements.modelSelect.disabled = !isValid;
        this.elements.messageInput.disabled = !isValid;
        this.elements.sendButton.disabled = !isValid;
        this.elements.clearChat.disabled = !isValid;

        // Don't auto-test connection to avoid infinite loops
        // User must click Test button manually

        return isValid;
    }

    toggleApiKeyVisibility() {
        const input = this.elements.apiKey;
        const button = this.elements.toggleApiKey;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
            button.setAttribute('aria-label', 'Hide API key');
        } else {
            input.type = 'password';
            button.textContent = '👁️';
            button.setAttribute('aria-label', 'Show API key');
        }
    }

    async testConnection() {
        if (!this.validateApiKey()) {
            this.showError('Please enter a valid Anthropic API key');
            return;
        }

        this.setConnectionStatus('connecting');
        
        try {
            // For MVP, we'll do a simple validation
            // In the full implementation, this would test against the actual API
            await this.simulateConnectionTest();
            
            this.setConnectionStatus('connected');
            this.isConnected = true;
            this.elements.messageInput.focus();
        } catch (error) {
            this.setConnectionStatus('disconnected');
            this.isConnected = false;
            this.showError('Connection test failed: ' + error.message);
        }
    }

    async simulateConnectionTest() {
        // Simulate API connection test
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.apiKey.startsWith('sk-ant-')) {
                    resolve();
                } else {
                    reject(new Error('Invalid API key format'));
                }
            }, 1000);
        });
    }

    setConnectionStatus(status) {
        const indicator = this.elements.statusIndicator;
        const text = this.elements.statusText;
        
        indicator.className = `status-indicator ${status}`;
        
        switch (status) {
            case 'connected':
                text.textContent = 'Connected';
                break;
            case 'connecting':
                text.textContent = 'Connecting...';
                break;
            case 'disconnected':
            default:
                text.textContent = 'Disconnected';
                break;
        }
    }

    async sendMessage() {
        const messageText = this.elements.messageInput.value.trim();
        
        if (!messageText || this.isLoading || !this.isConnected) {
            return;
        }

        // Add user message to history
        const userMessage = {
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString()
        };
        
        this.messageHistory.push(userMessage);
        this.renderMessage(userMessage);
        
        // Clear input
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            // For MVP, simulate assistant response
            const assistantResponse = await this.simulateAssistantResponse(messageText);
            
            const assistantMessage = {
                role: 'assistant',
                content: assistantResponse,
                timestamp: new Date().toISOString()
            };
            
            this.messageHistory.push(assistantMessage);
            this.renderMessage(assistantMessage);
            
            // Save to storage
            this.saveToStorage();
            
        } catch (error) {
            this.showError('Failed to send message: ' + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    async simulateAssistantResponse(userMessage) {
        // For MVP, try to call the actual API first, fall back to simulation
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    apiKey: this.apiKey,
                    model: this.selectedModel
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.response;
            } else {
                throw new Error(`API call failed: ${response.status}`);
            }
        } catch (error) {
            console.warn('API call failed, using simulation:', error);
            
            // Fallback to simulation
            return new Promise((resolve) => {
                setTimeout(() => {
                    const responses = [
                        "I understand you're asking about: \"" + userMessage + "\". In the full implementation, I would search through your Obsidian vault and provide relevant information from your notes.",
                        "That's an interesting question about: \"" + userMessage + "\". Once connected to your LifeOS vault, I'll be able to provide insights based on your personal knowledge base.",
                        "Thanks for your message: \"" + userMessage + "\". The MCP integration will allow me to access and search through your notes to provide personalized responses.",
                        "I see you're interested in: \"" + userMessage + "\". When fully connected, I'll help you explore your vault and find relevant connections in your notes."
                    ];
                    
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                    resolve(randomResponse);
                }, 1000 + Math.random() * 2000); // 1-3 second delay
            });
        }
    }

    renderMessageHistory() {
        // Clear welcome message if exists
        const welcomeMessage = this.elements.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Render all messages
        this.messageHistory.forEach(message => {
            this.renderMessage(message, false);
        });

        this.scrollToBottom();
    }

    renderMessage(message, shouldScroll = true) {
        // Remove welcome message if it exists
        const welcomeMessage = this.elements.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${message.role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Basic markdown support
        const formattedContent = this.formatMessage(message.content);
        contentDiv.innerHTML = formattedContent;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp';
        timestampDiv.textContent = this.formatTimestamp(message.timestamp);
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestampDiv);
        
        this.elements.chatMessages.appendChild(messageDiv);
        
        if (shouldScroll) {
            this.scrollToBottom();
        }
    }

    formatMessage(content) {
        // Basic markdown support
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        });
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.messageHistory = [];
            this.elements.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to LifeOS MCP</h2>
                    <p>Configure your API key above to start chatting with your Obsidian vault.</p>
                </div>
            `;
            this.saveToStorage();
        }
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.elements.loadingOverlay.classList.remove('hidden');
            this.elements.sendButton.disabled = true;
            this.elements.messageInput.disabled = true;
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
            this.elements.sendButton.disabled = false;
            this.elements.messageInput.disabled = false;
            this.elements.messageInput.focus();
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorToast.classList.remove('hidden');
    }

    hideError() {
        this.elements.errorToast.classList.add('hidden');
    }

    updateUI() {
        this.validateApiKey();
        
        if (this.messageHistory.length === 0) {
            this.elements.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to LifeOS MCP</h2>
                    <p>Configure your API key above to start chatting with your Obsidian vault.</p>
                </div>
            `;
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mcpApp = new MCPWebInterface();
});

// Handle page visibility changes (for PWA)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.mcpApp) {
        // Refresh connection status when page becomes visible
        if (window.mcpApp.isConnected) {
            window.mcpApp.testConnection();
        }
    }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPWebInterface;
}