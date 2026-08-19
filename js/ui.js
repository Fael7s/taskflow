const UI = {
    renderTask(task) {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        if (task.completed) li.classList.add('completed');

        // Task names are user input, so the row is assembled with createElement
        // and textContent instead of innerHTML: whatever the user typed is
        // rendered as text and never parsed as markup.
        const name = document.createElement('span');
        name.textContent = task.name;

        const actions = document.createElement('div');

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.textContent = '\u2713';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '\u2715';

        actions.appendChild(toggleBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(name);
        li.appendChild(actions);
        return li;
    },

    updateList(tasks, container) {
        container.innerHTML = '';
        tasks.forEach(task => {
            container.appendChild(this.renderTask(task));
        });
    },

    showStatus(container, message) {
        container.textContent = message;
    }
};
