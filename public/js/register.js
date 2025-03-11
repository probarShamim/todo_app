document.getElementById('registerForm').addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('name').value;
    const userId = document.getElementById('userId').value;
    const gmail = document.getElementById('gmail').value;
    const password = document.getElementById('password').value;
    fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userId, password, gmail })
    })
    .then(res => res.json())
    .then(data => {
      if(data.error) {
        alert(data.error);
      } else {
        alert('Registration successful. Please login.');
        window.location.href = 'index.html';
      }
    })
    .catch(err => console.error(err));
  });
  