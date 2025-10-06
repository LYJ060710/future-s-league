
const firebaseConfig = {
    apiKey: "AIzaSyBTKf-9U6yL8gNhvUCG2eMB5iF4Xc8GPtc",
    authDomain: "project-2ec77.firebaseapp.com",
    projectId: "project-2ec77",
    storageBucket: "project-2ec77.firebasestorage.app",
    messagingSenderId: "473929963915",
    appId: "1:473929963915:web:f05fed9103155df089778e",
    measurementId: "G-WFW07K42RQ"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');
let sellerUid = null;

function maskStudentId(id) {
    if (!id) return "익명";
    if (id.length <= 4) return "****";
    return id.slice(0, id.length - 4) + "****";
}

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
            auth.signOut();
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

if (!id) {
    document.querySelector('.container').innerHTML = "<p>잘못된 접근입니다.</p>";
} else {
    db.collection('product').doc(id).get().then(async (doc) => {
        if (!doc.exists) {
            document.querySelector('.container').innerHTML = "<p>상품을 찾을 수 없습니다.</p>";
            return;
        }

        const data = doc.data();
        document.querySelector('#title').innerText = data.제목 || '제목 없음';
        document.querySelector('#price').innerText = !isNaN(data.가격)
            ? Number(data.가격).toLocaleString('ko-KR') + " 원"
            : "가격 없음";
        document.querySelector('#date').innerText = data.날짜
            ? data.날짜.toDate().toLocaleDateString('ko-KR')
            : '';
        document.querySelector('#desc').innerText = data.내용 || '설명이 없습니다.';
        document.querySelector('#image').src = data.이미지URL || "https://i.ibb.co/TqckztRV/yum-logo.png";

        sellerUid = data.작성자UID || null;

        if (sellerUid) {
            const sellerDoc = await db.collection("users").doc(sellerUid).get();
            if (sellerDoc.exists) {
                const sellerStudentId = sellerDoc.data().studentId;
                document.querySelector('#sellerInfo').innerText = "판매자 학번: " + maskStudentId(sellerStudentId);
            }
        }
    }).catch((error) => {
        console.error("Firestore 에러:", error);
        document.querySelector('.container').innerHTML = "<p>데이터를 불러오는 중 오류가 발생했습니다.</p>";
    });
}

document.getElementById("chatBtn").addEventListener("click", () => {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert("로그인 후 이용할 수 있습니다.");
            window.location.href = "login.html";
            return;
        }
        if (!sellerUid) {
            alert("판매자 정보를 불러올 수 없습니다.");
            return;
        }
        if (user.uid === sellerUid) {
            alert("자신의 상품에는 대화를 걸 수 없습니다.");
            return;
        }

        const chatQuery = await db.collection("chats")
            .where("participants", "array-contains", user.uid)
            .get();

        let existingChatId = null;

        chatQuery.forEach(doc => {
            const data = doc.data();
            const participants = data.participants || [];
            if (participants.includes(sellerUid)) {
                existingChatId = doc.id;
            }
        });

        if (existingChatId) {
            window.location.href = `chat.html?id=${existingChatId}`;
        } else {
            const newChatRef = db.collection("chats").doc();
            await newChatRef.set({
                participants: [user.uid, sellerUid],
                createdAt: new Date()
            });
            window.location.href = `chat.html?id=${newChatRef.id}`;
        }
    });
});
