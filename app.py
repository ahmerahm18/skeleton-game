from flask import Flask, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def serve_index():
    return send_from_directory('templates', 'index.html')

@app.route('/<path:filename>')
def serve_file(filename):
    # Define the directory mappings based on your file structure
    file_mappings = {
        # CSS files
        'styles.css': ('static/css', 'styles.css'),
        
        # JavaScript files
        'game.js': ('static/js', 'game.js'),
        
        # Image files - map the requested path to actual path
        'images/': 'static/images/',
        'static/images/': 'static/images/',
    }
    
    # Check if it's an image request
    if filename.startswith('images/') or filename.startswith('static/images/'):
        # Remove the prefix and serve from static/images
        image_name = filename.split('/')[-1]  # Get just the filename
        file_path = os.path.join('static/images', image_name)
        if os.path.exists(file_path):
            return send_from_directory('static/images', image_name)
    
    # Check direct file mappings
    if filename in file_mappings:
        directory, file_name = file_mappings[filename]
        if os.path.exists(os.path.join(directory, file_name)):
            return send_from_directory(directory, file_name)
    
    # Try different directories in order
    search_paths = [
        ('static/css', filename),
        ('static/js', filename),
        ('static/images', filename),
        ('templates', filename),
        ('.', filename)  # Root directory as fallback
    ]
    
    for directory, file_name in search_paths:
        file_path = os.path.join(directory, file_name)
        if os.path.exists(file_path):
            return send_from_directory(directory, file_name)
    
    return f"File {filename} not found", 404

@app.route('/debug')
def debug_files():
    files = []
    
    directories = ['static/css', 'static/js', 'static/images', 'templates', '.']
    
    for directory in directories:
        if os.path.exists(directory):
            files.append(f"<h3>{directory.upper()} Directory:</h3>")
            for file in os.listdir(directory):
                file_path = os.path.join(directory, file)
                if os.path.isfile(file_path):
                    files.append(f"{directory}/{file} - {os.path.getsize(file_path)} bytes")
        else:
            files.append(f"<h3>{directory.upper()} Directory: NOT FOUND</h3>")
    
    return '<br>'.join(files)

if __name__ == '__main__':
    app.run(debug=True)