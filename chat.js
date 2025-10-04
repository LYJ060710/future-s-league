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
let chatId = urlParams.get('id'); // URL에 chatId가 없을 수도 있음

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("messageInput");
const deleteChatBtn = document.getElementById("deleteChatBtn");

let currentUser = null;
let currentStudentId = null;
let otherUid = null;

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

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        alert("로그인 후 이용할 수 있습니다.");
        window.location.href = "login.html";
        return;
    }
    currentUser = user;

    const userDoc = await db.collection("users").doc(user.uid).get();
    if (userDoc.exists) {
        currentStudentId = userDoc.data().studentId;
    }

    // 상대방 UID를 URL에서 받는다고 가정 (예: chat.html?other=상대방UID)
    otherUid = urlParams.get('other');

    // chatId가 없으면 participants 조합으로 기존 방 검색 → 없으면 새로 생성
    if (!chatId && otherUid) {
        const existing = await db.collection("chats")
            .where("participants", "in", [[currentUser.uid, otherUid], [otherUid, currentUser.uid]])
            .get();

        if (!existing.empty) {
            chatId = existing.docs[0].id;
        } else {
            const newChat = await db.collection("chats").add({
                participants: [currentUser.uid, otherUid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            chatId = newChat.id;
        }
        // URL 업데이트
        window.history.replaceState(null, null, `?id=${chatId}`);
    }

    if (!chatId) {
        alert("채팅방 정보를 찾을 수 없습니다.");
        window.location.href = "index.html";
        return;
    }

    // 내 unread 초기화
    await db.collection("chats").doc(chatId).set({
        unread: { [user.uid]: false }
    }, { merge: true });

    // 메시지 구독
    db.collection("chats").doc(chatId).collection("messages")
        .orderBy("createdAt")
        .onSnapshot((snapshot) => {
            chatBox.innerHTML = "";
            snapshot.forEach((doc) => {
                const msg = doc.data();
                const wrapper = document.createElement("div");
                wrapper.className = "d-flex mb-2 " + (msg.sender === currentUser.uid ? "justify-content-end" : "justify-content-start");

                const bubble = document.createElement("div");
                bubble.className = "msg " + (msg.sender === currentUser.uid ? "me" : "other");
                bubble.innerText = msg.text || "(빈 메시지)";

                wrapper.appendChild(bubble);
                chatBox.appendChild(wrapper);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        });

    // 메시지 전송
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (text === "") return;

        await db.collection("chats").doc(chatId).collection("messages").add({
            text: text,
            sender: currentUser.uid,
            senderStudentId: currentStudentId || "익명",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("chats").doc(chatId).set({
            lastMessage: text,
            lastSender: currentUser.uid,
            unread: {
                [currentUser.uid]: false,
                [otherUid]: true
            }
        }, { merge: true });

        messageInput.value = "";
    });

    // 채팅방 삭제
    deleteChatBtn.addEventListener("click", async () => {
        const confirmDelete = confirm("채팅방을 정말 삭제하시겠습니까?");
        if (!confirmDelete) return;

        const messagesRef = db.collection("chats").doc(chatId).collection("messages");
        const messagesSnap = await messagesRef.get();
        const batch = db.batch();
        messagesSnap.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        await db.collection("chats").doc(chatId).delete();

        alert("채팅방이 삭제되었습니다.");
        window.location.href = "index.html";
    });
});
