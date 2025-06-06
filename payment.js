// Function to format currency
function formatCurrency(amount) {
    return `KSH ${amount.toFixed(2)}`;
}

// Function to get current balance
function getBalance() {
    return parseFloat(localStorage.getItem('accountBalance')) || 0;
}

// Function to update balance display
function updateBalanceDisplay() {
    const balanceElement = document.getElementById('balanceAmount');
    if (balanceElement) {
        balanceElement.textContent = formatCurrency(getBalance());
    }
}

// Function to add funds to balance
function addFunds(amount) {
    const currentBalance = getBalance();
    const newBalance = currentBalance + amount;
    localStorage.setItem('accountBalance', newBalance.toString());
    updateBalanceDisplay();
    return newBalance;
}

// Function to deduct funds from balance
function deductFunds(amount) {
    const currentBalance = getBalance();
    if (currentBalance >= amount) {
        const newBalance = currentBalance - amount;
        localStorage.setItem('accountBalance', newBalance.toString());
        updateBalanceDisplay();
        return true;
    }
    return false;
}

// Function to verify payment
function verifyPayment() {
    const transactionCode = document.getElementById('transactionCode').value.trim();
    
    if (!transactionCode) {
        alert('Please enter the M-PESA transaction code');
        return;
    }

    // Validate transaction code format (should start with P or M followed by numbers)
    const codeRegex = /^[PM][A-Z0-9]{9}$/i;
    if (!codeRegex.test(transactionCode)) {
        alert('Please enter a valid M-PESA transaction code');
        return;
    }

    // Simulate payment verification
    setTimeout(() => {
        // For demonstration, we'll simulate a successful payment
        // In a real application, this would verify with your backend
        const amount = Math.floor(Math.random() * 5000) + 1000; // Random amount between 1000 and 6000
        
        addFunds(amount);
        
        // Save transaction history
        const transaction = {
            code: transactionCode,
            amount: amount,
            timestamp: new Date().toISOString(),
            type: 'deposit'
        };
        
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        
        // Clear input and show success message
        document.getElementById('transactionCode').value = '';
        alert(`Payment verified successfully! KSH ${amount} has been added to your balance.`);
        
        // Refresh balance display
        updateBalanceDisplay();
    }, 2000);
}

// Check if sufficient balance exists for a purchase
function checkSufficientBalance(amount) {
    const currentBalance = getBalance();
    return currentBalance >= amount;
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
}); 