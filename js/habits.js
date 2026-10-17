/**
 * StreakUp - Habit Management Component
 * Handles creating habits, active habits rendering, deletion with confirmation,
 * and completion toggling.
 */

const HabitManager = {
    /**
     * Initialize habit management on a page.
     * @param {Object} options
     * @param {string} [options.formId='addHabitForm']
     * @param {string} [options.inputId='habitNameInput']
     * @param {string} [options.errorId='habitFormError']
     * @param {string} [options.containerId='activeHabitsList']
     * @param {string} [options.dateStr] Default: today's date
     * @param {boolean} [options.allowCheck=true] Show completion checkbox
     * @param {Function} [options.onUpdate] Callback after add/delete/toggle
     */
    init(options = {}) {
        this.options = Object.assign({
            formId: 'addHabitForm',
            inputId: 'habitNameInput',
            errorId: 'habitFormError',
            containerId: 'activeHabitsList',
            dateStr: window.StorageService.getTodayDate(),
            allowCheck: true,
            onUpdate: null
        }, options);

        this.bindEvents();
        this.render();
    },

    bindEvents() {
        const form = document.getElementById(this.options.formId);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddHabit();
            });
        }
    },

    handleAddHabit() {
        const input = document.getElementById(this.options.inputId);
        const errorEl = document.getElementById(this.options.errorId);
        if (!input) return;

        const name = input.value.trim();
        if (errorEl) errorEl.textContent = '';

        const result = window.StorageService.addHabit(name, this.options.dateStr);

        if (!result.success) {
            if (errorEl) {
                errorEl.textContent = result.error;
            } else {
                alert(result.error);
            }
            return;
        }

        // Successfully added
        input.value = '';
        if (errorEl) errorEl.textContent = '';

        this.render();

        if (typeof this.options.onUpdate === 'function') {
            this.options.onUpdate();
        }
    },

    handleDeleteHabit(habitId, habitName) {
        const confirmed = window.confirm(
            `Are you sure you want to delete the habit "${habitName}"?\n\nHistorical records from previous days will be preserved, but it will be removed from your active habits.`
        );

        if (!confirmed) return;

        const result = window.StorageService.deleteHabit(habitId, this.options.dateStr);
        if (!result.success) {
            alert(result.error || 'Failed to delete habit.');
            return;
        }

        this.render();

        if (typeof this.options.onUpdate === 'function') {
            this.options.onUpdate();
        }
    },

    handleToggleHabit(habitId) {
        window.StorageService.setHabitCompletion(this.options.dateStr, habitId);
        this.render();

        if (typeof this.options.onUpdate === 'function') {
            this.options.onUpdate();
        }
    },

    render() {
        const container = document.getElementById(this.options.containerId);
        if (!container) return;

        const dateStr = this.options.dateStr;
        const activeHabits = window.StorageService.getActiveHabitsForDate(dateStr);
        const todayStr = window.StorageService.getTodayDate();
        const isFuture = dateStr > todayStr;

        if (activeHabits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🌱</div>
                    <h3>No Active Habits</h3>
                    <p>${dateStr === todayStr 
                        ? 'You do not have any active habits yet. Add your first habit above to begin building consistency!' 
                        : 'No habits were active on this date.'}</p>
                </div>
            `;
            return;
        }

        const records = window.StorageService.getRecords();
        const dayRecord = records[dateStr] || {};

        container.innerHTML = activeHabits.map(habit => {
            const isCompleted = Boolean(dayRecord[habit.id]);
            const statusClass = isCompleted ? 'completed' : 'pending';

            return `
                <div class="habit-card ${statusClass}" data-habit-id="${habit.id}">
                    <div class="habit-main">
                        ${this.options.allowCheck ? `
                            <label class="checkbox-container" title="${isFuture ? 'Cannot mark future habits' : 'Toggle completion'}">
                                <input 
                                    type="checkbox" 
                                    class="habit-checkbox" 
                                    data-id="${habit.id}"
                                    ${isCompleted ? 'checked' : ''}
                                    ${isFuture ? 'disabled' : ''}
                                    aria-label="Mark ${habit.name} as complete"
                                >
                                <span class="checkmark"></span>
                            </label>
                        ` : ''}
                        <div class="habit-info">
                            <span class="habit-name ${isCompleted ? 'is-done' : ''}">${this.escapeHtml(habit.name)}</span>
                            <span class="habit-meta">Created on ${window.StorageService.formatDisplayDate(habit.createdAt, false)}</span>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <span class="badge ${isCompleted ? 'badge-success' : 'badge-neutral'}">
                            ${isCompleted ? 'Completed ✓' : 'Incomplete'}
                        </span>
                        <button 
                            type="button" 
                            class="btn-icon delete-habit-btn" 
                            data-id="${habit.id}" 
                            data-name="${this.escapeHtml(habit.name)}"
                            title="Delete habit"
                            aria-label="Delete ${habit.name}"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners for checkboxes
        if (this.options.allowCheck && !isFuture) {
            container.querySelectorAll('.habit-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const habitId = e.target.getAttribute('data-id');
                    this.handleToggleHabit(habitId);
                });
            });
        }

        // Attach delete listeners
        container.querySelectorAll('.delete-habit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const habitId = btn.getAttribute('data-id');
                const habitName = btn.getAttribute('data-name');
                this.handleDeleteHabit(habitId, habitName);
            });
        });
    },

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

window.HabitManager = HabitManager;
