document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("saveButton");
    const startButton = document.getElementById("startButton");
    const actionButton = document.getElementById("actionButton");
    const presentersTable = document.querySelector("#presentersTable tbody");
    const timerView = document.getElementById("timerView");
    const timerElement = document.getElementById("timer");
    const currentPresenterName = document.getElementById("currentPresenterName");

    let presenters = JSON.parse(localStorage.getItem("presenters")) || [];
    let currentPresenterIndex = 0;
    let timerInterval;
    let editIndex = null; // Track the index of the presenter being edited

    // Load presenters from localStorage
    function loadPresenters() {
        presentersTable.innerHTML = "";
        presenters.forEach((presenter, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${presenter.name}</td>
                <td>${presenter.duration} min</td>
                <td>
                    <img src="icons/edit.svg" alt="Edit" class="icon" onclick="editPresenter(${index})">
                    <img src="icons/delete.svg" alt="Delete" class="icon" onclick="deletePresenter(${index})">
                </td>
            `;
            presentersTable.appendChild(row);
        });

        // Show Start button if there are presenters
        startButton.style.display = presenters.length > 0 ? "block" : "none";
    }

    // Save presenter
    saveButton.addEventListener("click", () => {
        const name = document.getElementById("presenterName").value;
        const duration = document.getElementById("presenterDuration").value;
    
        if (name && duration) {
            if (editIndex !== null) {
                // If editIndex is set, modify an existing presenter
                presenters[editIndex] = { name, duration };
                editIndex = null; // Reset editIndex after modification
                saveButton.textContent = "Save";
            } else {
                // Otherwise, add a new presenter
                presenters.push({ name, duration });
            }
    
            localStorage.setItem("presenters", JSON.stringify(presenters));
            updatePresenterTable();
            loadPresenters();
            clearInputs();
        }
    });

    // Edit presenter
    window.editPresenter = function(index) {
        const presenter = presenters[index];
        document.getElementById("presenterName").value = presenter.name;
        document.getElementById("presenterDuration").value = presenter.duration;
    
        editIndex = index; // Store the index of the presenter being edited
    
        saveButton.textContent = "Modify";
        updatePresenterTable();
    };

    // Delete presenter
    window.deletePresenter = function(index) {
        presenters.splice(index, 1);
        localStorage.setItem("presenters", JSON.stringify(presenters));
        loadPresenters();
        updatePresenterTable();
    };

    // Start timer
    startButton.addEventListener("click", () => {
        showTimer(presenters[currentPresenterIndex]);
    });

    // Show timer for current presenter
    function showTimer(presenter) {
        timerView.style.display = "block";
        currentPresenterName.textContent = presenter.name;
        let totalTime = presenter.duration * 60; // Convert duration to seconds
        let overtime = 0;

        timerElement.textContent = formatTime(totalTime);
    
        highlightCurrentPresenter(); // Highlight the current presenter
    
        function updateTimer() {
            totalTime -= 1;
            timerElement.style.color = "black";
    
            if (totalTime < 0) {
                overtime += 1;
                timerElement.style.color = "red";
                timerElement.textContent = `+${formatTime(overtime)}`;
            } else {
                timerElement.textContent = formatTime(totalTime);
            }
        }
    
        timerInterval = setInterval(updateTimer, 1000);
    
        // Update button text
        actionButton.textContent = currentPresenterIndex === presenters.length - 1 ? "Finish" : "Next";
    
        // Action button click event
        actionButton.onclick = () => {
            clearInterval(timerInterval);
        
            if (currentPresenterIndex < presenters.length - 1) {
                currentPresenterIndex++;
                showTimer(presenters[currentPresenterIndex]);
            } else {
                // Finishing logic
                timerView.style.display = "none"; // Hide timerView
                startButton.style.display = "block"; // Show Start button again
                currentPresenterIndex = 0; // Reset to first presenter
        
                // Reset highlighting
                document.querySelectorAll("#presentersTable tbody tr").forEach(row => {
                    row.classList.remove("current-presenter");
                });
            }
        };
    }

    function updatePresenterTable() {
        const table = document.getElementById("presentersTable");
        const tableHead = document.getElementById("tableHeader");
        const emptyMessage = document.getElementById("emptyMessage");
    
        if (presenters.length === 0) {
            table.style.display = "none";
            tableHead.style.display = "none";
            emptyMessage.style.display = "block"; // Show message
        } else {
            table.style.display = "table";
            tableHead.style.display = "table-header-group";
            emptyMessage.style.display = "none"; // Hide message
        }
    }
    
    // Function to highlight the current presenter
    function highlightCurrentPresenter() {
        const rows = document.querySelectorAll("#presentersTable tbody tr");

        rows.forEach((row, index) => {
            row.classList.toggle("current-presenter", index === currentPresenterIndex);
        });
    }

    // Format time in MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes < 10 ? "0" : ""}${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    }

    // Clear inputs
    function clearInputs() {
        document.getElementById("presenterName").value = "";
        document.getElementById("presenterDuration").value = "";
    }

    loadPresenters();
    updatePresenterTable();
});
