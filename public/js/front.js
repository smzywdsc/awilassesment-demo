window.onload = function() {
    const themeSel = document.getElementById('themeSelect');
    const subthemeSel = document.getElementById('subthemeSelect');
    const categorySel = document.getElementById('categorySelect');
    const randomBtn = document.getElementById('randomBtn');
    const resultDiv = document.getElementById('result');

    themeSel.onchange = function() {
        const themeId = themeSel.value;
        subthemeSel.innerHTML = '<option value="">Loading...</option>';
        subthemeSel.disabled = true;
        categorySel.innerHTML = '<option value="">Select Subtheme First</option>';
        categorySel.disabled = true;
        randomBtn.disabled = true;
        if (!themeId) {
            subthemeSel.innerHTML = '<option value="">Select Theme First</option>';
            return;
        }
        fetch(`/api/subthemes?themeId=${themeId}`).then(r => r.json()).then(data => {
            subthemeSel.innerHTML = '<option value="">Select Subtheme</option>';
            data.forEach(item => {
                subthemeSel.innerHTML += `<option value="${item.id}">${item.name}</option>`;
            });
            subthemeSel.disabled = false;
        });
    };

    subthemeSel.onchange = function() {
        const subthemeId = subthemeSel.value;
        categorySel.innerHTML = '<option value="">Loading...</option>';
        categorySel.disabled = true;
        randomBtn.disabled = true;
        if (!subthemeId) {
            categorySel.innerHTML = '<option value="">Select Subtheme First</option>';
            return;
        }
        fetch(`/api/categories?subthemeId=${subthemeId}`).then(r => r.json()).then(data => {
            categorySel.innerHTML = '<option value="">Select Category</option>';
            data.forEach(item => {
                categorySel.innerHTML += `<option value="${item.id}">${item.name}</option>`;
            });
            categorySel.disabled = false;
        });
    };

    categorySel.onchange = function() {
        if (categorySel.value) {
            randomBtn.disabled = false;
        } else {
            randomBtn.disabled = true;
        }
    };

    randomBtn.onclick = function() {
        const categoryId = categorySel.value;
        if (!categoryId) return;
        resultDiv.innerHTML = "Loading...";
        fetch(`/api/random-name?categoryId=${categoryId}`).then(r => r.json()).then(data => {
            if (data.count === 0) {
                resultDiv.innerHTML = `<b>No names under this category.</b>`;
            } else {
                resultDiv.innerHTML = `
                  <b>Result:</b> There are <b>${data.count}</b> names in this category.<br>
                  Random Name: <span style="font-size:1.5em;color:blue">${data.name}</span>
                  <br><button onclick="document.getElementById('randomBtn').onclick()">Try Another</button>
                `;
            }
        });
    };
};