from flask import Flask, render_template, request, jsonify
import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write
import threading
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
import whisper_timestamped as whisper

app = Flask(__name__)

# Global variables
fs = 44100  # Sample rate
filename = "output.wav"
is_recording = False

def speech_to_text():
    audio_file_path="./output.wav"
    audio_file= open(audio_file_path, "rb")
    transcript = openai.Audio.transcribe("whisper-1", audio_file,detect_disfluencies=True)
    text = transcript.to_dict()['text']
    """
    audio = whisper.load_audio("./output.wav")

    model = whisper.load_model("tiny", device="cpu")

    result = whisper.transcribe(model, audio, language="en", detect_disfluencies=True)

    print(result)
    """
    return text

def text_summmarization(original_text):
    llm = OpenAI(temperature=0)
    text_splitter = CharacterTextSplitter()
    texts = text_splitter.split_text(original_text)
    docs = [Document(page_content=t) for t in texts[:3]]
    chain = load_summarize_chain(llm, chain_type="map_reduce")
    result=chain.invoke(docs,return_only_outputs=True)
    return result

def bullet_point(original_text):
    llm = OpenAI(temperature=0)
    prompt_template = """請列點並分重點總結內容，若無內容則以無內容表示，請勿隨意生成其他不相干內容： {text}
    分重點說明："""
    BULLET_POINT_PROMPT = PromptTemplate(template=prompt_template, input_variables=["text"])
    text_splitter = CharacterTextSplitter()
    texts = text_splitter.split_text(original_text)
    docs = [Document(page_content=t) for t in texts[:3]]
    chain = load_summarize_chain(llm, chain_type="stuff", prompt=BULLET_POINT_PROMPT)
    result=chain.invoke(docs,return_only_outputs=True)
    return result
                   
def record_audio():
    global audio_buffer
    audio_buffer = []
    while is_recording:
        chunk = sd.rec(int(1 * fs), samplerate=fs, channels=1, dtype='int16')
        sd.wait()
        audio_buffer.append(chunk)
    recording = np.concatenate(audio_buffer)
    write(filename, fs, recording)
    print(f"Recording saved as {filename}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start_recording', methods=['POST'])
def start_recording():
    global is_recording, recording_thread
    if not is_recording:
        is_recording = True
        recording_thread = threading.Thread(target=record_audio)
        recording_thread.start()
    return 'Recording started.'

@app.route('/stop_recording', methods=['POST'])
def stop_recording():
    global is_recording
    if is_recording:
        is_recording = False
        recording_thread.join()  # Wait for the recording thread to finish
    return 'Recording stopped.'

@app.route('/process_audio',methods=['POST'])
def process_audio():
    original_text=speech_to_text()
    result=text_summmarization(original_text)["output_text"]
    bullet_point_text=bullet_point(original_text)["output_text"]
    return jsonify({'original':original_text,'summary': result,'bullet_point':bullet_point_text})

if __name__ == '__main__':
    app.run(debug=True, port=os.getenv("PORT", default=5000), host='0.0.0.0')
