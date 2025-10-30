
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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let 전체상품목록 = [];

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
            <li><a class="dropdown-item" href="#" id="logoutBtn">로그아웃</a></li>
        </ul>
    </div>
    `;
        document.getElementById("logoutBtn").addEventListener("click", () => {
            auth.signOut().then(() => {
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("로그아웃 에러", error);
            })
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

// 상품 렌더링 함수
function 상품렌더링(상품목록) {
    const root = document.getElementById('product-grid-container');
    root.innerHTML = '';
    상품목록.forEach((data) => {
        let formattedDate = '날짜 없음';
        if (data.날짜 && data.날짜.toDate) {
            const dateObj = data.날짜.toDate();
            formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
        }

        let formattedPrice = '가격 없음';
        if (!isNaN(data.가격)) {
            formattedPrice = Number(data.가격).toLocaleString('ko-KR') + '원';
        }

        const 템플릿 = `
        <div class="product border mb-3 bg-white">
            <div class="thumbnail" style="background-image: url('${data.이미지URL || "https://i.ibb.co/TqckztRV/yum-logo.png"}');"></div>
            <div class="flex-grow-1 p-3"> 
                <h5 class="title mb-1">${data.제목}</h5>
                <p class="text-muted mb-1" style="font-size:0.9rem;">${formattedDate}</p>
                <p class="price fw-bold mb-1">${formattedPrice}</p>
                ${data.카테고리 ? `<span class="badge text-bg-light">${data.카테고리}</span>` : ''}
            </div>
        </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = 템플릿;
        const card = wrapper.firstElementChild;

        // ✅ 카드 전체 클릭 시 detail.html로 이동
        card.addEventListener("click", () => {
            window.location.href = `detail.html?id=${data.id}`;
        });

        root.appendChild(card);
    });
}

// Firestore에서 상품 불러오기
db.collection('product').get().then((결과) => {
    전체상품목록 = 결과.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    상품렌더링(전체상품목록);
});

// 최근 검색어 기능
const MAX_HISTORY = 5;
function 저장검색기록(키워드) {
    let 기록 = JSON.parse(localStorage.getItem('searchHistory')) || [];
    기록 = 기록.filter(item => item !== 키워드);
    기록.unshift(키워드);
    if (기록.length > MAX_HISTORY) 기록 = 기록.slice(0, MAX_HISTORY);
    localStorage.setItem('searchHistory', JSON.stringify(기록));
}

function 출력검색기록() {
    const 기록 = JSON.parse(localStorage.getItem('searchHistory')) || [];
    const box = document.getElementById('recent-searches');
    if (기록.length === 0) {
        box.classList.add('d-none');
        box.innerHTML = '';
        return;
    }
    box.classList.remove('d-none');
    box.innerHTML = `
    <div class="header d-flex justify-content-between align-items-center" >
        <span>최근 검색어</span>
        <button id="clearHistory" class="btn btn-sm btn-link">지우기</button>
        </ >
    ${기록.map(k => `<div class="item" data-key="${k}">${k}</div>`).join('')}
`;
    document.getElementById('clearHistory').addEventListener('click', () => {
        localStorage.removeItem('searchHistory');
        출력검색기록();
    });
    box.querySelectorAll('.item').forEach(el => {
        el.addEventListener('click', () => {
            const key = el.getAttribute('data-key');
            document.getElementById('searchInput').value = key;
            실행검색(key);
            box.classList.add('d-none');
        });
    });
}

function 실행검색(키워드) {
    const q = (키워드 || '').trim();
    if (q === '') {
        상품렌더링(전체상품목록);
        return;
    }
    const lower = q.toLowerCase();
    const 필터 = 전체상품목록.filter(item => {
        const 제목 = (item.제목 || '').toLowerCase();
        const 내용 = (item.내용 || '').toLowerCase();
        const 카테고리 = (item.카테고리 || '').toLowerCase();
        return 제목.includes(lower) || 내용.includes(lower) || 카테고리.includes(lower);
    });
    상품렌더링(필터);
}

// 검색 폼 이벤트
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const recentBox = document.getElementById('recent-searches');

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const 키워드 = searchInput.value.trim();
    if (키워드) 저장검색기록(키워드);
    실행검색(키워드);
    recentBox.classList.add('d-none');
});

// 입력 포커스 시 최근 검색어 표시
searchInput.addEventListener('focus', () => 출력검색기록());
// 입력 중에도 최근 검색 박스 유지 (필요 시 자동 숨김 가능)
searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() === '') 출력검색기록();
    else recentBox.classList.add('d-none');
});
// 폼 영역 밖 클릭 시 최근 검색어 박스 숨기기
document.addEventListener('click', (e) => {
    const withinForm = searchForm.contains(e.target);
    if (!withinForm) recentBox.classList.add('d-none');
});