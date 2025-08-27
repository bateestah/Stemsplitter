import sys
import os
import subprocess
import json

def main():
    if len(sys.argv) < 3:
        print("Usage: split.py <input_file> <output_dir>")
        return
    input_file = sys.argv[1]
    out_dir = sys.argv[2]
    # run demucs
    subprocess.check_call([
        'demucs',
        '--mp3',
        '-o', out_dir,
        input_file
    ])
    # demucs output directory structure: out_dir/model/song/*.mp3
    model_folder = os.listdir(out_dir)[0]
    song_folder = os.listdir(os.path.join(out_dir, model_folder))[0]
    stems_dir = os.path.join(out_dir, model_folder, song_folder)
    stems = {}
    for stem_file in os.listdir(stems_dir):
        if stem_file.endswith('.mp3'):
            src = os.path.join(stems_dir, stem_file)
            dest = os.path.join(out_dir, stem_file)
            os.rename(src, dest)
            stems[os.path.splitext(stem_file)[0]] = dest
    # clean intermediate folders
    subprocess.call(['rm', '-rf', os.path.join(out_dir, model_folder)])
    print(json.dumps(stems))

if __name__ == '__main__':
    main()
