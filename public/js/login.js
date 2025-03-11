document.getElementById('loginForm').addEventListener('submit', function(e){
    e.preventDefault();
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    })
    .then(x => x.json())
    .then(data => {
      if(data.error) {
        alert(data.error);
      } else {
        window.location.href = 'todo.html';
      }
    })
    .catch(err => console.error(err));
  }); 
  