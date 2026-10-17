/**
 * StreakUp - Daily Habit Tracker Logic
 * Manages daily date selection, habit completion checklist, daily metrics, and streak status.
 */

(function () {
    let selectedDate = null;

    document.addEventListener('DOMContentLoaded', () => {
        // Ensure user is authenticated
        if (!window.StorageService || !window.StorageService.getUser()) {
            return;
        }

        // Support URL query param ?date=YYYY-MM-DD (e.g. from monthly calendar click)
        const urlParams = new URLSearchParams(window.location.search);
        const paramDate = urlParams.get('date');

        if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) {
            selectedDate = paramDate;
        } else {
            selectedDate = window.StorageService.getTodayDate();
        }

        initTracker();
    });

    function initTracker() {
        const dateInput = document.getElementById('selectedDateInput');
        const prevBtn = document.getElementById('prevDayBtn');
        const nextBtn = document.getElementById('nextDayBtn');
        const todayBtn = document.getElementById('todayBtn');

        if (dateInput) {
            dateInput.value = selectedDate;
            dateInput.addEventListener('change', (e) => {
                if (e.target.value) {
                    setDate(e.target.value);
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                setDate(window.StorageService.addDays(selectedDate, -1));
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                setDate(window.StorageService.addDays(selectedDate, 1));
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                setDate(window.StorageService.getTodayDate());
            });
        }

        renderDayView();
    }

    function setDate(newDateStr) {
        selectedDate = newDateStr;
        const dateInput = document.getElementById('selectedDateInput');
        if (dateInput) {
            dateInput.value = selectedDate;
        }
        renderDayView();
    }

    function renderDayView() {
        const todayStr = window.StorageService.getTodayDate();
        const isToday = selectedDate === todayStr;
        const isFuture = selectedDate > todayStr;
        const isPast = selectedDate < todayStr;

        // Update Date Display & Badges
        const displayDate = document.getElementById('displaySelectedDate');
        const relativeBadge = document.getElementById('dateRelativeBadge');
        const futureWarning = document.getElementById('futureWarning');

        if (displayDate) {
            displayDate.textContent = window.StorageService.formatDisplayDate(selectedDate, true);
        }

        if (relativeBadge) {
            if (isToday) {
                relativeBadge.textContent = 'Today';
                relativeBadge.className = 'badge badge-today';
            } else if (isFuture) {
                relativeBadge.textContent = 'Future Date';
                relativeBadge.className = 'badge badge-future';
            } else {
                relativeBadge.textContent = 'Past Record';
                relativeBadge.className = 'badge badge-past';
            }
        }

        if (futureWarning) {
            futureWarning.style.display = isFuture ? 'block' : 'none';
        }

        // Calculate Day Stats
        const stats = window.StorageService.getDayStats(selectedDate);
        const dayStatusCard = document.getElementById('dayStatusCard');
        const statusBadgeLg = document.getElementById('statusBadgeLg');
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        const dailyPercentage = document.getElementById('dailyPercentage');
        const dailyFraction = document.getElementById('dailyFraction');
        const dailyProgressBar = document.getElementById('dailyProgressBar');
        const dateStatusDescription = document.getElementById('dateStatusDescription');

        // Reset classes
        if (dayStatusCard) {
            dayStatusCard.className = 'card status-indicator-card';
        }

        if (isFuture) {
            if (statusIcon) statusIcon.textContent = '🔮';
            if (statusText) statusText.textContent = 'Future Date';
            if (dailyPercentage) dailyPercentage.textContent = '—';
            if (dailyFraction) dailyFraction.textContent = `${stats.totalActive} active habits scheduled`;
            if (dailyProgressBar) {
                dailyProgressBar.style.width = '0%';
                dailyProgressBar.className = 'progress-bar';
            }
            if (dateStatusDescription) {
                dateStatusDescription.textContent = 'Habits cannot be logged in advance for future dates.';
            }
            if (dayStatusCard) dayStatusCard.classList.add('status-future');
        } else if (stats.totalActive === 0) {
            if (statusIcon) statusIcon.textContent = '🌱';
            if (statusText) statusText.textContent = 'No Active Habits';
            if (dailyPercentage) dailyPercentage.textContent = '0%';
            if (dailyFraction) dailyFraction.textContent = '0 / 0';
            if (dailyProgressBar) {
                dailyProgressBar.style.width = '0%';
                dailyProgressBar.className = 'progress-bar';
            }
            if (dateStatusDescription) {
                dateStatusDescription.textContent = isToday
                    ? 'You have not added any habits yet. Add habits on your dashboard to begin tracking!'
                    : 'No habits were active on this date.';
            }
            if (dayStatusCard) dayStatusCard.classList.add('status-empty');
        } else if (stats.isQualifying) {
            if (statusIcon) statusIcon.textContent = '✅';
            if (statusText) statusText.textContent = '100% Completed';
            if (dailyPercentage) dailyPercentage.textContent = '100%';
            if (dailyFraction) dailyFraction.textContent = `${stats.completedCount} / ${stats.totalActive}`;
            if (dailyProgressBar) {
                dailyProgressBar.style.width = '100%';
                dailyProgressBar.className = 'progress-bar is-full';
            }
            if (dateStatusDescription) {
                dateStatusDescription.textContent = 'All active habits were completed! This day qualifies for your streak.';
            }
            if (dayStatusCard) dayStatusCard.classList.add('status-qualifying');
        } else {
            // Incomplete (< 100%)
            const remaining = stats.totalActive - stats.completedCount;
            if (statusIcon) statusIcon.textContent = '⚠️';
            if (statusText) statusText.textContent = 'Incomplete';
            if (dailyPercentage) dailyPercentage.textContent = `${stats.percentage}%`;
            if (dailyFraction) dailyFraction.textContent = `${stats.completedCount} / ${stats.totalActive}`;
            if (dailyProgressBar) {
                dailyProgressBar.style.width = `${stats.percentage}%`;
                dailyProgressBar.className = 'progress-bar is-partial';
            }
            if (dateStatusDescription) {
                dateStatusDescription.textContent = isToday
                    ? `${remaining} habit${remaining === 1 ? '' : 's'} remaining today to qualify for your streak!`
                    : `Incomplete day: ${remaining} of ${stats.totalActive} habit${remaining === 1 ? '' : 's'} missed.`;
            }
            if (dayStatusCard) dayStatusCard.classList.add('status-incomplete');
        }

        // Render streaks
        const streaks = window.StorageService.calculateStreaks();
        const streakCurr = document.getElementById('trackerCurrentStreak');
        const streakLong = document.getElementById('trackerLongestStreak');
        if (streakCurr) {
            streakCurr.textContent = `${streaks.currentStreak} day${streaks.currentStreak === 1 ? '' : 's'}`;
        }
        if (streakLong) {
            streakLong.textContent = `${streaks.longestStreak} day${streaks.longestStreak === 1 ? '' : 's'}`;
        }

        // Render Habits Checklist
        renderHabitsList(stats.habits, isFuture);
    }

    function renderHabitsList(habitsWithStatus, isFuture) {
        const container = document.getElementById('dailyHabitsContainer');
        const subtitle = document.getElementById('checklistSubtitle');
        if (!container) return;

        if (subtitle) {
            subtitle.textContent = `Showing all habits that were active on ${window.StorageService.formatDisplayDate(selectedDate, false)}.`;
        }

        if (habitsWithStatus.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Habits Active For This Date</h3>
                    <p>Habits only apply to dates after they were created, until their deletion date.</p>
                    <a href="home.html" class="btn btn-outline" style="margin-top: 10px;">Go to Dashboard to Add Habits</a>
                </div>
            `;
            return;
        }

        container.innerHTML = habitsWithStatus.map(item => {
            const h = item.habit;
            const completed = item.completed;
            const statusClass = completed ? 'completed' : 'pending';

            return `
                <div class="habit-card ${statusClass}" data-habit-id="${h.id}">
                    <div class="habit-main">
                        <label class="checkbox-container" title="${isFuture ? 'Cannot mark future habits' : 'Toggle habit completion'}">
                            <input 
                                type="checkbox" 
                                class="habit-toggle-cb" 
                                data-id="${h.id}"
                                ${completed ? 'checked' : ''}
                                ${isFuture ? 'disabled' : ''}
                                aria-label="Mark ${escapeHtml(h.name)} as completed"
                            >
                            <span class="checkmark"></span>
                        </label>
                        <div class="habit-info">
                            <span class="habit-name ${completed ? 'is-done' : ''}">${escapeHtml(h.name)}</span>
                            <span class="habit-meta">
                                Started: ${window.StorageService.formatDisplayDate(h.createdAt, false)}
                                ${h.archivedAt ? ` &bull; (Archived on ${window.StorageService.formatDisplayDate(h.archivedAt, false)})` : ''}
                            </span>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <span class="badge ${completed ? 'badge-success' : 'badge-neutral'}">
                            ${completed ? 'Completed ✓' : 'Incomplete'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        // Attach toggle listeners
        if (!isFuture) {
            container.querySelectorAll('.habit-toggle-cb').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const habitId = e.target.getAttribute('data-id');
                    window.StorageService.setHabitCompletion(selectedDate, habitId);
                    renderDayView();
                });
            });
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
