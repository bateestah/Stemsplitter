import os
import uuid
from flask import Flask, render_template, request, redirect, url_for
from spleeter.separator import Separator

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'static/stems'

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# Prepare folders
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Initialize separator once to reuse model
separator = Separator('spleeter:4stems')


@app.route('/', methods=['GET', 'POST'])
def index():
    """Render upload form and handle stem separation."""
    if request.method == 'POST':
        if 'audio' not in request.files:
            return redirect(request.url)
        file = request.files['audio']
        if file.filename == '':
            return redirect(request.url)

        audio_id = str(uuid.uuid4())
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{audio_id}.mp3")
        file.save(upload_path)

        stem_dir = os.path.join(app.config['OUTPUT_FOLDER'], audio_id)
        os.makedirs(stem_dir, exist_ok=True)
        separator.separate_to_file(upload_path, stem_dir, codec='mp3')

        stems = ['vocals', 'drums', 'bass', 'other']
        stem_files = {stem: url_for('static', filename=f'stems/{audio_id}/{stem}.mp3')
                      for stem in stems}
        return render_template('stems.html', stems=stem_files)

    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True)
