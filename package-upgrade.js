// Package prices in Kenyan Shillings
const BASIC_PACKAGE_PRICE = 4000;
const UPGRADE_PRICE = 2500;

// Affiliate marketing percentages
const COMPANY_PERCENTAGE = 0.40; // 40% for company
const AFFILIATE_PERCENTAGE = 0.60; // 60% for affiliate levels

// Level bonus percentages of the affiliate share (60% of 2500)
const LEVEL_BONUSES = {
    level1: 0.25, // 25% of affiliate share (375 KSH)
    level2: 0.20, // 20% of affiliate share (300 KSH)
    level3: 0.15, // 15% of affiliate share (225 KSH)
    level4: 0.15, // 15% of affiliate share (225 KSH)
    level5: 0.15, // 15% of affiliate share (225 KSH)
    level6: 0.10  // 10% of affiliate share (150 KSH)
};

function calculateAffiliateEarnings(upgradePrice = UPGRADE_PRICE) {
    const affiliateShare = upgradePrice * AFFILIATE_PERCENTAGE;
    const companyShare = upgradePrice * COMPANY_PERCENTAGE;
    
    return {
        companyShare: companyShare, // 1000 KSH (40% of 2500)
        levelBonuses: {
            level1: affiliateShare * LEVEL_BONUSES.level1, // 375 KSH
            level2: affiliateShare * LEVEL_BONUSES.level2, // 300 KSH
            level3: affiliateShare * LEVEL_BONUSES.level3, // 225 KSH
            level4: affiliateShare * LEVEL_BONUSES.level4, // 225 KSH
            level5: affiliateShare * LEVEL_BONUSES.level5, // 225 KSH
            level6: affiliateShare * LEVEL_BONUSES.level6  // 150 KSH
        }
    };
}

function formatCurrency(amount) {
    return `KSH ${amount.toFixed(2)}`;
}

function getBalance() {
    return parseFloat(localStorage.getItem('accountBalance')) || 0;
}

function deductFunds(amount) {
    const currentBalance = getBalance();
    if (currentBalance >= amount) {
        const newBalance = currentBalance - amount;
        localStorage.setItem('accountBalance', newBalance.toString());
        return true;
    }
    return false;
}

function upgradePackage() {
    const currentBalance = getBalance();
    
    if (currentBalance < UPGRADE_PRICE) {
        alert(`Insufficient balance. Please deposit at least ${formatCurrency(UPGRADE_PRICE - currentBalance)} more to upgrade.`);
        window.location.href = 'payment.html';
        return;
    }

    const earnings = calculateAffiliateEarnings();
    
    if (confirm(`Are you sure you want to upgrade to the Professional Package? ${formatCurrency(UPGRADE_PRICE)} will be deducted from your balance.`)) {
        const loadingMessage = 'Processing your upgrade...';
        alert(loadingMessage);
        
        // Deduct the upgrade price from balance
        if (!deductFunds(UPGRADE_PRICE)) {
            alert('Error processing payment. Please try again.');
            return;
        }

        // Save transaction
        const transaction = {
            type: 'upgrade',
            amount: UPGRADE_PRICE,
            timestamp: new Date().toISOString(),
            description: 'Upgrade to Professional Package'
        };
        
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        
        // Update package info
        setTimeout(() => {
            const professionalPackage = {
                type: 'Professional',
                price: UPGRADE_PRICE,
                purchaseDate: new Date().toISOString(),
                features: [
                    'All Transcription Types Access',
                    '300 Minutes Monthly',
                    'Priority Support 24/7',
                    'Advanced Record Keeping',
                    'Medical Transcription Access',
                    'Academic Transcription Access',
                    'Bulk Upload Features'
                ]
            };
            
            // Store package info and affiliate earnings
            localStorage.setItem('userPackage', JSON.stringify(professionalPackage));
            localStorage.setItem('transcriptionMinutes', '300');
            localStorage.setItem('lastUpgradeEarnings', JSON.stringify(earnings));
            
            alert('Congratulations! Your package has been upgraded to Professional. You now have access to all premium features.');
            window.location.href = 'transcriptions.html';
        }, 2000);
    }
}

// Function to purchase basic package
function purchaseBasicPackage() {
    const currentBalance = getBalance();
    
    if (currentBalance < BASIC_PACKAGE_PRICE) {
        alert(`Insufficient balance. Please deposit at least ${formatCurrency(BASIC_PACKAGE_PRICE - currentBalance)} more to purchase the Basic Package.`);
        window.location.href = 'payment.html';
        return;
    }

    if (confirm(`Are you sure you want to purchase the Basic Package? ${formatCurrency(BASIC_PACKAGE_PRICE)} will be deducted from your balance.`)) {
        const loadingMessage = 'Processing your purchase...';
        alert(loadingMessage);
        
        // Deduct the package price from balance
        if (!deductFunds(BASIC_PACKAGE_PRICE)) {
            alert('Error processing payment. Please try again.');
            return;
        }

        // Save transaction
        const transaction = {
            type: 'purchase',
            amount: BASIC_PACKAGE_PRICE,
            timestamp: new Date().toISOString(),
            description: 'Basic Package Purchase'
        };
        
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));

        setTimeout(() => {
            const basicPackage = {
                type: 'Basic',
                price: BASIC_PACKAGE_PRICE,
                purchaseDate: new Date().toISOString(),
                features: [
                    'Basic Transcription Access',
                    '100 Minutes Monthly',
                    'Standard Support',
                    'Basic File Management'
                ]
            };
            
            localStorage.setItem('userPackage', JSON.stringify(basicPackage));
            localStorage.setItem('transcriptionMinutes', '100');
            
            alert('Congratulations! You have successfully purchased the Basic Package.');
            window.location.href = 'transcriptions.html';
        }, 2000);
    }
}

// Function to display current package price and balance
function displayPackagePrices() {
    const basicPriceElement = document.querySelector('.package-card:first-child .package-price');
    const proPriceElement = document.querySelector('.package-card:last-child .package-price');
    const currentBalance = getBalance();
    
    // Add balance display if it doesn't exist
    let balanceDisplay = document.querySelector('.balance-display');
    if (!balanceDisplay) {
        balanceDisplay = document.createElement('div');
        balanceDisplay.className = 'balance-display';
        balanceDisplay.innerHTML = `
            <h3>Available Balance</h3>
            <div class="balance-amount">${formatCurrency(currentBalance)}</div>
        `;
        document.querySelector('.main-content').insertBefore(balanceDisplay, document.querySelector('.upgrade-container'));
    } else {
        balanceDisplay.querySelector('.balance-amount').textContent = formatCurrency(currentBalance);
    }
    
    if (basicPriceElement) {
        basicPriceElement.innerHTML = `${formatCurrency(BASIC_PACKAGE_PRICE)}<span>/month</span>`;
    }
    
    if (proPriceElement) {
        proPriceElement.innerHTML = `${formatCurrency(BASIC_PACKAGE_PRICE + UPGRADE_PRICE)}<span>/month</span>`;
    }
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    displayPackagePrices();
    
    // Add deposit button if it doesn't exist
    let depositButton = document.querySelector('.deposit-button');
    if (!depositButton) {
        depositButton = document.createElement('button');
        depositButton.className = 'deposit-button';
        depositButton.style.cssText = `
            background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 20px;
            font-size: 1.1em;
            width: 100%;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        `;
        depositButton.textContent = 'Deposit Funds';
        depositButton.onclick = () => window.location.href = 'payment.html';
        
        const balanceDisplay = document.querySelector('.balance-display');
        if (balanceDisplay) {
            balanceDisplay.appendChild(depositButton);
        }
    }
}); 