
// Firebase config (same as your project)
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

const chatListEl = document.getElementById("chatList");
const emptyStateEl = document.getElementById("emptyState");

function maskId(id) {
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
        alert("로그인 후 이용하세요");
        location.href = "login.html";
        return;
    }

    // Subscribe to chats where current user participates
    db.collection("chats")
        .where("participants", "array-contains", user.uid)
        .onSnapshot(async (snapshot) => {
            console.log("채팅방 개수:", snapshot.size);

            chatListEl.innerHTML = "";
            emptyStateEl.style.display = snapshot.size === 0 ? "block" : "none";

            // To display masked student IDs, we load users doc for the other participant if needed
            const docs = snapshot.docs;

            for (const docSnap of docs) {
                const chat = docSnap.data();
                const chatId = docSnap.id;

                // Determine other participant UID
                const others = (chat.participants || []).filter(p => p !== user.uid);
                const otherUid = others[0] || null;

                // Try to fetch other participant's studentId for display
                let otherStudentMasked = "알 수 없음";
                if (otherUid) {
                    try {
                        const otherUserDoc = await db.collection("users").doc(otherUid).get();
                        if (otherUserDoc.exists) {
                            const sid = otherUserDoc.data().studentId;
                            otherStudentMasked = maskId(sid || "익명");
                        } else {
                            otherStudentMasked = maskId("익명");
                        }
                    } catch (e) {
                        console.warn("상대 사용자 정보 조회 실패:", e);
                    }
                }

                // Unread badge for current user
                const unreadObj = chat.unread || {};
                const isUnread = unreadObj[user.uid] === true;

                // Last message preview
                const preview = chat.lastMessage || "메시지 없음";

                const li = document.createElement("li");
                li.className = "list-group-item d-flex justify-content-between align-items-center chat-item";
                li.innerHTML = `
              <div>
                <div><strong>상대방:</strong> ${otherStudentMasked}</div>
                <div class="subtitle">${preview}</div>
              </div>
              <div class="d-flex align-items-center gap-2">
                ${isUnread ? '<span class="badge badge-unread text-white">새 메시지</span>' : ''}
                <button class="btn btn-sm btn-primary">입장</button>
              </div>
            `;
                li.addEventListener("click", (e) => {
                    // If click on the item or button, go to chat
                    location.href = "chat.html?id=" + chatId;
                });
                li.querySelector("button").addEventListener("click", (e) => {
                    e.stopPropagation();
                    location.href = "chat.html?id=" + chatId;
                });

                chatListEl.appendChild(li);
            }
        });
});