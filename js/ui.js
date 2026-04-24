const UI = {
    renderTask(task) {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        if (task.completed) li.classList.add('completed');
        
        li.innerHTML = `
            <span>${task.name}</span>
            <div>
                <button class="toggle-btn">✓</button>
                <button class="delete-btn">✕</button>
            </div>
        `;
        return li;
    },
    
    updateList(tasks, container) {
        container.innerHTML = '';
        tasks.forEach(task => {
            container.appendChild(this.renderTask(task));
        });
    }
};
