// Database class to handle user data
class UserDatabase {
    constructor() {
        // Initialize users from localStorage or empty array
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.affiliateData = JSON.parse(localStorage.getItem('affiliateData')) || {};
        this.packagePrices = {
            basic: 4000,
            professional: 6000
        };
        this.companyShare = 0.40; // 40% for company
        this.commissionRates = {
            basic: {
                1: 0.325, // 32.5% of 60% (19.5% of total)
                2: 0.125, // 12.5% of 60% (7.5% of total)
                3: 0.10,  // 10% of 60% (6% of total)
                4: 0.05,  // 5% of 60% (3% of total)
                5: 0.03,  // 3% of 60% (1.8% of total)
                6: 0.02   // 2% of 60% (1.2% of total)
            },
            professional: {
                1: 0.325, // 32.5% of 60% (19.5% of total)
                2: 0.125, // 12.5% of 60% (7.5% of total)
                3: 0.10,  // 10% of 60% (6% of total)
                4: 0.05,  // 5% of 60% (3% of total)
                5: 0.03,  // 3% of 60% (1.8% of total)
                6: 0.02   // 2% of 60% (1.2% of total)
            }
        };
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // Register a new user
    registerUser(userData, referrerId = null) {
        // Check if email already exists
        if (this.users.some(user => user.email === userData.email)) {
            throw new Error('Email already registered');
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: this.hashPassword(userData.password),
            phone: userData.phone,
            professionalTitle: userData.professionalTitle,
            specialization: userData.specialization,
            yearsOfExperience: userData.yearsOfExperience,
            bio: userData.bio,
            registrationDate: new Date().toISOString(),
            referrerId: referrerId || null,
            referralLevel: 1
        };

        // Add user to database
        this.users.push(newUser);
        this.saveUsers();

        // Initialize affiliate data for new user
        this.initializeAffiliateData(newUser.id);

        // If user was referred, update referral chain
        if (referrerId) {
            this.updateReferralChain(newUser.id, referrerId);
        }

        return newUser;
    }

    initializeAffiliateData(userId) {
        const affiliateData = {
            referrals: [],
            earnings: {
                level1: 0,
                level2: 0,
                level3: 0,
                level4: 0,
                level5: 0,
                level6: 0
            },
            totalEarnings: 0
        };

        this.affiliateData[userId] = affiliateData;
        localStorage.setItem('affiliateData', JSON.stringify(this.affiliateData));
    }

    updateReferralChain(newUserId, referrerId, packageType = 'basic') {
        let currentUserId = referrerId;
        let level = 1;
        const packagePrice = this.packagePrices[packageType];
        const commissionableAmount = packagePrice * (1 - this.companyShare); // 60% of package price

        // Update referral chain up to 6 levels
        while (currentUserId && level <= 6) {
            const referrer = this.users.find(user => user.id === currentUserId);
            if (!referrer) break;

            // Add referral to referrer's affiliate data
            const referrerAffiliateData = this.affiliateData[referrer.id];
            if (referrerAffiliateData) {
                const newUser = this.users.find(user => user.id === newUserId);
                referrerAffiliateData.referrals.push({
                    id: newUserId,
                    name: `${newUser.firstName} ${newUser.lastName}`,
                    level: level,
                    date: new Date().toISOString(),
                    packageType: packageType,
                    commission: commissionableAmount * this.commissionRates[packageType][level]
                });

                // Update earnings
                const commission = commissionableAmount * this.commissionRates[packageType][level];
                referrerAffiliateData.earnings[`level${level}`] += commission;
                referrerAffiliateData.totalEarnings += commission;

                // Update localStorage
                this.affiliateData[referrer.id] = referrerAffiliateData;
                localStorage.setItem('affiliateData', JSON.stringify(this.affiliateData));
            }

            // Move up the chain
            currentUserId = referrer.referrerId;
            level++;
        }
    }

    getAffiliateData(userId) {
        return this.affiliateData[userId] || null;
    }

    getReferralChain(userId) {
        const chain = [];
        let currentUser = this.users.find(user => user.id === userId);
        
        while (currentUser && currentUser.referrerId) {
            const referrer = this.users.find(user => user.id === currentUser.referrerId);
            if (referrer) {
                chain.push({
                    id: referrer.id,
                    name: `${referrer.firstName} ${referrer.lastName}`,
                    level: currentUser.referralLevel
                });
                currentUser = referrer;
            } else {
                break;
            }
        }

        return chain;
    }

    // Login user
    loginUser(email, password) {
        const user = this.users.find(user => user.email === email);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify password
        if (this.verifyPassword(password, user.password)) {
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                professionalTitle: user.professionalTitle,
                specialization: user.specialization
            };
        } else {
            throw new Error('Invalid password');
        }
    }

