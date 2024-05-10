const recordButton = document.getElementById('recordButton');
let isRecording = false;
const recording_status = document.getElementsByClassName('status')[0];
const time=document.getElementsByClassName('time')[0];
const historyBlocks = document.querySelectorAll(".history-block");

let timer = null;
let seconds = 0;
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

recordButton.addEventListener('click', async () => {
    if (!isRecording) {
        await fetch('/start_recording', { method: 'POST' });
        isRecording = true;
        recording_status.textContent = '正在錄音';
        startTimer();
    } else {
        await fetch('/stop_recording', { method: 'POST' });
        stopTimer();
        isRecording = false;
        recording_status.textContent = '停止錄音';
        loader.classList.remove('hidden'); // 顯示 loader
        try {
            const response = await fetch('/process_audio', { method: 'POST' });
            const result = await response.json();
            document.getElementById('summary').textContent = result.summary || '尚無總結內容。';
            document.getElementById('bullet_point').textContent = result.bullet_point || '尚無重點總結內容。';
            document.getElementById('original').textContent = result.original || '尚無原文內容。';
        } catch (error) {
            console.error('Error processing audio:', error);
        } finally {
            loader.classList.add('hidden'); 
        }
    }
});

historyBlocks.forEach(block => {
    block.addEventListener("click", function() {
        const fullContent = document.querySelector(".full-content");
        const mask = document.querySelector(".mask");
        const closeBtn = document.querySelector(".close-btn");
        fullContent.classList.remove("hidden");
        mask.classList.remove("hidden");
        closeBtn.addEventListener("click",function(){
            fullContent.classList.add("hidden");
            mask.classList.add("hidden");
        })

    });
});