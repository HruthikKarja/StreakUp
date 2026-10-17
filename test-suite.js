/**
 * StreakUp Comprehensive Automated Verification Suite
 */

// Mock window and localStorage for headless Node environment
const store = new Map();
global.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
};
global.window = {
    localStorage: global.localStorage
};

// Load storage.js
const fs = require('fs');
const path = require('path');
const storageCode = fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8');
eval(storageCode);

const StorageService = global.StorageService || window.StorageService;

function assert(condition, message) {
    if (!condition) {
        console.error('❌ FAIL:', message);
        process.exit(1);
    } else {
        console.log('✅ PASS:', message);
    }
}

console.log('--- TEST SUITE: StreakUp Core Logic & Historical Integrity ---');

// Test 1: Date formatting and parsing without timezone drift
console.log('\n[Test 1] Date Utilities:');
const testDate = new Date(2026, 9, 17); // Oct 17, 2026
const formatted = StorageService.formatLocalDate(testDate);
assert(formatted === '2026-10-17', `formatLocalDate formatted correctly: ${formatted}`);

const parsed = StorageService.parseLocalDate('2026-10-17');
assert(parsed.getFullYear() === 2026 && parsed.getMonth() === 9 && parsed.getDate() === 17, 'parseLocalDate parsed year, month, date correctly');

const nextDay = StorageService.addDays('2026-10-31', 1);
assert(nextDay === '2026-11-01', `addDays across month boundary (Oct 31 -> Nov 01): ${nextDay}`);

const prevDay = StorageService.addDays('2026-03-01', -1);
assert(prevDay === '2026-02-28', `addDays across leap/month boundary (Mar 01 -> Feb 28 in 2026): ${prevDay}`);

// Test 2: User Authentication & Session
console.log('\n[Test 2] Session Management:');
assert(StorageService.getUser() === null, 'No initial user');
StorageService.setUser({ username: 'Alex', loggedInAt: '2026-10-17T10:00:00Z' });
const user = StorageService.getUser();
assert(user !== null && user.username === 'Alex', `User stored and retrieved: ${user && user.username}`);
StorageService.clearUser();
assert(StorageService.getUser() === null, 'User cleared on logout');

// Test 3: Adding Habits & Validation
console.log('\n[Test 3] Habit Management & Validation:');
localStorage.clear();

const emptyRes = StorageService.addHabit('   ');
assert(!emptyRes.success && emptyRes.error.includes('empty'), 'Empty habit name rejected');

const shortRes = StorageService.addHabit('A');
assert(!shortRes.success && shortRes.error.includes('at least 2'), 'Single character habit rejected');

const h1Res = StorageService.addHabit('Morning Run', '2026-10-10');
assert(h1Res.success && h1Res.habit.name === 'Morning Run', 'Added habit Morning Run on 2026-10-10');

const dupRes = StorageService.addHabit('morning run', '2026-10-10');
assert(!dupRes.success && dupRes.error.includes('already exists'), 'Duplicate habit name rejected (case-insensitive)');

const h2Res = StorageService.addHabit('Read 20 Pages', '2026-10-10');
const h3Res = StorageService.addHabit('Drink 2L Water', '2026-10-10');
const h4Res = StorageService.addHabit('Meditate 10 mins', '2026-10-10');
assert(StorageService.getHabits().length === 4, '4 active habits stored');

// Test 4: Historical Habit Activation Rules
console.log('\n[Test 4] Historical Habit Activation Rules:');
// Habits created on 2026-10-10 should NOT be active on 2026-10-09
const habitsBeforeCreation = StorageService.getActiveHabitsForDate('2026-10-09');
assert(habitsBeforeCreation.length === 0, '0 habits active before creation date 2026-10-09');

const habitsOnCreation = StorageService.getActiveHabitsForDate('2026-10-10');
assert(habitsOnCreation.length === 4, '4 habits active on creation date 2026-10-10');

// Test 5: Daily Completion Percentage & Edge Cases
console.log('\n[Test 5] Daily Percentage Calculations:');
// 0 active habits -> 0%
const statsEmpty = StorageService.getDayStats('2026-10-09');
assert(statsEmpty.percentage === 0 && statsEmpty.status === 'empty' && statsEmpty.isQualifying === false, '0 active habits handled safely without division by zero');

// 4 habits active, 2 completed -> 50%
const h1 = h1Res.habit.id;
const h2 = h2Res.habit.id;
const h3 = h3Res.habit.id;
const h4 = h4Res.habit.id;

StorageService.setHabitCompletion('2026-10-10', h1, true);
StorageService.setHabitCompletion('2026-10-10', h2, true);

const statsPartial = StorageService.getDayStats('2026-10-10');
assert(statsPartial.completedCount === 2 && statsPartial.totalActive === 4, '2 of 4 habits completed');
assert(statsPartial.percentage === 50, `Percentage is exactly 50%: got ${statsPartial.percentage}%`);
assert(statsPartial.isQualifying === false, 'Partial day (50%) is NOT qualifying');

// Complete remaining 2 habits -> 100%
StorageService.setHabitCompletion('2026-10-10', h3, true);
StorageService.setHabitCompletion('2026-10-10', h4, true);

const statsFull = StorageService.getDayStats('2026-10-10');
assert(statsFull.completedCount === 4 && statsFull.percentage === 100, '4 of 4 habits completed -> 100%');
assert(statsFull.isQualifying === true && statsFull.status === 'qualifying', '100% day qualifies for streak');

