document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-name');
    const addBtn = document.getElementById('add-task');
    
    // Inicializar dados
    TaskManager.tasks = Storage.load();
    UI.updateList(TaskManager.tasks, taskList);
    
    // Uma unica funcao para o botao e para a tecla Enter.
    function addTaskFromInput() {
        const name = taskInput.value.trim();
        if (!name) return;

        TaskManager.addTask(name);
        taskInput.value = '';
        Storage.save(TaskManager.tasks);
        UI.updateList(TaskManager.tasks, taskList);
    }

    // Adicionar tarefa
    addBtn.addEventListener('click', addTaskFromInput);

    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTaskFromInput();
        }
    });
    
    // Eventos na lista (Delegation)
    taskList.addEventListener('click', (e) => {
        // Cliques fora de uma tarefa (o espaco entre itens) nao resolvem para
        // um <li> e antes quebravam o handler ao ler .dataset de null.
        const item = e.target.closest('li');
        if (!item) return;

        const id = parseInt(item.dataset.id);

        if (e.target.classList.contains('toggle-btn')) {
            TaskManager.toggleTask(id);
        } else if (e.target.classList.contains('delete-btn')) {
            TaskManager.removeTask(id);
        }
        
        Storage.save(TaskManager.tasks);
        UI.updateList(TaskManager.tasks, taskList);
    });
});
