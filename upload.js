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

auth.onAuthStateChanged((user) => {
    const authArea = document.getElementById("auth-area");
    const chatArea = document.getElementById("chat-area");
    const existingUploadBtn = document.querySelector("#upload-btn");

    if (user) {
        // 업로드 버튼 추가
        if (!existingUploadBtn) {
            const btn = document.createElement("a");
            btn.href = "upload.html";
            btn.className = "btn btn-primary me-2";
            btn.id = "upload-btn";
            btn.textContent = "업로드";
            authArea.parentNode.insertBefore(btn, authArea);
        }

        // 내 정보 드롭다운
        authArea.innerHTML = `
    <div class="dropdown">
        <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
            내 정보
        </button>
        <ul class="dropdown-menu">
            <li><span class="dropdown-item-text">이메일: ${user.email}</span></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" id="logoutBtn">로그아웃</a></li>
        </ul>
    </div>
    `;
        document.getElementById("logoutBtn").addEventListener("click", () => {
            auth.signOut().then(() => {
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("로그아웃 에러", error);
            });
        });

        // 채팅 알림 버튼
        chatArea.innerHTML = `
    <div class="chat-alert">
        <button id="chatBtn" class="btn btn-outline-success position-relative">
            채팅
            <span id="chatBadge" class="chat-badge d-none">0</span>
        </button>
    </div>
    `;

        document.getElementById("chatBtn").addEventListener("click", () => {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (!user) {
                    alert("로그인 후 이용할 수 있습니다.");
                    window.location.href = "login.html";
                    return;
                }

                const currentUid = user.uid;

                // Firestore에서 사용자와 연결된 채팅방 찾기
                const chatQuery = await db.collection("chats")
                    .where("participants", "array-contains", currentUid)
                    .get();

                if (!chatQuery.empty) {
                    // 첫 번째 채팅방으로 이동
                    const chatId = chatQuery.docs[0].id;
                    window.location.href = `chatlist.html?id=${chatId}`;
                } else {
                    alert("현재 연결된 채팅방이 없습니다.");
                }
            });
        });

        // 내가 속한 채팅방 실시간 구독 → unread 뱃지
        db.collection("chats")
            .where("participants", "array-contains", user.uid)
            .onSnapshot((snapshot) => {
                let unreadCount = 0;
                snapshot.forEach(doc => {
                    const chat = doc.data();
                    if (chat.unread && chat.unread[user.uid]) unreadCount++;
                });
                const badge = document.getElementById("chatBadge");
                if (unreadCount > 0) {
                    badge.innerText = unreadCount;
                    badge.classList.remove("d-none");
                } else {
                    badge.classList.add("d-none");
                }
            });

    } else {
        // 로그아웃 상태
        if (existingUploadBtn) existingUploadBtn.remove();
        authArea.innerHTML = `<a href="login.html" class="btn btn-outline-primary">로그인</a>`;
        chatArea.innerHTML = ""; // 채팅 버튼 제거
    }
});

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