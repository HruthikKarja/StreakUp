/**
 * StreakUp - Home Dashboard Logic
 * Computes dashboard statistics, renders today's metrics, and synchronizes with HabitManager.
 */

(function () {
    document.addEventListener('DOMContentLoaded', () => {
        // Ensure user is authenticated before running dashboard logic
        if (!window.StorageService || !window.StorageService.getUser()) {
            return;
        }

        initDashboard();
    });

    function initDashboard() {
        const todayStr = window.StorageService.getTodayDate();

        // Display current date
        const dateDisplay = document.getElementById('todayDateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = `Today: ${window.StorageService.formatDisplayDate(todayStr, true)}`;
        }

        // Initialize habit manager for today
        if (window.HabitManager) {
            window.HabitManager.init({
                formId: 'addHabitForm',
                inputId: 'habitNameInput',
                errorId: 'habitFormError',
                containerId: 'activeHabitsList',
                dateStr: todayStr,
                allowCheck: true,
                onUpdate: () => {
                    renderDashboardStats();
                }
            });
        }

        // Initial render of stats
        renderDashboardStats();
    }

    function renderDashboardStats() {
        const todayStr = window.StorageService.getTodayDate();
        const dayStats = window.StorageService.getDayStats(todayStr);
        const streaks = window.StorageService.calculateStreaks();

        // Active Habits
        const statActive = document.getElementById('statActiveHabits');
        if (statActive) {
            statActive.textContent = dayStats.totalActive;
        }

        // Completed Today
        const statCompleted = document.getElementById('statCompletedToday');
        const statFraction = document.getElementById('statCompletedFraction');
        if (statCompleted) {
            statCompleted.textContent = dayStats.completedCount;
        }
        if (statFraction) {
            statFraction.textContent = `${dayStats.completedCount} of ${dayStats.totalActive} habits`;
        }

        // Today's Progress Percentage
        const statPercentage = document.getElementById('statTodayPercentage');
        const statBar = document.getElementById('statProgressBar');
        if (statPercentage) {
            statPercentage.textContent = `${dayStats.percentage}%`;
        }
        if (statBar) {
            statBar.style.width = `${dayStats.percentage}%`;
            if (dayStats.isQualifying) {
                statBar.className = 'progress-bar is-full';
            } else if (dayStats.percentage > 0) {
                statBar.className = 'progress-bar is-partial';
            } else {
                statBar.className = 'progress-bar';
            }
        }

        // Current Streak & Longest Streak
        const statCurrent = document.getElementById('statCurrentStreak');
        const statLongest = document.getElementById('statLongestStreak');
        const statStreakStatus = document.getElementById('statStreakStatus');

        if (statCurrent) {
            statCurrent.innerHTML = `${streaks.currentStreak} <span class="unit">day${streaks.currentStreak === 1 ? '' : 's'}</span>`;
        }
        if (statLongest) {
            statLongest.innerHTML = `${streaks.longestStreak} <span class="unit">day${streaks.longestStreak === 1 ? '' : 's'}</span>`;
        }

        if (statStreakStatus) {
            if (dayStats.totalActive === 0) {
                statStreakStatus.textContent = 'Add your first habit to begin building streaks';
            } else if (dayStats.isQualifying) {
                statStreakStatus.textContent = `Today complete! 🔥 Streak extended to ${streaks.currentStreak} day${streaks.currentStreak === 1 ? '' : 's'}`;
            } else if (streaks.currentStreak > 0) {
                statStreakStatus.textContent = `${streaks.currentStreak}-day streak active. Complete today to extend it!`;
            } else {
                statStreakStatus.textContent = 'Complete all habits today to start a streak';
            }
        }
    }
})();