    // Simple password hashing (in a real application, use a proper hashing library)
    hashPassword(password) {
        return btoa(password); // Base64 encoding (for demonstration only)
    }

    // Verify password
    verifyPassword(inputPassword, hashedPassword) {
        return this.hashPassword(inputPassword) === hashedPassword;
    }

    // Get user by ID
    getUserById(id) {
        return this.users.find(user => user.id === id);
    }

    // Update user profile
    updateUserProfile(id, updateData) {
        const userIndex = this.users.findIndex(user => user.id === id);
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Update user data
        this.users[userIndex] = {
            ...this.users[userIndex],
            ...updateData,
            password: updateData.password ? this.hashPassword(updateData.password) : this.users[userIndex].password
        };

        this.saveUsers();
        return this.users[userIndex];
    }

    // Add method to get commission breakdown
    getCommissionBreakdown(packageType) {
        const packagePrice = this.packagePrices[packageType];
        const companyAmount = packagePrice * this.companyShare;
        const commissionableAmount = packagePrice * (1 - this.companyShare);
        
        const breakdown = {
            packagePrice,
            companyShare: {
                percentage: this.companyShare * 100,
                amount: companyAmount
            },
            commissionableAmount,
            levelBreakdown: {}
        };

        // Calculate commission for each level
        for (let level = 1; level <= 6; level++) {
            const commission = commissionableAmount * this.commissionRates[packageType][level];
            breakdown.levelBreakdown[`level${level}`] = {
                percentage: this.commissionRates[packageType][level] * 100,
                amount: commission
            };
        }

        return breakdown;
    }

    // Add method to get user's commission summary
    getUserCommissionSummary(userId) {
        const userAffiliateData = this.affiliateData[userId];
        if (!userAffiliateData) return null;

        const summary = {
            totalEarnings: userAffiliateData.totalEarnings,
            levelBreakdown: {},
            referralsByLevel: {}
        };

        // Calculate earnings by level
        for (let level = 1; level <= 6; level++) {
            summary.levelBreakdown[`level${level}`] = {
                earnings: userAffiliateData.earnings[`level${level}`],
                referrals: userAffiliateData.referrals.filter(ref => ref.level === level).length
            };
        }

        return summary;
    }

    getReferralDetails(userId) {
        const userAffiliateData = this.affiliateData[userId];
        if (!userAffiliateData) return null;

        const referrals = userAffiliateData.referrals.map(referral => {
            const referredUser = this.users.find(user => user.id === referral.id);
            return {
                ...referral,
                email: referredUser.email,
                phone: referredUser.phone,
                fullName: `${referredUser.firstName} ${referredUser.lastName}`,
                registrationDate: referredUser.registrationDate
            };
        });

        // Group referrals by level
        const referralsByLevel = {};
        for (let level = 1; level <= 6; level++) {
            referralsByLevel[`level${level}`] = referrals.filter(ref => ref.level === level);
        }

        return {
            referralsByLevel,
            currentBalance: userAffiliateData.totalEarnings,
            pendingBalance: this.calculatePendingBalance(userId),
            totalEarnings: userAffiliateData.totalEarnings
        };
    }

    calculatePendingBalance(userId) {
        const userAffiliateData = this.affiliateData[userId];
        if (!userAffiliateData) return 0;

        // Get all referrals that haven't been paid out yet
        const unpaidReferrals = userAffiliateData.referrals.filter(ref => !ref.paid);
        return unpaidReferrals.reduce((total, ref) => total + ref.commission, 0);
    }
}

// Export the database instance
const userDB = new UserDatabase();
export default userDB; 