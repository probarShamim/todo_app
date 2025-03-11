function fetchTasks(){
    fetch('/getTasks')
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('taskBody');
      tbody.innerHTML = '';
      data.tasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.className = task.completed ? 'task-completed' : 'task-pending';
        tr.innerHTML = `
          <td>${task.text}</td>
          <td>
            <button onclick="completeTask(${task.id})">Complete</button>
            <button onclick="deleteTask(${task.id})">Delete</button>
            <button onclick="editTaskPrompt(${task.id}, '${task.text}')">Edit</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => console.error(err));
  }
  
  function addTask(task){
    fetch('/addTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task })
    })
    .then(res => res.json())
    .then(data => {
      if(data.error){
        alert(data.error);
      }
      fetchTasks();
    })
    .catch(err => console.error(err));
  }
  
  function completeTask(taskId){
    fetch('/completeTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    })
    .then(res => res.json())
    .then(data => {
      if(data.error){
        alert(data.error);
      }
      fetchTasks();
    })
    .catch(err => console.error(err));
  }
  
  function deleteTask(taskId){
    fetch('/deleteTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    })
    .then(res => res.json())
    .then(data => {
      if(data.error){
        alert(data.error);
      }
      fetchTasks();
    })
    .catch(err => console.error(err));
  }
  
  function editTaskPrompt(taskId, currentText){
    const newText = prompt("Edit Task:", currentText);
    if(newText && newText.trim() !== ''){
      fetch('/editTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, newText })
      })
      .then(res => res.json())
      .then(data => {
        if(data.error){
          alert(data.error);
        }
        fetchTasks();
      })
      .catch(err => console.error(err));
    }
  }
  
  document.getElementById('addTaskForm').addEventListener('submit', function(e){
    e.preventDefault();
    const task = document.getElementById('taskInput').value;
    if(task.trim() !== ''){
      addTask(task);
      document.getElementById('taskInput').value = '';
    }
  });
  
  document.getElementById('logoutBtn').addEventListener('click', function(){
    fetch('/logout')
    .then(res => res.json())
    .then(data => {
      window.location.href = 'index.html';
    })
    .catch(err => console.error(err));
  });
  
  fetchTasks();
  