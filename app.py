from flask import Flask, render_template, request, redirect, url_for, session, send_file
import json, os, sys, requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "business25")

HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_MODEL = "distilgpt2"

def query_huggingface(prompt):
    try:
        response = requests.post(
            f"https://api-inference.huggingface.co/models/{HF_MODEL}",
            headers={"Authorization": f"Bearer {HF_API_TOKEN}"},
            json={"inputs": prompt}
        )
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and "generated_text" in result[0]:
                return result[0]["generated_text"]
            return str(result)
        else:
            return f"Error from Hugging Face API: {response.text}"
    except Exception as e:
        return f"Exception calling Hugging Face API: {e}"

@app.route('/')
def home():
    return render_template('index.html', name="Sprite Blue Jet")

@app.route('/predict-future-sales', methods=['GET', 'POST'])
def sales():
    if request.method == 'POST':
        month = int(request.form.get('month', 0))
        if month not in [3, 6, 9]:
            return "Invalid month selection. Only 3, 6, or 9 months are allowed.", 400

        data = {
            'previous_sales': request.form.get('previous_sales'),
            'product': request.form.get('product'),
            'price': request.form.get('price'),
            'marketing_budget': request.form.get('marketing_budget'),
            'season': request.form.get('season'),
            'year': request.form.get('year'),
            'month': month
        }
        session['sales_data'] = data
        file_path = os.path.join(os.path.dirname(__file__), 'sales_data.json')
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        return '', 204

    return render_template('sales.html')

@app.route('/download-sales-data')
def download_sales():
    file_path = os.path.join(os.path.dirname(__file__), 'sales_data.json')
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return "sales_data.json not found", 404

@app.route('/business-improvement-guide')
def improvement():
    data = session.get('sales_data')
    if not data:
        return redirect(url_for('sales'))

    previous_sales = float(data.get('previous_sales', 0))
    marketing_budget = float(data.get('marketing_budget', 0))

    predicted_sales = round(previous_sales * (1.1 + marketing_budget * 0.001), 2)

    data['predicted_sales'] = predicted_sales

    prompt = f"Sales data: {data}. Provide improvement suggestions in a professional tone."
    ai_feedback = query_huggingface(prompt)

    return render_template('improvement.html', data=data, feedback=ai_feedback)

@app.route('/update-sales-data', methods=['POST'])
def update_sales_data():
    updated = request.get_json()
    file_path = os.path.join(os.path.dirname(__file__), 'sales_data.json')
    with open(file_path, 'w') as f:
        json.dump(updated, f, indent=2)
    return '', 204

@app.route('/version')
def version():
    return f"Python version: {sys.version}"

@app.route('/health')
def health():
    return "OK", 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)