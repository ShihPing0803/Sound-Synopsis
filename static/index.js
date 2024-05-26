const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);

const recordButton = document.getElementById('recordButton');
let isRecording = false;
const recording_status = document.getElementsByClassName('status')[0];
const time=document.getElementsByClassName('time')[0];
const historyBlocks = document.querySelectorAll(".history-block");
let timer = null;
let seconds = 0;
var db = firebase.database();

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

var historyContainer = document.getElementById('historyContainer');

db.ref('recording').on('value', function(snapshot) {
    historyContainer.innerHTML = "";
    snapshot.forEach(function(childSnapshot, index) {
        const data = childSnapshot.val();
        const key = childSnapshot.key;
        const li = document.createElement('li');
        li.className = 'history-block';
        li.setAttribute('data-key', key);

        const h3 = document.createElement('h3');
        h3.className = 'history-title';
        h3.textContent = data.title || '未命名標題';

        const p = document.createElement('p');
        p.className = 'duration';
        p.textContent = data.duration || '00:00';

        li.appendChild(h3);
        li.appendChild(p);

        historyContainer.appendChild(li);
    });
});
recordButton.addEventListener('click', () => {
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
                    // 上傳音訊文件到後端
                    uploadAudio(audioBlob);
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
});

function uploadAudio(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.wav');

    fetch('/process_audio', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        const tabs = document.querySelectorAll(".results li");
        const content = document.querySelector(".content");

        let result = data;

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

        // 將數據推送到數據庫
        db.ref(`/recording`).push({
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
    })
    .catch(error => {
        console.error('錯誤處理音頻:', error);
    });
}

historyContainer.addEventListener("click", function(event) {
    // 檢查點擊的元素是否為 history-block 或其內部元素
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

        db.ref(`recording/${key}`).once('value', function(snapshot) {
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
});

