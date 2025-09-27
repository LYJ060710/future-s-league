const firebaseConfig = {
    apiKey: "AIzaSyBTKf-9U6yL8gNhvUCG2eMB5iF4Xc8GPtc",
    authDomain: "project-2ec77.firebaseapp.com",
    projectId: "project-2ec77",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const studentId = document.getElementById("studentId").value;
    const name = document.getElementById("name").value;
    const password = document.getElementById("signupPassword").value;
    const emailAsId = `${studentId}@school.com`;

    auth.createUserWithEmailAndPassword(emailAsId, password)
        .then(cred => {
            return db.collection("users").doc(cred.user.uid).set({
                studentId: studentId,
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert("회원가입 성공! 로그인 해주세요.");
            window.location.href = "login.html";
        })
        .catch(err => alert("회원가입 실패: " + err.message));
});