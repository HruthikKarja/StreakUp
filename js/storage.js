/**
 * StreakUp - Shared Data Persistence & Storage Service
 * Single source of truth for habits, daily records, streaks, and session data.
 */

const StorageKeys = {
    USER: 'streakup_user',
    HABITS: 'streakup_habits',
    RECORDS: 'streakup_records'
};

const StorageService = {
    /**
     * Format a Date object to 'YYYY-MM-DD' in local time (prevents timezone shifts).
     * @param {Date} [d=new Date()]
     * @returns {string}
     */
    formatLocalDate(d = new Date()) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Parse a 'YYYY-MM-DD' string to a Date object at local midnight.
     * @param {string} dateStr
     * @returns {Date}
     */
    parseLocalDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    },

    /**
     * Get today's date formatted as 'YYYY-MM-DD'.
     * @returns {string}
     */
    getTodayDate() {
        return this.formatLocalDate(new Date());
    },

    /**
     * Add N days to a 'YYYY-MM-DD' date string.
     * @param {string} dateStr
     * @param {number} n
     * @returns {string}
     */
    addDays(dateStr, n) {
        const d = this.parseLocalDate(dateStr);
        d.setDate(d.getDate() + n);
        return this.formatLocalDate(d);
    },

    /**
     * Format date for user-friendly display.
     * @param {string} dateStr 'YYYY-MM-DD'
     * @param {boolean} [includeWeekday=true]
     * @returns {string}
     */
    formatDisplayDate(dateStr, includeWeekday = true) {
        const d = this.parseLocalDate(dateStr);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        if (includeWeekday) {
            options.weekday = 'short';
        }
        return d.toLocaleDateString(undefined, options);
    },

    // -------------------------------------------------------------
    // Session / User Management
    // -------------------------------------------------------------

    getUser() {
        try {
            const raw = localStorage.getItem(StorageKeys.USER);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Error reading user session:', e);
            return null;
        }
    },

    setUser(user) {
        try {
            localStorage.setItem(StorageKeys.USER, JSON.stringify(user));
        } catch (e) {
            console.error('Error saving user session:', e);
        }
    },

    clearUser() {
        try {
            localStorage.removeItem(StorageKeys.USER);
        } catch (e) {
            console.error('Error clearing user session:', e);
        }
    },

    // -------------------------------------------------------------
    // Habit Management
    // -------------------------------------------------------------

    /**
     * Retrieve all habits (active and archived).
     * @returns {Array<{id: string, name: string, createdAt: string, archivedAt: string|null}>}
     */
    getHabits() {
        try {
            const raw = localStorage.getItem(StorageKeys.HABITS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error reading habits from storage:', e);
            return [];
        }
    },

    /**
     * Save habits array to localStorage.
     * @param {Array} habits
     */
    saveHabits(habits) {
        try {
            localStorage.setItem(StorageKeys.HABITS, JSON.stringify(habits));
        } catch (e) {
            console.error('Error saving habits:', e);
        }
    },

    /**
     * Add a new habit.
     * @param {string} name
     * @param {string} [dateStr]
     * @returns {{success: boolean, habit?: object, error?: string}}
     */
    addHabit(name, dateStr = this.getTodayDate()) {
        const trimmed = (name || '').trim();
        if (!trimmed) {
            return { success: false, error: 'Habit name cannot be empty.' };
        }
        if (trimmed.length < 2) {
            return { success: false, error: 'Habit name must be at least 2 characters.' };
        }

        const habits = this.getHabits();

        // Check for duplicates among currently active habits
        const duplicate = habits.some(
            h => !h.archivedAt && h.name.trim().toLowerCase() === trimmed.toLowerCase()
        );

        if (duplicate) {
            return { success: false, error: `An active habit named "${trimmed}" already exists.` };
        }

        const newHabit = {
            id: 'habit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            name: trimmed,
            createdAt: dateStr,
            archivedAt: null
        };

        habits.push(newHabit);
        this.saveHabits(habits);

        return { success: true, habit: newHabit };
    },

    /**
     * Soft-delete a habit on a given date.
     * Preserves historical completion data before this date.
     * @param {string} habitId
     * @param {string} [archiveDateStr]
     * @returns {{success: boolean, error?: string}}
     */
    deleteHabit(habitId, archiveDateStr = this.getTodayDate()) {
        const habits = this.getHabits();
        const habit = habits.find(h => h.id === habitId);

        if (!habit) {
            return { success: false, error: 'Habit not found.' };
        }

        // Set archivedAt to archiveDateStr so it is no longer active from this date onwards
        habit.archivedAt = archiveDateStr;
        this.saveHabits(habits);

        return { success: true };
    },

    /**
     * Check if a habit was active on a specific date.
     * Historical rule:
     * Active on date D iff createdAt <= D AND (archivedAt is null OR archivedAt > D)
     * @param {object} habit
     * @param {string} dateStr 'YYYY-MM-DD'
     * @returns {boolean}
     */
    isHabitActiveOnDate(habit, dateStr) {
        if (!habit || !habit.createdAt) return false;
        if (habit.createdAt > dateStr) return false;
        if (habit.archivedAt && habit.archivedAt <= dateStr) return false;
        return true;
    },

    /**
     * Get all habits active on a specific date.
     * @param {string} dateStr 'YYYY-MM-DD'
     * @returns {Array<object>}
     */
    getActiveHabitsForDate(dateStr) {
        const habits = this.getHabits();
        return habits.filter(h => this.isHabitActiveOnDate(h, dateStr));
    },

    // -------------------------------------------------------------
    // Daily Records Management
    // -------------------------------------------------------------

    /**
     * Retrieve all completion records.
     * Stored as: { [dateStr]: { [habitId]: boolean } }
     * @returns {Object}
     */
    getRecords() {
        try {
            const raw = localStorage.getItem(StorageKeys.RECORDS);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
        } catch (e) {
            console.error('Error reading records:', e);
            return {};
        }
    },

    /**
     * Save all records to localStorage.
     * @param {Object} records
     */
    saveRecords(records) {
        try {
            localStorage.setItem(StorageKeys.RECORDS, JSON.stringify(records));
        } catch (e) {
            console.error('Error saving records:', e);
        }
    },

    /**
     * Get completion status for a habit on a date.
     * @param {string} dateStr
     * @param {string} habitId
     * @returns {boolean}
     */
    isHabitCompleted(dateStr, habitId) {
        const records = this.getRecords();
        return Boolean(records[dateStr] && records[dateStr][habitId] === true);
    },

    /**
     * Toggle or set completion status for a habit on a date.
     * @param {string} dateStr
     * @param {string} habitId
     * @param {boolean} [forceStatus]
     * @returns {boolean} The new completion status
     */
    setHabitCompletion(dateStr, habitId, forceStatus = null) {
        const records = this.getRecords();
        if (!records[dateStr]) {
            records[dateStr] = {};
        }

        const currentStatus = Boolean(records[dateStr][habitId]);
        const newStatus = forceStatus !== null ? Boolean(forceStatus) : !currentStatus;

        records[dateStr][habitId] = newStatus;
        this.saveRecords(records);

        return newStatus;
    },

    // -------------------------------------------------------------
    // Daily & Monthly Statistics Calculations
    // -------------------------------------------------------------

    /**
     * Calculate statistics for a single date.
     * @param {string} dateStr 'YYYY-MM-DD'
     * @returns {{
     *   date: string,
     *   totalActive: number,
     *   completedCount: number,
     *   percentage: number,
     *   isQualifying: boolean,
     *   status: 'qualifying'|'incomplete'|'empty'|'future',
     *   habits: Array<{habit: object, completed: boolean}>
     * }}
     */
    getDayStats(dateStr) {
        const todayStr = this.getTodayDate();
        const isFuture = dateStr > todayStr;
        const activeHabits = this.getActiveHabitsForDate(dateStr);
        const records = this.getRecords();
        const dayRecord = records[dateStr] || {};

        const totalActive = activeHabits.length;
        const habitsWithStatus = activeHabits.map(h => ({
            habit: h,
            completed: Boolean(dayRecord[h.id] === true)
        }));

        const completedCount = habitsWithStatus.filter(item => item.completed).length;

        if (isFuture) {
            return {
                date: dateStr,
                totalActive,
                completedCount: 0,
                percentage: 0,
                isQualifying: false,
                status: 'future',
                habits: habitsWithStatus
            };
        }

        if (totalActive === 0) {
            return {
                date: dateStr,
                totalActive: 0,
                completedCount: 0,
                percentage: 0,
                isQualifying: false,
                status: 'empty',
                habits: []
            };
        }

        const percentage = Math.round((completedCount / totalActive) * 100);
        const isQualifying = completedCount === totalActive;

        return {
            date: dateStr,
            totalActive,
            completedCount,
            percentage,
            isQualifying,
            status: isQualifying ? 'qualifying' : 'incomplete',
            habits: habitsWithStatus
        };
    },

    // -------------------------------------------------------------
    // Streak Calculations
    // -------------------------------------------------------------

    /**
     * Calculate both Current Streak and Longest Streak based on historical data.
     *
     * Rules:
     * - A day qualifies when all active habits on that date are completed (100% and totalActive > 0).
     * - Days with 0 active habits do not qualify and do not award a streak.
     * - A missed day (< 100% when active habits exist) breaks the streak.
     * - If today is already qualifying (100%), current streak includes today.
     * - If today is not yet qualifying, current streak is the streak through yesterday.
     *   (If yesterday was not qualifying or had 0 habits, current streak is 0).
     * - Longest streak is the maximum sequence of consecutive qualifying days ever achieved.
     *
     * @returns {{currentStreak: number, longestStreak: number}}
     */
    calculateStreaks() {
        const todayStr = this.getTodayDate();
        const habits = this.getHabits();

        if (habits.length === 0) {
            return { currentStreak: 0, longestStreak: 0 };
        }

        // Find earliest habit creation date
        const creationDates = habits.map(h => h.createdAt).filter(Boolean).sort();
        if (creationDates.length === 0) {
            return { currentStreak: 0, longestStreak: 0 };
        }
        const earliestDateStr = creationDates[0];

        // 1. Calculate Current Streak
        const todayStats = this.getDayStats(todayStr);
        let currentStreak = 0;
        let checkDateStr;

        if (todayStats.isQualifying) {
            // Today qualifies! Start counting backwards from today
            currentStreak = 1;
            checkDateStr = this.addDays(todayStr, -1);
        } else {
            // Today is not yet qualifying. Check yesterday.
            checkDateStr = this.addDays(todayStr, -1);
        }

        // Continue going backwards day by day as long as checkDateStr is qualifying
        while (checkDateStr >= earliestDateStr) {
            const stats = this.getDayStats(checkDateStr);
            if (stats.isQualifying) {
                currentStreak++;
                checkDateStr = this.addDays(checkDateStr, -1);
            } else {
                break;
            }
        }

        // 2. Calculate Longest Streak across all dates from earliestDateStr up to todayStr
        let maxStreak = 0;
        let runningStreak = 0;
        let cursorDateStr = earliestDateStr;

        while (cursorDateStr <= todayStr) {
            const stats = this.getDayStats(cursorDateStr);

            if (cursorDateStr === todayStr) {
                // Today: only increments running streak if it actually qualifies
                if (stats.isQualifying) {
                    runningStreak++;
                    if (runningStreak > maxStreak) {
                        maxStreak = runningStreak;
                    }
                } else {
                    // Today is incomplete, but previous runningStreak up to yesterday
                    // is already accounted for in maxStreak!
                    if (runningStreak > maxStreak) {
                        maxStreak = runningStreak;
                    }
                }
            } else {
                if (stats.isQualifying) {
                    runningStreak++;
                    if (runningStreak > maxStreak) {
                        maxStreak = runningStreak;
                    }
                } else {
                    runningStreak = 0;
                }
            }

            cursorDateStr = this.addDays(cursorDateStr, 1);
        }

        return {
            currentStreak,
            longestStreak: Math.max(maxStreak, currentStreak)
        };
    }
};

// Expose globally for script tags without module loaders
window.StorageService = StorageService;
