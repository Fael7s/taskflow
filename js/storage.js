const Storage = {
    save(tasks) {
        localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
    },
    load() {
        const data = localStorage.getItem('taskflow_tasks');
        return data ? JSON.parse(data) : [];
    }
};
