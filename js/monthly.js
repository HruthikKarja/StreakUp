/**
 * StreakUp - Monthly Calendar & History Logic
 * Generates monthly calendar grid, displays historical day breakdowns,
 * and calculates monthly consistency metrics without mutating stored data.
 */

(function () {
    let currentYear;
    let currentMonth; // 0-indexed (0 = Jan, 11 = Dec)
    let selectedDateStr = null;

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    document.addEventListener('DOMContentLoaded', () => {
        // Ensure user is authenticated
        if (!window.StorageService || !window.StorageService.getUser()) {
            return;
        }

        const today = new Date();
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();
        selectedDateStr = window.StorageService.getTodayDate();

        initCalendar();
    });

    function initCalendar() {
        const prevBtn = document.getElementById('prevMonthBtn');
        const nextBtn = document.getElementById('nextMonthBtn');
        const currentBtn = document.getElementById('currentMonthBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                updateMonthView();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                updateMonthView();
            });
        }

        if (currentBtn) {
            currentBtn.addEventListener('click', () => {
                const today = new Date();
                currentYear = today.getFullYear();
                currentMonth = today.getMonth();
                selectedDateStr = window.StorageService.getTodayDate();
                updateMonthView();
            });
        }

        updateMonthView();
    }

    function updateMonthView() {
        // Update Month Title
        const monthTitle = document.getElementById('currentMonthYear');
        if (monthTitle) {
            monthTitle.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
        }

        // Render Calendar Grid
        renderCalendarGrid();

        // Calculate and render monthly stats
        renderMonthlyStats();

        // Render Day Details for current selection
        renderDayDetails(selectedDateStr);
    }

    function renderCalendarGrid() {
        const grid = document.getElementById('calendarDaysGrid');
        if (!grid) return;

        grid.innerHTML = '';

        const todayStr = window.StorageService.getTodayDate();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

        // 1. Add blank padding cells for days before the 1st
        for (let i = 0; i < firstDayIndex; i++) {
            const blankCell = document.createElement('div');
            blankCell.className = 'calendar-day day-empty';
            blankCell.setAttribute('aria-hidden', 'true');
            grid.appendChild(blankCell);
        }

        // 2. Add each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = String(day).padStart(2, '0');
            const monthStr = String(currentMonth + 1).padStart(2, '0');
            const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

            const stats = window.StorageService.getDayStats(dateStr);
            const isToday = (dateStr === todayStr);
            const isSelected = (dateStr === selectedDateStr);
            const isFuture = (dateStr > todayStr);

            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.setAttribute('role', 'gridcell');
            dayCell.setAttribute('tabindex', '0');
            dayCell.setAttribute('data-date', dateStr);

            // Determine status style classes
            if (isFuture) {
                dayCell.classList.add('day-future');
            } else if (stats.totalActive === 0) {
                dayCell.classList.add('day-neutral');
            } else if (stats.isQualifying) {
                dayCell.classList.add('day-completed');
            } else {
                dayCell.classList.add('day-incomplete');
            }

            if (isToday) dayCell.classList.add('is-today');
            if (isSelected) dayCell.classList.add('is-selected');

            // Cell Content
            let pillText = '—';
            let pillClass = 'day-status-pill';

            if (isFuture) {
                pillText = '—';
            } else if (stats.totalActive === 0) {
                pillText = 'None';
            } else if (stats.isQualifying) {
                pillText = '100%';
                pillClass += ' pill-success';
            } else {
                pillText = `${stats.percentage}%`;
                pillClass += ' pill-incomplete';
            }

            dayCell.innerHTML = `
                <div class="day-cell-header">
                    <span class="day-number">${day}</span>
                    ${isToday ? '<span class="today-indicator">Today</span>' : ''}
                </div>
                <div class="day-cell-body">
                    <span class="${pillClass}">${pillText}</span>
                </div>
            `;

            // Click & Keyboard handlers
            const selectAction = () => {
                selectedDateStr = dateStr;
                // Update selection highlight in grid
                grid.querySelectorAll('.calendar-day').forEach(cell => cell.classList.remove('is-selected'));
                dayCell.classList.add('is-selected');
                renderDayDetails(dateStr);
            };

            dayCell.addEventListener('click', selectAction);
            dayCell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectAction();
                }
            });

            grid.appendChild(dayCell);
        }
    }

    function renderMonthlyStats() {
        const todayStr = window.StorageService.getTodayDate();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        let qualifyingCount = 0;
        let incompleteCount = 0;
        let activeDaysCount = 0;
        let elapsedDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = String(day).padStart(2, '0');
            const monthStr = String(currentMonth + 1).padStart(2, '0');
            const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

            if (dateStr <= todayStr) {
                elapsedDays++;
                const stats = window.StorageService.getDayStats(dateStr);

                if (stats.totalActive > 0) {
                    activeDaysCount++;
                    if (stats.isQualifying) {
                        qualifyingCount++;
                    } else {
                        incompleteCount++;
                    }
                }
            }
        }

        const consistencyRate = activeDaysCount > 0 
            ? Math.round((qualifyingCount / activeDaysCount) * 100) 
            : 0;

        // Populate DOM elements
        const totalDaysEl = document.getElementById('monthTotalDays');
        const elapsedDaysEl = document.getElementById('monthElapsedDays');
        const qualifyingDaysEl = document.getElementById('monthQualifyingDays');
        const incompleteDaysEl = document.getElementById('monthIncompleteDays');
        const consistencyRateEl = document.getElementById('monthConsistencyRate');

        if (totalDaysEl) totalDaysEl.textContent = daysInMonth;
        if (elapsedDaysEl) elapsedDaysEl.textContent = `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} elapsed`;
        if (qualifyingDaysEl) qualifyingDaysEl.textContent = qualifyingCount;
        if (incompleteDaysEl) incompleteDaysEl.textContent = incompleteCount;
        if (consistencyRateEl) consistencyRateEl.textContent = `${consistencyRate}%`;
    }

    function renderDayDetails(dateStr) {
        if (!dateStr) return;

        const stats = window.StorageService.getDayStats(dateStr);
        const todayStr = window.StorageService.getTodayDate();
        const isFuture = dateStr > todayStr;
        const isToday = dateStr === todayStr;

        const titleEl = document.getElementById('selectedDateTitle');
        const badgeEl = document.getElementById('selectedDateStatusBadge');
        const percentEl = document.getElementById('selectedDatePercent');
        const barEl = document.getElementById('selectedDateProgressBar');
        const fractionEl = document.getElementById('selectedDateFractionText');
        const habitsListEl = document.getElementById('selectedDateHabitsList');
        const openBtn = document.getElementById('openInTrackerBtn');

        if (titleEl) {
            titleEl.textContent = `${window.StorageService.formatDisplayDate(dateStr, true)} ${isToday ? '(Today)' : ''}`;
        }

        if (openBtn) {
            openBtn.href = `streak.html?date=${dateStr}`;
        }

        // Status badge, percentage, progress bar
        if (isFuture) {
            if (badgeEl) {
                badgeEl.textContent = 'Future Date';
                badgeEl.className = 'badge badge-future';
            }
            if (percentEl) percentEl.textContent = '—';
            if (barEl) {
                barEl.style.width = '0%';
                barEl.className = 'progress-bar';
            }
            if (fractionEl) fractionEl.textContent = `${stats.totalActive} active habit${stats.totalActive === 1 ? '' : 's'} scheduled`;
        } else if (stats.totalActive === 0) {
            if (badgeEl) {
                badgeEl.textContent = 'No Active Habits';
                badgeEl.className = 'badge badge-neutral';
            }
            if (percentEl) percentEl.textContent = '0%';
            if (barEl) {
                barEl.style.width = '0%';
                barEl.className = 'progress-bar';
            }
            if (fractionEl) fractionEl.textContent = '0 of 0 habits active';
        } else if (stats.isQualifying) {
            if (badgeEl) {
                badgeEl.textContent = '100% Completed ✓';
                badgeEl.className = 'badge badge-success';
            }
            if (percentEl) percentEl.textContent = '100%';
            if (barEl) {
                barEl.style.width = '100%';
                barEl.className = 'progress-bar is-full';
            }
            if (fractionEl) fractionEl.textContent = `${stats.completedCount} of ${stats.totalActive} habits completed`;
        } else {
            if (badgeEl) {
                badgeEl.textContent = 'Incomplete';
                badgeEl.className = 'badge badge-danger';
            }
            if (percentEl) percentEl.textContent = `${stats.percentage}%`;
            if (barEl) {
                barEl.style.width = `${stats.percentage}%`;
                barEl.className = 'progress-bar is-partial';
            }
            if (fractionEl) fractionEl.textContent = `${stats.completedCount} of ${stats.totalActive} habits completed`;
        }

        // Active habits breakdown on this specific date
        if (habitsListEl) {
            if (stats.habits.length === 0) {
                habitsListEl.innerHTML = `
                    <div class="empty-state-mini">
                        <p>No habits were active on this date.</p>
                    </div>
                `;
                return;
            }

            habitsListEl.innerHTML = stats.habits.map(item => {
                const habit = item.habit;
                const isCompleted = item.completed;
                let statusBadgeText = isCompleted ? 'Completed ✓' : 'Missed ✗';
                let statusBadgeClass = isCompleted ? 'badge-success' : 'badge-danger';

                if (isFuture) {
                    statusBadgeText = 'Scheduled';
                    statusBadgeClass = 'badge-neutral';
                }

                return `
                    <div class="day-habit-item ${isCompleted ? 'is-completed' : ''}">
                        <div class="item-name-wrap">
                            <span class="status-symbol">${isCompleted ? '✅' : (isFuture ? '⏳' : '❌')}</span>
                            <span class="item-name">${escapeHtml(habit.name)}</span>
                            ${habit.archivedAt ? '<span class="item-archived-tag">(Archived)</span>' : ''}
                        </div>
                        <span class="badge ${statusBadgeClass}">${statusBadgeText}</span>
                    </div>
                `;
            }).join('');
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
