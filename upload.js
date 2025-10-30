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
const storage = firebase.storage();
const auth = firebase.auth();

const supabaseUrl = "https://rzlrhyvjhjhbfqoschnq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bHJoeXZqaGpoYmZxb3NjaG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODEwODksImV4cCI6MjA3NDM1NzA4OX0.h9nyY6zrmOwNRbua7be5lDcm6J_HzKyKP3M80NAxYzw";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentStudentId = null;

// 로그인 상태 확인
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        

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

// 업로드 버튼 클릭 이벤트
$('#send').click(async function () {
    if (!currentUser || !currentStudentId) {
        alert("로그인 정보가 없습니다.");
        return;
    }

    const productimages = document.getElementById("product-images");
    if (!productimages.files.length) {
        alert("파일을 선택해주세요.");
        return;
    }

    const file = productimages.files[0];
    // 파일 이름에서 한글, 특수문자 제거 (영문, 숫자, 점, 언더바, 하이픈만 허용)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${Date.now()}_${safeName}`;

    // Supabase Storage 업로드 (Content-Type 명시)
    const { data, error } = await supabaseClient.storage
        .from("product-images")
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
        });

    if (error) {
        console.error("업로드 실패:", error.message, error.statusCode, error);
        alert("이미지 업로드 실패: " + error.message);
        return;
    }

    // 업로드 후 public URL 가져오기
    const { data: urlData, error: urlError } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(fileName);

    if (urlError) {
        console.error("URL 가져오기 실패:", urlError);
        alert("이미지 URL 가져오기 실패");
        return;
    }

    const publicUrl = urlData.publicUrl;

    // Firestore에 상품 정보 저장
    const save = {
        제목: $('#title').val(),
        가격: $('#price').val(),
        내용: $('#content').val(),
        이미지URL: publicUrl,      // 업로드한 이미지 URL 저장
        날짜: new Date(),
        작성자UID: currentUser.uid,
        작성자학번: currentStudentId
    };

    try {
        await db.collection('product').add(save);
        alert("상품이 등록되었습니다!");
        window.location.href = "index.html";
    } catch (err) {
        console.error("상품 등록 실패:", err);
        alert("상품 등록 실패");
    }
});