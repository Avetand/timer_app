import { db } from "./firebase.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("saveButton");
    const startButton = document.getElementById("startButton");
    const actionButton = document.getElementById("actionButton");
    const actionButtonDiv = document.getElementById("actionButtonDiv");
    const addPresenterForm = document.getElementById("addPresenterForm");
    const title = document.getElementById("title");
    const tableHeader = document.querySelector("#tableHeader tr");
    const presentersTable = document.querySelector("#presentersTable tbody");
    const timerView = document.getElementById("timerView");
    const timerElement = document.getElementById("timer");
    const currentPresenterName = document.getElementById("currentPresenterName");
    const durationInput = document.getElementById("presenterDuration");

    const presentersCollection = collection(db, "presenters");
    const timerDocRef = doc(db, "timer", "current");

    let presenters = [];
    let currentPresenterIndex = 0;
    let timerInterval;
    let stopwatchInterval;
    let startTime;
    let totalTimes = [];
    let editId = null;
    let timerData;

    const roleSelectionView = document.getElementById("roleSelectionView");
    const adminLoginView = document.getElementById("adminLoginView");
    const mainView = document.getElementById("mainView");
    const adminButton = document.getElementById("adminButton");
    const presenterButton = document.getElementById("presenterButton");
    const loginButton = document.getElementById("loginButton");
    const loginError = document.getElementById("loginError");
    let isAdmin = localStorage.getItem('isAdmin') === 'true';

    onAuthStateChanged(auth, (user) => {
        if (user) {
            isAdmin = true;
            localStorage.setItem('isAdmin', 'true');
            showMainView(isAdmin);
        } else if (localStorage.getItem('userRole')) {
            isAdmin = localStorage.getItem('userRole') === 'admin';
            showMainView(isAdmin);
        } else {
            showRoleSelectionView();
        }
    });

    adminButton.addEventListener("click", () => {
        showAdminLoginView();
    });

    presenterButton.addEventListener("click", () => {
        isAdmin = false;
        localStorage.setItem('userRole', 'presenter');
        showMainView(false);
    });

    loginButton.addEventListener("click", () => {
        const email = document.getElementById("adminEmail").value;
        const password = document.getElementById("adminPassword").value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                isAdmin = true;
                localStorage.setItem('isAdmin', 'true');
                localStorage.setItem('userRole', 'admin');
                showMainView(true);
                document.getElementById("adminEmail").value = "";
                document.getElementById("adminPassword").value = "";
                loginError.style.display = "none";
            })
            .catch((error) => {
                loginError.style.display = "block";
                loginError.textContent = "Invalid email or password";
            });
    });

    const backButton = document.getElementById('backButton');
    backButton.addEventListener('click', () => {
        showRoleSelectionView();
    });

    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userRole');
        auth.signOut().then(() => {
            window.location.reload();
        });
    });

    function showRoleSelectionView() {
        roleSelectionView.style.display = "block";
        adminLoginView.style.display = "none";
        mainView.style.display = "none";
    }

    function showAdminLoginView() {
        roleSelectionView.style.display = "none";
        adminLoginView.style.display = "block";
        mainView.style.display = "none";
    }

    function showMainView(isAdmin) {
        roleSelectionView.style.display = "none";
        adminLoginView.style.display = "none";
        mainView.style.display = "block";
        console.log(isAdmin);
        updateUI(isAdmin, timerData && timerData.running);
    }

    onSnapshot(presentersCollection, (snapshot) => {
        presenters = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => a.timestamp - b.timestamp);

        loadPresenters();
        updatePresenterTable();
        updateUI(isAdmin, timerData && timerData.running);
    });

    onSnapshot(timerDocRef, (docSnap) => {
        if (docSnap.exists()) {
            timerData = docSnap.data();
            if (timerData.running) {
                currentPresenterIndex = timerData.currentIndex;

                if (!timerData.startTime) {
                    timerData.startTime = Date.now();
                    updateDoc(timerDocRef, { startTime: timerData.startTime });
                }
                startTime = timerData.startTime;
                showTimer(presenters[currentPresenterIndex]);
            } else {
                clearInterval(timerInterval);
                clearInterval(stopwatchInterval);
                timerInterval = null;
                stopwatchInterval = null;
                timerView.style.display = "none";
                mainView.style.marginTop = "0";
            }
        } else {
            setDoc(timerDocRef, { running: false, currentIndex: 0 });
        }
        updateUI(isAdmin, timerData.running); 
    });

    function loadPresenters() {
        presentersTable.innerHTML = "";
        presenters.forEach((presenter, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${presenter.name}</td>
                <td>${presenter.duration} min</td>
                <td class="actions-column">
                    <img src="resources/icons/edit.svg" alt="Edit" class="icon" onclick="editPresenter(${index})">
                    <img src="resources/icons/delete.svg" alt="Delete" class="icon" onclick="deletePresenter(${index})">
                </td>
                <td class="total-time-column" style="display: none;">-</td>
            `;
            presentersTable.appendChild(row);
        });
        startButton.style.display = presenters.length > 0 ? "block" : "none";
    }

    durationInput.addEventListener("input", () => {
        const duration = parseInt(durationInput.value, 10);
        if (duration > 60) {
            saveButton.disabled = true;
            saveButton.style.backgroundColor = "gray";
        } else {
            saveButton.disabled = false;
            saveButton.style.backgroundColor = "";
        }
    });

    function updateSaveButtonState() {
        const name = document.getElementById("presenterName").value;
        const duration = parseInt(document.getElementById("presenterDuration").value, 10);

        if (!name || !duration || duration > 60) {
            saveButton.disabled = true;
            saveButton.style.backgroundColor = "gray";
        } else {
            saveButton.disabled = false;
            saveButton.style.backgroundColor = "#4caf50";
        }
    }

    durationInput.addEventListener("input", updateSaveButtonState);
    document.getElementById("presenterName").addEventListener("input", updateSaveButtonState);

    saveButton.addEventListener("click", async () => {
        const name = document.getElementById("presenterName").value;
        const duration = document.getElementById("presenterDuration").value;

        if (name && duration && parseInt(duration, 10) <= 60) {
            const presenterData = {
                name,
                duration,
                ...(editId ? {} : { timestamp: new Date() })
            };

            if (editId) {
                await updateDoc(doc(db, "presenters", editId), {
                    name,
                    duration
                });
                editId = null;
                saveButton.textContent = "Save";
            } else {
                await addDoc(presentersCollection, presenterData);
            }
            clearInputs();
            saveButton.style.backgroundColor = "gray";
        }
    });

    window.editPresenter = function(index) {
        const presenter = presenters[index];
    
        if (!presenter) {
            console.error("Presenter not found at index:", index);
            return;
        }
    
        document.getElementById("presenterName").value = presenter.name;
        document.getElementById("presenterDuration").value = presenter.duration;
        
        editId = presenter.id;
        saveButton.style.backgroundColor = "#4caf50";
        saveButton.textContent = "Modify";
    };

    window.deletePresenter = async function(index) {
        const presenter = presenters[index];
    
        if (!presenter) {
            console.error("Presenter not found at index:", index);
            return;
        }
    
        try {
            await deleteDoc(doc(db, "presenters", presenter.id));
        } catch (error) {
            console.error("Error deleting presenter:", error);
        }
    };

    startButton.addEventListener("click", async () => {
        await setDoc(timerDocRef, { running: true, currentIndex: 0, startTime: Date.now() });
        updateUI(isAdmin, true);
    });

    async function showTimer(presenter) {
        timerView.style.display = "flex";
        mainView.style.marginTop = "400px";
        timerElement.style.color = "black";
        currentPresenterName.textContent = presenter.name;

        let totalTime = presenter.duration * 60;
        let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        totalTime -= elapsedTime;
        let overtime = 0;

        updateUI(isAdmin, true);
        
        timerElement.textContent = formatTime(totalTime);
        highlightCurrentPresenter();

        clearInterval(timerInterval);
        clearInterval(stopwatchInterval);
        timerInterval = null;
        stopwatchInterval = null;

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
            if (totalTime < -3600) {
                clearInterval(timerInterval);
                clearInterval(stopwatchInterval);
                timerElement.textContent = "+60:00";
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
            timerInterval = null;
            stopwatchInterval = null;
        
            let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const finalTime = formatTime(elapsedTime);
            presentersTable.rows[currentPresenterIndex].querySelector(".total-time-column").textContent = finalTime;
            totalTimes.push(finalTime);
        
            if (currentPresenterIndex < presenters.length - 1) {
                currentPresenterIndex++;
                await updateDoc(timerDocRef, { currentIndex: currentPresenterIndex, startTime: Date.now() });
                updateUI(isAdmin, true);
            } else {
                await setDoc(timerDocRef, { running: false, startTime: null });
                updateUI(isAdmin, false);
                document.querySelectorAll("#presentersTable tbody tr").forEach(row => {
                    row.classList.remove("current-presenter");
                });
            }
        };
    }

    function updateUI(isAdmin, timerRunning) {
        if (isAdmin && !timerRunning) {
            title.style.display = "block";
            addPresenterForm.style.display = "flex";
            startButton.style.display = presenters.length > 0 ? "block" : "none";
            actionButtonDiv.style.display = "none";
            document.getElementById("actionsHeader").innerHTML = "Actions";

            document.querySelectorAll(".actions-column").forEach(el => el.style.display = "table-cell");
            document.querySelectorAll(".total-time-column").forEach(el => el.style.display = "none");
            tableHeader.querySelector("th:nth-child(4)").style.display = "block";
        } else if (isAdmin && timerRunning) {
            title.style.display = "none";
            addPresenterForm.style.display = "none";
            startButton.style.display = "none";
            actionButtonDiv.style.display = "block";
            document.getElementById("actionsHeader").innerHTML = "Total Time";

            document.querySelectorAll(".actions-column").forEach(el => el.style.display = "none");
            document.querySelectorAll(".total-time-column").forEach(el => el.style.display = "table-cell");
        }
        if (!isAdmin) {
            title.style.display = "none";
            addPresenterForm.style.display = "none";
            startButton.style.display = "none";
            actionButtonDiv.style.display = "none";

            document.querySelectorAll(".actions-column").forEach(el => el.style.display = "none");
            document.querySelectorAll(".total-time-column").forEach(el => el.style.display = "table-cell");

            document.getElementById("actionsHeader").innerHTML = "Total Time";
        }
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

    const clapsDocRef = doc(db, "claps", "clapCount");
    const clapSound = new Audio('resources/sounds/claps.mp3');
    const muteButton = document.getElementById("muteButton");

    // Check saved mute preference from localStorage
    let isMuted = localStorage.getItem("muted") === "true";
    clapSound.muted = isMuted;
    muteButton.src = isMuted ? "resources/icons/unmute.svg" : "resources/icons/mute.svg";
    
    // Toggle mute/unmute when button is clicked
    muteButton.addEventListener("click", () => {
        isMuted = !isMuted; // Toggle state
        clapSound.muted = isMuted;
        
        // Update icon
        muteButton.src = isMuted ? "resources/icons/unmute.svg" : "resources/icons/mute.svg";
        
        // Save preference
        localStorage.setItem("muted", isMuted);
    });

    //clapping
    document.getElementById('clapButton').addEventListener('click', async function(event) {
        // createClap(event.clientX, event.clientY);
        
        try {
            await updateDoc(clapsDocRef, {
                timestamp: new Date().getTime()
            }).catch(async () => {
                await setDoc(clapsDocRef, { timestamp: new Date().getTime() });
            });
        } catch (error) {
            console.error("Error updating Firestore:", error);
        }
    });

    onSnapshot(clapsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const { timestamp } = docSnap.data();
            if (timestamp) {
                createClap(window.innerWidth / 2, window.innerHeight / 2);

                clapSound.currentTime = 0; // Reset sound in case it plays multiple times quickly
                clapSound.play(); // Play the clap sound
            }
        }
    });

    function createClap(x, y) {
        const clap = document.createElement('div');
        clap.classList.add('clap');
        clap.textContent = '👏';
        document.body.appendChild(clap);
        
        const randomOffsetX = (Math.random() - 0.5) * 100;
        const randomOffsetY = -(Math.random() * 100 + 50);
        
        clap.style.left = `${x + randomOffsetX}px`;
        clap.style.top = `${y}px`;
        clap.style.setProperty('--random-x', `${randomOffsetX}px`);
        clap.style.setProperty('--random-y', `${randomOffsetY}px`);
        
        setTimeout(() => {
            clap.remove();
        }, 1000);
    }
});