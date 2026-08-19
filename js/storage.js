const STORAGE_KEY = 'taskflow_tasks';

const Storage = {
    // Set by load() and save() so the caller can tell the user that persistence
    // failed instead of leaving the page in a state that looks saved.
    lastError: null,

    save(tasks) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
            this.lastError = null;
            return true;
        } catch (error) {
            // Quota exceeded, or storage disabled by the browser.
            this.lastError = error;
            console.error('TaskFlow: tasks could not be saved.', error);
            return false;
        }
    },

    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const parsed = data ? JSON.parse(data) : [];
            // A corrupted value can parse into something that is not a list.
            if (!Array.isArray(parsed)) {
                throw new TypeError('Stored value is not an array of tasks.');
            }
            this.lastError = null;
            return parsed;
        } catch (error) {
            // Malformed JSON used to throw here and stop the application from
            // starting. Start empty instead and let the caller report it.
            this.lastError = error;
            console.error('TaskFlow: stored tasks could not be read.', error);
            return [];
        }
    }
};
