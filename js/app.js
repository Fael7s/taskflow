document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-name');
    const addBtn = document.getElementById('add-task');
    const statusEl = document.getElementById('status-message');

    // Inicializar dados
    TaskManager.tasks = Storage.load();
    if (Storage.lastError) {
        UI.showStatus(statusEl, 'N\u00e3o foi poss\u00edvel ler as tarefas salvas. A lista come\u00e7ou vazia.');
    }
    UI.updateList(TaskManager.tasks, taskList);

    // Persiste e redesenha. Quando a escrita falha (quota estourada, storage
    // desabilitado), a mensagem avisa em vez de a UI parecer salva.
    function persistAndRender() {
        const saved = Storage.save(TaskManager.tasks);
        UI.showStatus(
            statusEl,
            saved ? '' : 'N\u00e3o foi poss\u00edvel salvar. As altera\u00e7\u00f5es podem ser perdidas ao recarregar.'
        );
        UI.updateList(TaskManager.tasks, taskList);
    }

    // Uma única função para o botão e para a tecla Enter.
    function addTaskFromInput() {
        const name = taskInput.value.trim();
        if (!name) return;

        TaskManager.addTask(name);
        taskInput.value = '';
        persistAndRender();
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
        // Cliques fora de uma tarefa (o espaço entre itens) não resolvem para
        // um <li> e antes quebravam o handler ao ler .dataset de null.
        const item = e.target.closest('li');
        if (!item) return;

        const id = item.dataset.id;

        if (e.target.classList.contains('toggle-btn')) {
            TaskManager.toggleTask(id);
        } else if (e.target.classList.contains('delete-btn')) {
            TaskManager.removeTask(id);
        } else {
            // Clique que não altera estado: nada a salvar nem a redesenhar.
            return;
        }

        persistAndRender();
    });
});
