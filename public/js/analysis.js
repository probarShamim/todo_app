function fetchAnalysis(){
    fetch('/getAnalysis')
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('analysisBody');
      tbody.innerHTML = '';
      data.analysis.forEach(item => {
        const pending = item.total - item.completed;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.date}</td>
          <td>${item.total}</td>
          <td>${item.completed}</td>
          <td>${pending}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => console.error(err));
  }
  
  fetchAnalysis();
  