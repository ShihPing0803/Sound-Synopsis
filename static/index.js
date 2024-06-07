
const firebaseConfig = {
    apiKey: secrets.FIREBASE_API_KEY,
    authDomain: secrets.FIREBASE_AUTH_DOMAIN,
    databaseURL: secrets.FIREBASE_DATABASE_URL,
    projectId: secrets.FIREBASE_PROJECT_ID,
    storageBucket: secrets.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: secrets.FIREBASE_MESSAGING_SENDER_ID,
    appId: secrets.FIREBASE_APP_ID,
    measurementId: secrets.FIREBASE_MEASUREMENT_ID
};
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
const app = initializeApp(firebaseConfig);
const auth = getAuth();

firebase.initializeApp(firebaseConfig);

const recordButton = document.getElementById('recordButton');
let isRecording = false;
const recording_status = document.getElementsByClassName('status')[0];
const time=document.getElementsByClassName('time')[0];
const historyBlocks = document.querySelectorAll(".history-block");
const logoutButton = document.querySelector('.logout-button');
var historyContainer = document.getElementById('historyContainer');
let timer = null;
let seconds = 0;
var db = firebase.database();

document.addEventListener('DOMContentLoaded', function() {
    const userEmail = localStorage.getItem('userEmail');
    const historyContainer = document.getElementById('historyContainer');
    const loginButton = document.querySelector('.login-button');
    const loginOut = document.querySelector('.logout-button');
    var fileInput = document.getElementById('fileInput');
    const download = document.querySelector('.download-doc');

    if (userEmail) {
        loginButton.style.display = 'none';
        loginOut.style.display = 'block';
        logoutButton.addEventListener('click', logout);
        historyContainer.addEventListener("click", history);
        showHistory(userEmail);
    } else {
        loginButton.style.display = 'block';
        loginOut.style.display = 'none';
        loginButton.addEventListener('click', signInWithGoogle);
    }
    
    recordButton.addEventListener('click', recording);
    fileInput.addEventListener('change', uploadFile);
    download.addEventListener('click',downloadFile);
});

function logout(){
    firebase.auth().signOut().then(function() {
        localStorage.removeItem('userEmail'); 
        window.location.href = '/';
    }).catch(function(error) {
        console.error('Logout Error:', error);
    });
}

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then((result) => {
        localStorage.setItem('userEmail', result.user.email);
        window.location.href = './';
        
    }).catch((error) => {
        console.log(error);
    });
}

function formatTime(seconds) {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

function startTimer() {
    timer = setInterval(() => {
        seconds++;
        time.textContent = formatTime(seconds);
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    seconds = 0;
    time.textContent = '00:00:00';
}

function showHistory(userEmail){
    const filterEmail = userEmail.replace(/\./g, ',');
    db.ref(`${filterEmail}/recording`).on('value', function(snapshot) {
        if (snapshot.exists()) { 
            historyContainer.innerHTML = "<h2>歷史記錄</h2>";
            snapshot.forEach(function(childSnapshot) {
                const data = childSnapshot.val();
                const key = childSnapshot.key;

                const li = document.createElement('li');
                li.className = 'history-block';
                li.setAttribute('data-key', key);

                const h3 = document.createElement('h3');
                h3.className = 'history-title';
                h3.textContent = data.title || '未命名標題';
                li.appendChild(h3);
                historyContainer.appendChild(li);
            });
        } else {
            historyContainer.innerHTML = '<p>暫無歷史紀錄</p>';
        }
    });
}

let mediaRecorder;
let audioChunks = []; 
function recording(){
    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                audioChunks = [];
                startTimer();
                isRecording = true;
                recording_status.textContent = '正在錄音';

                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    uploadAudio(audioBlob);
                    audioChunks = []; 
                });
            })
            .catch(error => {
                console.error('錄音啟動失敗:', error);
            });
    } else {
        if (mediaRecorder) {
            mediaRecorder.stop();
            stopTimer();
            isRecording = false;
            recording_status.textContent = '停止錄音';
            mediaRecorder.stream.getTracks().forEach(track => track.stop()); // 停止所有軌道，關閉麥克風
        }
    }
}


function uploadFile() {
    if (this.files.length > 0) {
        const audioFile = fileInput.files[0];
        const audioBlob = new Blob([audioFile], { type: audioFile.type });
        uploadAudio(audioBlob); 
    } else {
        alert('No file selected!');
    }
}


function uploadAudio(blob) {
    var loader = document.querySelector('.loader');
    const formData = new FormData();
    formData.append('audio', blob, 'recording.wav');
    loader.style.display = 'inline-block'; 
    fetch('/process_audio', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        loader.style.display = 'none'; 
        const tabs = document.querySelectorAll(".results li");
        const content = document.querySelector(".content");

        let result = data;
        content.textContent = result.original || "無原文內容";
        document.querySelector(".original-li").classList.add("active");

        tabs.forEach(function(tab) {
            tab.addEventListener("click", function(e) {
                tabs.forEach(t => t.classList.remove("active"));
                this.classList.add("active");
                let str = "";
                switch (e.target.getAttribute("class")) {
                    case "tab-original":
                        str = result.original || "無原文內容";
                        break;
                    case "tab-modify":
                        str = result.modify || "無修改內容";
                        break;
                    case "tab-summary":
                        str = result.summary || "無總結內容";
                        break;
                    case "tab-bullet":
                        str = result.bullet_point || "無列點內容";
                        break;
                }
                content.textContent = str;
            });
        });

        const userEmail = localStorage.getItem('userEmail');
        if(userEmail){
            const filterEmail = userEmail.replace(/\./g, ',');
            db.ref(`${filterEmail}/recording`).push({
                title: result.title,
                modify: result.modify,
                summary: result.summary,
                bullet: result.bullet_point,
                original: result.original
            })
            .then(function () {
                alert("建立成功");
            }).catch(function (error) {
                console.error('資料庫伺服器發生錯誤:', error);
                alert("資料庫伺服器發生錯誤，請稍後再試");
            });
        }
        
    })
    .catch(error => {
        loader.style.display = 'none'; 
        alert('錯誤處理音頻:', error);
    });
}

function history(){
    let block = event.target.closest('.history-block');
    if (block) {
        const key = block.getAttribute('data-key');
        const fullContent = document.querySelector(".full-content");
        const mask = document.querySelector(".mask");
        const closeBtn = document.querySelector(".close-btn");
        const history_original = fullContent.querySelector(".history-original");
        const history_modification = fullContent.querySelector(".history-modification");
        const history_summary = fullContent.querySelector(".history-summary");
        const history_bullet_point = fullContent.querySelector(".history-bullet_point");
        const history_title = fullContent.querySelector(".history-title");
        const userEmail = localStorage.getItem('userEmail');
        const filterEmail = userEmail.replace(/\./g, ',');
        db.ref(`${filterEmail}/recording/${key}`).once('value', function(snapshot) {
            var data = snapshot.val();
            if (data) {
                history_title.textContent = data.title;
                history_modification.textContent = data.modify || "無修飾內容";
                history_original.textContent = data.original || "無原文內容";
                history_summary.textContent = data.summary || "無摘要內容";
                history_bullet_point.textContent = data.bullet || "無重點內容";
            }
        });
        
        fullContent.classList.remove("hidden");
        mask.classList.remove("hidden");
        closeBtn.addEventListener("click", function() {
            fullContent.classList.add("hidden");
            mask.classList.add("hidden");
        });
    }
}

