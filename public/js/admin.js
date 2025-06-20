window.onload = function() {
    // Simple search
    const input = document.getElementById('searchInput');
    input.oninput = function() {
        const filter = input.value.toLowerCase();
        const rows = document.querySelectorAll('#dataTable tbody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        });
    };
};