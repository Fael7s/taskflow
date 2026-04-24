document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-name');
    const addBtn = document.getElementById('add-task');
    
    // Inicializar dados
    TaskManager.tasks = Storage.load();
    UI.updateList(TaskManager.tasks, taskList);
    
    // Adicionar tarefa
    addBtn.addEventListener('click', () => {
        const name = taskInput.value.trim();
        if (name) {
            TaskManager.addTask(name);
            Storage.save(TaskManager.tasks);
            UI.updateList(TaskManager.tasks, taskList);
            taskInput.value = '';
        }
    });
    
    // Eventos na lista (Delegation)
    taskList.addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('li').dataset.id);
        
        if (e.target.classList.contains('toggle-btn')) {
            TaskManager.toggleTask(id);
        } else if (e.target.classList.contains('delete-btn')) {
            TaskManager.removeTask(id);
        }
        
        Storage.save(TaskManager.tasks);
        UI.updateList(TaskManager.tasks, taskList);
    });
});
