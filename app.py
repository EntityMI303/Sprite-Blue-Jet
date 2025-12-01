from flask import Flask, render_template, request, session, send_file
import json, os, sys

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "business25")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/sales', methods=['GET', 'POST'])
def sales():
    if request.method == 'POST':
        product_type = request.form.get('product_type')

        try:
            month = int(request.form.get('month', 0))
        except ValueError:
            return "Invalid month value", 400

        if month not in [0, 3, 6, 9]:
            return "Invalid month selection. Only 0, 3, 6, or 9 months are allowed.", 400

        data = {
            'product_type': product_type,
            'product': request.form.get('product'),
            'price': request.form.get('price'),
            'marketing_budget': request.form.get('marketing_budget'),
            'marketing_timeframe': request.form.get('marketing_timeframe'),
            'season': request.form.get('season'),
            'year': request.form.get('year'),
            'month': month
        }

        if product_type == 'old':
            data['previous_sales'] = request.form.get('previous_sales')
            data['previous_sales_years'] = request.form.get('previous_sales_years')
        else:  # new product
            data['volume'] = request.form.get('volume')

        session['sales_data'] = data
        file_path = os.path.join(os.path.dirname(__file__), 'sales_data.json')
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)

        return render_template('improvement.html', data=data)

    return render_template('sales.html')

@app.route('/download-sales-data')
def download_sales():
    file_path = os.path.join(os.path.dirname(__file__), 'sales_data.json')
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return "sales_data.json not found", 404

@app.route('/improvement')
def improvement():
    data = session.get('sales_data')
    return render_template('improvement.html', data=data)

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

@app.route('/version')
def version():
    return f"Python version: {sys.version}"

@app.route('/health')
def health():
    return "OK", 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)