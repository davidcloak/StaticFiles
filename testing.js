
        let userData = null;
        let achievementsData = null;
        let unlockedAchievementsData = null;
        let selectedIcon = '💣';
        let currentCategory = 'all';

        const allIcons = ['💣', '🔵', '🟢', '🟡', '🟠', '🟣', '🟤', '⚫', '⚪', '🔶',
            '⭐', '💎', '🎯', '🎨', '🌟', '💫', '✨', '🔥', '⚡',
            '🌙', '☀️', '🌈', '🍀', '🌺', '🦋', '🐉', '🦊', '🐺',
            '🦁', '🐯', '🐻', '🐼', '🦄', '🎭', '🎪', '🎸', '🌻', '👹', '👾', '🎃', '🐱‍🐉', '🌹', '👻', '🧅', '💩', '👀'];

        async function loadProfile() {
            try {
                const response = await fetch('/api/profile');
                const data = await response.json();

                userData = data.user;
                achievementsData = data.achievements;
                unlockedAchievementsData = data.unlocked_achievements;

                // Update profile display
                document.getElementById('profileIcon').textContent = userData.preferred_icon;
                document.getElementById('displayName').textContent = userData.display_name;
                document.getElementById('username').textContent = '@' + userData.username;

                // Update stats
                const statsGrid = document.getElementById('statsGrid');
                statsGrid.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-label">Games Played</div>
                        <div class="stat-value">${userData.stats.total_games}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Wins</div>
                        <div class="stat-value">${userData.stats.total_wins}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value">${userData.stats.win_rate}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Points</div>
                        <div class="stat-value">${userData.stats.total_points}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Perfect Guesses</div>
                        <div class="stat-value">${userData.stats.perfect_guesses}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Avg Points/Game</div>
                        <div class="stat-value">${userData.stats.avg_points}</div>
                    </div>
                `;

                // Load achievements
                renderAchievements();

                // Setup icon selector
                setupIconSelector();

            } catch (error) {
                console.error('Error loading profile:', error);
            }
        }

        function renderAchievements() {
            const grid = document.getElementById('achievementsGrid');
            grid.innerHTML = '';

            const filtered = currentCategory === 'all'
                ? achievementsData
                : achievementsData.filter(a => a.category === currentCategory);

            filtered.forEach(achievement => {
                const card = document.createElement('div');
                card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`;

                const unlockedAchievement = achievement.unlocked
                    ? unlockedAchievementsData.find(ua => ua.achievement.id === achievement.id)
                    : null;

                let dateString = '';
                if (unlockedAchievement && unlockedAchievement.unlocked_at) {
                    const date = new Date(unlockedAchievement.unlocked_at);
                    dateString = `<div class="achievement-date">Unlocked: ${date.toLocaleDateString()}</div>`;
                }

                card.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <h4>${achievement.name}</h4>
                        <p>${achievement.description}</p>
                        ${dateString}
                    </div>
                `;

                grid.appendChild(card);
            });
        }

        function filterAchievements(category) {
            currentCategory = category;

            // Update active tab
            document.querySelectorAll('.category-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');

            renderAchievements();
        }

        function setupIconSelector() {
            const grid = document.getElementById('iconSelectorGrid');
            grid.innerHTML = '';

            allIcons.forEach(icon => {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'icon-select-option';
                if (icon === userData.preferred_icon) {
                    iconDiv.classList.add('selected');
                    selectedIcon = icon;
                }
                iconDiv.textContent = icon;
                iconDiv.onclick = () => selectIcon(icon, iconDiv);
                grid.appendChild(iconDiv);
            });
        }

        function selectIcon(icon, element) {
            selectedIcon = icon;
            document.querySelectorAll('.icon-select-option').forEach(el => {
                el.classList.remove('selected');
            });
            element.classList.add('selected');
        }

        function openEditModal() {
            document.getElementById('editDisplayName').value = userData.display_name;
            document.getElementById('editModal').classList.add('active');
        }

        function closeEditModal() {
            document.getElementById('editModal').classList.remove('active');
            document.getElementById('editError').textContent = '';
            document.getElementById('editSuccess').textContent = '';
        }

        async function saveProfile() {
            const displayName = document.getElementById('editDisplayName').value.trim();
            const errorMsg = document.getElementById('editError');
            const successMsg = document.getElementById('editSuccess');

            errorMsg.textContent = '';
            successMsg.textContent = '';

            try {
                const response = await fetch('/api/profile/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        display_name: displayName,
                        preferred_icon: selectedIcon
                    })
                });

                const data = await response.json();

                if (data.success) {
                    successMsg.textContent = 'Profile updated!';
                    userData = data.user;
                    document.getElementById('profileIcon').textContent = userData.preferred_icon;
                    document.getElementById('displayName').textContent = userData.display_name;

                    setTimeout(() => {
                        closeEditModal();
                    }, 1500);
                } else {
                    errorMsg.textContent = data.message;
                }
            } catch (error) {
                errorMsg.textContent = 'An error occurred. Please try again.';
            }
        }

        async function logout() {
            try {
                const response = await fetch('/logout', {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        // Load profile on page load
        loadProfile();
    