// Unmark one habit (mistake correction)
StorageService.setHabitCompletion('2026-10-10', h4, false);
const statsUnmarked = StorageService.getDayStats('2026-10-10');
assert(statsUnmarked.completedCount === 3 && statsUnmarked.percentage === 75, 'Unmarking works: 3/4 = 75%');
assert(statsUnmarked.isQualifying === false, 'Unmarked day drops qualification');

// Re-mark for following streak tests
StorageService.setHabitCompletion('2026-10-10', h4, true);

// Test 6: Consecutive Days & Streak Calculation
console.log('\n[Test 6] Streak Calculations (Current & Longest):');
// Suppose today is 2026-10-13
// We will test simulating consecutive days:
// Day 2026-10-10: 100%
// Day 2026-10-11: 100%
// Day 2026-10-12: 100%
// Day 2026-10-13 (today): Not yet completed

// Set 100% for 2026-10-11
[h1, h2, h3, h4].forEach(id => StorageService.setHabitCompletion('2026-10-11', id, true));
// Set 100% for 2026-10-12
[h1, h2, h3, h4].forEach(id => StorageService.setHabitCompletion('2026-10-12', id, true));

// Temporarily mock getTodayDate to return '2026-10-13'
const origGetToday = StorageService.getTodayDate;
StorageService.getTodayDate = () => '2026-10-13';

let streaks = StorageService.calculateStreaks();
assert(streaks.currentStreak === 3, `Current streak through yesterday is 3: got ${streaks.currentStreak}`);
assert(streaks.longestStreak === 3, `Longest streak is 3: got ${streaks.longestStreak}`);

// Now user completes today (2026-10-13) 100%
[h1, h2, h3, h4].forEach(id => StorageService.setHabitCompletion('2026-10-13', id, true));
streaks = StorageService.calculateStreaks();
assert(streaks.currentStreak === 4, `Completing today increases current streak to 4: got ${streaks.currentStreak}`);
assert(streaks.longestStreak === 4, `Longest streak is now 4: got ${streaks.longestStreak}`);

// Test 7: Streak Reset on Missed Day
console.log('\n[Test 7] Streak Reset on Missed Day:');
// Suppose today is 2026-10-15
// 2026-10-14 was MISSED (incomplete: only 1 habit completed)
StorageService.getTodayDate = () => '2026-10-15';
StorageService.setHabitCompletion('2026-10-14', h1, true); // only 1 of 4

streaks = StorageService.calculateStreaks();
assert(streaks.currentStreak === 0, `Missed yesterday resets current streak to 0: got ${streaks.currentStreak}`);
assert(streaks.longestStreak === 4, `Longest streak remains preserved at 4: got ${streaks.longestStreak}`);

// User completes today (2026-10-15) 100%
[h1, h2, h3, h4].forEach(id => StorageService.setHabitCompletion('2026-10-15', id, true));
streaks = StorageService.calculateStreaks();
assert(streaks.currentStreak === 1, `Completing today starts new streak at 1: got ${streaks.currentStreak}`);
assert(streaks.longestStreak === 4, `Longest streak remains 4: got ${streaks.longestStreak}`);

// Test 8: Adding a habit on a later date does NOT affect earlier records
console.log('\n[Test 8] Adding a habit later does not alter earlier history:');
// Add habit 5 on 2026-10-15
const h5Res = StorageService.addHabit('Evening Journal', '2026-10-15');
assert(h5Res.success, 'Habit 5 added on 2026-10-15');

// Check 2026-10-12 (which was 100% before)
const past12Stats = StorageService.getDayStats('2026-10-12');
assert(past12Stats.totalActive === 4, `Habits active on 2026-10-12 remains 4 (h5 not included): got ${past12Stats.totalActive}`);
assert(past12Stats.completedCount === 4, `Completed count on 2026-10-12 remains 4`);
assert(past12Stats.percentage === 100, `Percentage on 2026-10-12 remains 100%`);
assert(past12Stats.isQualifying === true, `Day 2026-10-12 still qualifies!`);

// Test 9: Deleting a habit does not alter historical records
console.log('\n[Test 9] Deleting habit preserves historical records:');
// Delete habit 1 on 2026-10-15
const delRes = StorageService.deleteHabit(h1, '2026-10-15');
assert(delRes.success, 'Habit 1 soft-deleted on 2026-10-15');

// Active on 2026-10-15: h1 should NOT be active
const activeOn15 = StorageService.getActiveHabitsForDate('2026-10-15');
assert(!activeOn15.some(h => h.id === h1), 'Habit 1 is no longer active on 2026-10-15');

// But on 2026-10-12: h1 WAS active and its historical completion is intact!
const past12AfterDelete = StorageService.getDayStats('2026-10-12');
assert(past12AfterDelete.totalActive === 4, `2026-10-12 still had 4 active habits`);
assert(past12AfterDelete.percentage === 100, `2026-10-12 percentage still 100%`);
assert(past12AfterDelete.isQualifying === true, `2026-10-12 still qualifies for streaks!`);

// Test 10: Future dates handling
console.log('\n[Test 10] Future Dates:');
StorageService.getTodayDate = () => '2026-10-15';
const futureStats = StorageService.getDayStats('2026-10-25');
assert(futureStats.status === 'future', 'Future date has status future');
assert(futureStats.isQualifying === false, 'Future date is never qualifying');
assert(futureStats.completedCount === 0, 'Future date completed count is 0');

// Restore original getTodayDate
StorageService.getTodayDate = origGetToday;

console.log('\n========================================');
console.log('🎉 ALL 10 TEST SUITE CATEGORIES PASSED!');
console.log('========================================');
