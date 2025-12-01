from flask import Flask, render_template, session, send_file
import json, os, sys

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "business25")

# ==========================
# Home route
# ==========================
@app.route('/')
def home():
    return render_template('index.html')


# ==========================
# Sales form route (GET only)
# ==========================
@app.route('/sales')
def sales():
    # Pass any existing sales data to JS
    data = session.get("sales_data")
    return render_template("sales.html", sales_data_json=json.dumps(data or {}))


# ==========================
# Download sales JSON
# ==========================
@app.route('/download-sales-data')
def download_sales():
    file_path = os.path.join(os.path.dirname(__file__), 'sales_data.json')
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return "sales_data.json not found", 404


# ==========================
# Improvement guide route
# ==========================
@app.route('/improvement')
def improvement():
    data = session.get("sales_data")
    return render_template("improvement.html", data=data, sales_data_json=json.dumps(data or {}))


# ==========================
# Static placeholder pages
# ==========================
@app.route('/finance')
def finance():
    return "<h1>💰 Financial Planning</h1><p>Coming Soon...</p>"

@app.route('/operations')
def operations():
    return "<h1>⚙️ Operations Management</h1><p>Coming Soon...</p>"

@app.route('/customers')
def customers():
    return "<h1>👥 Customer Insights</h1><p>Coming Soon...</p>"

@app.route('/hr')
def hr():
    return "<h1>🧑‍💼 HR & Team Management</h1><p>Coming Soon...</p>"


# ==========================
# Diagnostics
# ==========================
@app.route('/version')
def version():
    return f"Python version: {sys.version}"

@app.route('/health')
def health():
    return "OK", 200


# ==========================
# Run app
# ==========================
if __name__ == '__main__':
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=True
    )