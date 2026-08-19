class Task {
    constructor(id, name, completed = false) {
        this.id = id;
        this.name = name;
        this.completed = completed;
    }
}

// Ids are treated as opaque strings everywhere. New tasks get a UUID, while
// tasks already in storage keep the millisecond timestamps written by earlier
// versions, so both shapes have to compare equal to the value read back from
// the DOM, which is always a string.
let fallbackCounter = 0;

function createTaskId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // crypto.randomUUID is only exposed in secure contexts. Over plain HTTP the
    // counter still guarantees uniqueness within the page session, which is
    // what Date.now() on its own failed to do.
    fallbackCounter += 1;
    return `${Date.now()}-${fallbackCounter}`;
}

const TaskManager = {
    tasks: [],

    addTask(name) {
        const newTask = new Task(createTaskId(), name);
        this.tasks.push(newTask);
        return newTask;
    },

    toggleTask(id) {
        const task = this.tasks.find(t => String(t.id) === String(id));
        if (task) {
            task.completed = !task.completed;
        }
    },

    removeTask(id) {
        this.tasks = this.tasks.filter(t => String(t.id) !== String(id));
    }
};
