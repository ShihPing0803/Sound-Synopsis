const recordButton = document.getElementById('recordButton');
let isRecording = false;
const recording_status = document.getElementsByClassName('status')[0];
const time=document.getElementsByClassName('time')[0];
let timer = null;
let seconds = 0;

document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('fileInput');
    const download = document.querySelector('.download-doc');
    
    recordButton.addEventListener('click', recording);
    fileInput.addEventListener('change', uploadFile);
    //download.addEventListener('click',downloadFile);
});

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
        console.log(this.files);
        const fileType = this.files[0].type
        if(fileType.startsWith('audio/'))
        {
            const audioFile = fileInput.files[0];
            const audioBlob = new Blob([audioFile], { type: audioFile.type });
            uploadAudio(audioBlob); 
        }
        else if(fileType.startsWith('application/')||fileType.startsWith('text/')){
            uploadText();
        }
         
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
        
    })
    .catch(error => {
        loader.style.display = 'none'; 
        alert('錯誤處理音頻:', error);
    });
}

function uploadText(){
    var loader = document.querySelector('.loader');
    const formData = new FormData();
    const file = fileInput.files[0];
    formData.append('file', file);
    loader.style.display = 'inline-block'; 
    fetch('/process_text', {
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
    })
    .catch(error => {
        loader.style.display = 'none'; 
        alert('錯誤處理音頻:', error);
    });
}
