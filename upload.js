// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBTKf-9U6yL8gNhvUCG2eMB5iF4Xc8GPtc",
    authDomain: "project-2ec77.firebaseapp.com",
    projectId: "project-2ec77",
    storageBucket: "project-2ec77.firebasestorage.app",
    messagingSenderId: "473929963915",
    appId: "1:473929963915:web:f05fed9103155df089778e",
    measurementId: "G-WFW07K42RQ"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentStudentId = null;

// 로그인 상태 확인
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;

        // 🔹 users 컬렉션에서 studentId 불러오기
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            currentStudentId = userDoc.data().studentId;
            document.getElementById("studentId").value = currentStudentId;
        } else {
            alert("회원 정보에 학번이 없습니다. 관리자에게 문의하세요.");
        }
    } else {
        alert("로그인 후 이용 가능합니다.");
        window.location.href = "login.html";
    }
});

// 🔹 파일을 Base64로 변환하는 함수
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // "data:image/..." 제거
        reader.onerror = error => reject(error);
    });
}

// 업로드 버튼 클릭 이벤트
$('#send').click(async function () {
    if (!currentUser || !currentStudentId) {
        alert("로그인 정보가 없습니다.");
        return;
    }

    const file = document.getElementById("imageInput").files[0];
    let imageUrl = null;

    if (file) {
        try {
            const base64Image = await toBase64(file);

            // 🔹 Imgbb API 업로드
            const formData = new FormData();
            formData.append("key", "f31394a4f6970350d3a622d30bbccf1c"); // 반드시 본인 키로 교체
            formData.append("image", base64Image);

            const res = await fetch("https://api.imgbb.com/1/upload", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                imageUrl = data.data.url;
            } else {
                throw new Error("Imgbb 업로드 실패");
            }
        } catch (err) {
            console.error("이미지 업로드 실패:", err);
            alert("이미지 업로드에 실패했습니다.");
            return;
        }
    }

    // 🔹 Firestore에 저장할 데이터
    const save = {
        제목: $('#title').val(),
        가격: $('#price').val(),
        내용: $('#content').val(),
        날짜: new Date(),
        작성자UID: currentUser.uid,
        작성자학번: currentStudentId,
        이미지: imageUrl // 이미지 URL 저장
    };

    try {
        await db.collection('product').add(save);
        alert("상품이 등록되었습니다!");
        window.location.href = "index.html";
    } catch (err) {
        console.error("업로드 실패:", err);
    }
});