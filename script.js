document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("saveButton");
    const startButton = document.getElementById("startButton");
    const actionButton = document.getElementById("actionButton");
    const addPresenterForm = document.getElementById("addPresenterForm");
    const menuView = document.getElementById("menuView");
    const tableHeader = document.querySelector("#tableHeader tr");
    const presentersTable = document.querySelector("#presentersTable tbody");
    const timerView = document.getElementById("timerView");
    const timerElement = document.getElementById("timer");
    const currentPresenterName = document.getElementById("currentPresenterName");

    let presenters = JSON.parse(localStorage.getItem("presenters")) || [];
    let currentPresenterIndex = 0;
    let timerInterval;
    let stopwatchInterval;
    let startTime;
    let totalTimes = [];
    let editIndex = null;

    // Load presenters from localStorage
    function loadPresenters() {
        presentersTable.innerHTML = "";
        presenters.forEach((presenter, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${presenter.name}</td>
                <td>${presenter.duration} min</td>
                <td class="actions-column">
                    <img src="icons/edit.svg" alt="Edit" class="icon" onclick="editPresenter(${index})">
                    <img src="icons/delete.svg" alt="Delete" class="icon" onclick="deletePresenter(${index})">
                </td>
                <td class="total-time-column" style="display: none;">-</td>
            `;
            presentersTable.appendChild(row);
        });
        startButton.style.display = presenters.length > 0 ? "block" : "none";
    }

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

    window.editPresenter = function(index) {
        const presenter = presenters[index];
        document.getElementById("presenterName").value = presenter.name;
        document.getElementById("presenterDuration").value = presenter.duration;
    
        editIndex = index; // Store the index of the presenter being edited
    
        saveButton.textContent = "Modify";
        updatePresenterTable();
    };

    window.deletePresenter = function(index) {
        presenters.splice(index, 1);
        localStorage.setItem("presenters", JSON.stringify(presenters));
        loadPresenters();
        updatePresenterTable();
    };

    // Start timer
    startButton.addEventListener("click", () => {
        menuView.querySelector("h2").style.display = "none";
        addPresenterForm.style.display = "none";
        startButton.style.display = "none";

        document.querySelectorAll(".actions-column").forEach(el => el.style.display = "none");
        document.querySelectorAll(".total-time-column").forEach(el => el.style.display = "table-cell");
        
        tableHeader.querySelector("th:nth-child(4)").style.display = "none";
        tableHeader.insertAdjacentHTML("beforeend", '<th>Total time</th>');
        
        showTimer(presenters[currentPresenterIndex]);
    });

    // Show timer for current presenter
    function showTimer(presenter) {
        timerView.style.display = "block";
        timerElement.style.color = "black";
        currentPresenterName.textContent = presenter.name;
        let totalTime = presenter.duration * 60;
        let overtime = 0;
        startTime = Date.now();
        timerElement.textContent = formatTime(totalTime);
    
        highlightCurrentPresenter();
    
        function updateTimer() {
            totalTime -= 1;
            if (totalTime < 0) {
                overtime += 1;
                timerElement.style.color = "red";
                timerElement.textContent = `+${formatTime(overtime)}`;
            } else {
                timerElement.style.color = "black";
                timerElement.textContent = formatTime(totalTime);
            }
        }

        function updateStopwatch() {
            let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            presentersTable.rows[currentPresenterIndex].querySelector(".total-time-column").textContent = formatTime(elapsedTime);
        }

        timerInterval = setInterval(updateTimer, 1000);
        stopwatchInterval = setInterval(updateStopwatch, 1000);
        actionButton.textContent = currentPresenterIndex === presenters.length - 1 ? "Finish" : "Next";

        actionButton.onclick = () => {
            clearInterval(timerInterval);
            clearInterval(stopwatchInterval);
            let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const finalTime = formatTime(elapsedTime);
            presentersTable.rows[currentPresenterIndex].querySelector(".total-time-column").textContent = finalTime;
            totalTimes.push(finalTime);
            
            if (currentPresenterIndex < presenters.length - 1) {
                currentPresenterIndex++;
                showTimer(presenters[currentPresenterIndex]);
            } else {
                console.log("Total Times:", totalTimes);
                timerView.style.display = "none";
                startButton.style.display = "block";
                menuView.querySelector("h2").style.display = "block";
                addPresenterForm.style.display = "block";
                document.querySelectorAll(".actions-column").forEach(el => el.style.display = "table-cell");
                document.querySelectorAll(".total-time-column").forEach(el => el.style.display = "none");
                tableHeader.querySelector("th:last-child").remove();
                tableHeader.querySelector("th:nth-child(4)").style.display = "block";
                currentPresenterIndex = 0;

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
            emptyMessage.style.display = "block";
        } else {
            table.style.display = "table";
            tableHead.style.display = "table-header-group";
            emptyMessage.style.display = "none";
        }
    }

    function highlightCurrentPresenter() {
        const rows = document.querySelectorAll("#presentersTable tbody tr");

        rows.forEach((row, index) => {
            row.classList.toggle("current-presenter", index === currentPresenterIndex);
        });
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    }

    function clearInputs() {
        document.getElementById("presenterName").value = "";
        document.getElementById("presenterDuration").value = "";
    }

    loadPresenters();
    updatePresenterTable();
});
