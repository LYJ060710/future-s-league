    const firebaseConfig = {
        apiKey: "AIzaSyBTKf-9U6yL8gNhvUCG2eMB5iF4Xc8GPtc",
    authDomain: "project-2ec77.firebaseapp.com",
    projectId: "project-2ec77",
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();

    document.getElementById("loginForm").addEventListener("submit", (e) => {
        e.preventDefault();
    const studentId = document.getElementById("loginStudentId").value;
    const password = document.getElementById("loginPassword").value;
    const emailAsId = `${studentId}@school.com`;

    auth.signInWithEmailAndPassword(emailAsId, password)
        .then(() => {
        alert("로그인 성공!");
    window.location.href = "index.html";
        })
        .catch(err => alert("로그인 실패: " + err.message));
    });