/**
 * StreakUp DOM & Component Integration Test
 */

const fs = require('fs');
const path = require('path');

// Mock localStorage
const store = new Map();
global.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
};

// Minimal DOM mock
class MockElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.classList = new Set();
        this.children = [];
        this.attributes = {};
        this.style = {};
        this._innerHTML = '';
        this._textContent = '';
        this.listeners = {};
        this.value = '';
    }

    get innerHTML() {
        return this._innerHTML;
    }
    set innerHTML(val) {
        this._innerHTML = val;
    }

    get textContent() {
        return this._textContent;
    }
    set textContent(val) {
        this._textContent = val;
    }

    getAttribute(name) {
        return this.attributes[name] || null;
    }
    setAttribute(name, val) {
        this.attributes[name] = String(val);
    }
    removeAttribute(name) {
        delete this.attributes[name];
    }

    appendChild(child) {
        this.children.push(child);
    }

    addEventListener(event, fn) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }

    dispatchEvent(event) {
        if (this.listeners[event.type]) {
            this.listeners[event.type].forEach(fn => fn(event));
        }
    }

    querySelectorAll(selector) {
        return [];
    }

    querySelector(selector) {
        return null;
    }
}

MockElement.prototype.classList = {
    add: function(cls) { this[cls] = true; },
    remove: function(cls) { delete this[cls]; },
    contains: function(cls) { return Boolean(this[cls]); }
};

global.document = {
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => new MockElement('div'),
    querySelectorAll: (sel) => [],
    addEventListener: () => {}
};

global.window = {
    localStorage: global.localStorage,
    location: { pathname: '/home.html', search: '' },
    confirm: () => true,
    alert: () => {},
    document: global.document
};

// Load storage and habits
eval(fs.readFileSync(path.join(__dirname, 'js/storage.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js/habits.js'), 'utf8'));

const StorageService = window.StorageService;
const HabitManager = window.HabitManager;

console.log('Testing HabitManager and Storage integration...');

// Add a habit through HabitManager
const container = new MockElement('div');
global.document.getElementById = (id) => {
    if (id === 'activeHabitsList') return container;
    return new MockElement('div');
};

HabitManager.init({
    containerId: 'activeHabitsList',
    dateStr: '2026-10-17'
});

StorageService.addHabit('Morning Run', '2026-10-17');
HabitManager.render();

if (container.innerHTML.includes('Morning Run')) {
    console.log('✅ PASS: HabitManager successfully rendered newly added habit.');
} else {
    console.error('❌ FAIL: Habit not found in rendered container.');
    process.exit(1);
}

// Test toggling completion
const habits = StorageService.getActiveHabitsForDate('2026-10-17');
const hId = habits[0].id;
HabitManager.handleToggleHabit(hId);

const stats = StorageService.getDayStats('2026-10-17');
if (stats.completedCount === 1 && stats.percentage === 100 && stats.isQualifying) {
    console.log('✅ PASS: Habit toggle updated stats to 100% completed.');
} else {
    console.error('❌ FAIL: Stats not updated after toggle.');
    process.exit(1);
}

console.log('All Component Integration tests passed!');
