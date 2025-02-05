import { db } from "./firebase.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

    const presentersCollection = collection(db, "presenters");
    const timerDocRef = doc(db, "timer", "current");

    let presenters = [];
    let currentPresenterIndex = 0;
    let timerInterval;
    let stopwatchInterval;
    let startTime;
    let totalTimes = [];
    let editId = null;

    // Listen for real-time changes in presenters collection
    onSnapshot(presentersCollection, (snapshot) => {
        presenters = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp
    
        loadPresenters();
        updatePresenterTable();
    });

    // Listen for real-time timer updates
    onSnapshot(timerDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const timerData = docSnap.data();
            if (timerData.running) {
                currentPresenterIndex = timerData.currentIndex;
                showTimer(presenters[currentPresenterIndex]);
            }
        }
    });

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

    saveButton.addEventListener("click", async () => {
        const name = document.getElementById("presenterName").value;
        const duration = document.getElementById("presenterDuration").value;
    
        if (name && duration) {
            const presenterData = {
                name,
                duration,
                // Only add timestamp when creating a new presenter
                ...(editId ? {} : { timestamp: new Date() })
            };
    
            if (editId) {
                // When editing, don't modify the timestamp field
                await updateDoc(doc(db, "presenters", editId), {
                    name,
                    duration
                });
                editId = null;
                saveButton.textContent = "Save";
            } else {
                // When adding a new presenter, include the timestamp
                await addDoc(presentersCollection, presenterData);
            }
            clearInputs();
        }
    });

    window.editPresenter = function(index) {
        const presenter = presenters[index]; // Access the presenter directly by index
    
        if (!presenter) {
            console.error("Presenter not found at index:", index);
            return;
        }
    
        document.getElementById("presenterName").value = presenter.name;
        document.getElementById("presenterDuration").value = presenter.duration;
        
        editId = presenter.id; // Store Firestore document ID
        saveButton.textContent = "Modify";
    };

    window.deletePresenter = async function(index) {
        const presenter = presenters[index]; // Get the presenter by index
    
        if (!presenter) {
            console.error("Presenter not found at index:", index);
            return;
        }
    
        try {
            await deleteDoc(doc(db, "presenters", presenter.id)); // Use Firestore document ID
        } catch (error) {
            console.error("Error deleting presenter:", error);
        }
    };

    startButton.addEventListener("click", async () => {
        menuView.querySelector("h2").style.display = "none";
        addPresenterForm.style.display = "none";
        startButton.style.display = "none";

        document.querySelectorAll(".actions-column").forEach(el => el.style.display = "none");
        document.querySelectorAll(".total-time-column").forEach(el => el.style.display = "table-cell");

        tableHeader.querySelector("th:nth-child(4)").style.display = "none";
        tableHeader.insertAdjacentHTML("beforeend", '<th>Total time</th>');

        await setDoc(timerDocRef, { running: true, currentIndex: 0 });
    });

    async function showTimer(presenter) {
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

        actionButton.onclick = async () => {
            clearInterval(timerInterval);
            clearInterval(stopwatchInterval);
            let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const finalTime = formatTime(elapsedTime);
            presentersTable.rows[currentPresenterIndex].querySelector(".total-time-column").textContent = finalTime;
            totalTimes.push(finalTime);

            if (currentPresenterIndex < presenters.length - 1) {
                currentPresenterIndex++;
                await updateDoc(timerDocRef, { currentIndex: currentPresenterIndex });
            } else {
                await setDoc(timerDocRef, { running: false });
                resetUI();
            }
        };
    }

    function resetUI() {
        timerView.style.display = "none";
        startButton.style.display = "block";
        menuView.querySelector("h2").style.display = "block";
        addPresenterForm.style.display = "block";
        document.querySelectorAll(".actions-column").forEach(el => el.style.display = "table-cell");
        document.querySelectorAll(".total-time-column").forEach(el => el.style.display = "none");
        tableHeader.querySelector("th:last-child")?.remove();
        tableHeader.querySelector("th:nth-child(4)").style.display = "block";
        currentPresenterIndex = 0;

        document.querySelectorAll("#presentersTable tbody tr").forEach(row => {
            row.classList.remove("current-presenter");
        });
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
