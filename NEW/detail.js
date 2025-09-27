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