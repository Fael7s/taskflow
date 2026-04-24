class Task {
    constructor(id, name, completed = false) {
        this.id = id;
        this.name = name;
        this.completed = completed;
    }
}

const TaskManager = {
    tasks: [],
    
    addTask(name) {
        const newTask = new Task(Date.now(), name);
        this.tasks.push(newTask);
        return newTask;
    },
    
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
        }
    },
    
    removeTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
    }
};
