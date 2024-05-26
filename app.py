from flask import Flask, render_template, request, jsonify
import numpy as np
import openai
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_community.llms import OpenAI
#from langchain_openai import OpenAI
from langchain import OpenAI
from langchain.text_splitter import CharacterTextSplitter
from langchain.chains.mapreduce import MapReduceChain
from langchain.docstore.document import Document
from langchain.chains.summarize import load_summarize_chain

openai.api_key = os.getenv("OPENAI_API_KEY")
app = Flask(__name__)

client = OpenAI()
# Global variables
fs = 44100  # Sample rate
filename = "output.wav"
is_recording = False

class NamedBytesIO(io.BytesIO):
    name = 'transcript.wav'
    
def generate_title(text):
    response = client.chat.completions.create(
        model ="gpt-4o",
        messages=[
            {"role": "system", "content": "依據原文給定標題，以文字的語言為主，標題在十個字以內精簡明瞭。若無原文內容則以無內容表示，結果請以繁體中文"},
            {"role": "user", "content": text}
        ],
        max_tokens=60
    )
    print(response)
    title = response.choices[0].message.content
    return title

def speech_to_text():
    audio_file_path="./output.wav"
    audio_file= open(audio_file_path, "rb")
    transcript = openai.Audio.transcribe("whisper-1", audio_file)
    text = transcript.to_dict()['text']

    return text

def text_summmarization(modify_text):
    response = client.chat.completions.create(
        model ="gpt-4o",
        messages=[
            {"role": "system", "content": "依據原文進行摘要，若無原文內容則以無內容表示，結果請以繁體中文"},
            {"role": "user", "content": modify_text}
        ]
    )
    print(response)
    summary = response.choices[0].message.content
    return summary

def text_modify(original_text):
    response = client.chat.completions.create(
        model ="gpt-4o",
        messages=[
            {"role": "system", "content": "依據原文加上適當的標點符號，並且去掉冗言贅字，其餘請勿更動員內容，結果請以繁體中文顯示"},
            {"role": "user", "content": original_text}
        ]
    )
    print(response)
    summary = response.choices[0].message.content
    return summary

def bullet_point(modify_text):
    response = client.chat.completions.create(
        model ="gpt-4o",
        messages=[
            {"role": "system", "content": "依據原文列點說明，若無原文內容則以無內容表示，結果請以繁體中文"},
            {"role": "user", "content": modify_text}
        ]
    )
    bullet_point = response.choices[0].message.content
    print(bullet_point)
    return bullet_point
                   

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['email']
        password = request.form['pwd']
        #user = User.query.filter_by(username=username, password=password).first()
        if username=='123@gmail.com' and password=='123':
            return render_template('index.html')
        else:
            error_message = '登入失敗，請檢查您的帳號密碼'
            return render_template('login.html', error_message=error_message)
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.json['email']
        password = request.json['password']
    try:
        # 使用 Firebase 驗證用戶
        user = auth.verify_password(email, password)
        print(user)
        return jsonify({"message": "Login successful", "user_id": user.uid}), 200
    except auth.AuthError as e:
        return jsonify({"error": str(e)}), 401

@app.route('/process_audio', methods=['POST'])
def process_audio():
    audio_file = request.files['audio']
    if audio_file:
        audio_stream = NamedBytesIO(audio_file.read())
        audio_stream.name = 'transcript.wav' 

        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_stream,
            response_format='text'
        )
        cc = OpenCC('s2t')
        text = cc.convert(transcript)
        title = generate_title(text)
        modify = text_modify(text)
        result = text_summmarization(modify)
        print(result)
        bullet_point_text = bullet_point(modify)
        return jsonify({'title': title,'original':text,'modify' : modify,'summary': result,'bullet_point':bullet_point_text})
    return jsonify({'error': '沒有接收到音訊文件'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=os.getenv("PORT", default=5000), host='0.0.0.0')
