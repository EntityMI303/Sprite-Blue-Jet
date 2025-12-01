from flask import Flask, render_template, request, session, send_file, redirect, url_for
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
    if request.method == 'POST':
        # ==========================
        # Collect form data
        # ==========================
        product_type = request.form.get('product_type')
        product = request.form.get('product')
        marketing_timeframe = request.form.get('marketing_timeframe')
        product_category = request.form.get('product_category')
        season = request.form.get('season', 'All Seasons')  # default if empty

        try:
            month = int(request.form.get('month', 0))
            year = int(request.form.get('year', 1))
        except ValueError:
            return "Invalid month or year", 400

        if month not in [0, 3, 6, 9]:
            return "Invalid month selection. Only 0, 3, 6, or 9 allowed.", 400

        # ==========================
        # Build data dictionary
        # ==========================
        data = {
            "product_type": product_type,
            "product": product,
            "price": float(request.form.get("price", 0)),
            "marketing_budget": float(request.form.get("marketing_budget", 0)),
            "marketing_timeframe": marketing_timeframe,
            "year": year,
            "month": month,
            "product_category": product_category,
            "season": season
        }

        # Old product uses previous sales
        if product_type == "old":
            previous_sales = float(request.form.get("previous_sales", 0))
            # optional years of previous sales
            previous_sales_years = int(request.form.get("previous_sales_years", 1))
            previous_annual_sales = (
                previous_sales / previous_sales_years if previous_sales_years > 0 else 0
            )
            data.update({
                "previous_sales": previous_sales,
                "previous_sales_years": previous_sales_years,
                "previous_annual_sales": previous_annual_sales
            })
        else:
            # New product uses volume estimate
            volume = int(request.form.get("volume", 0))
            data["volume"] = volume

        # ==========================
        # Save to session + local JSON
        # ==========================
        session["sales_data"] = data
        file_path = os.path.join(os.path.dirname(__file__), "sales_data.json")
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

        # After POST, stay on sales.html so JS can render chart
        return render_template("sales.html", data=data)

    # GET request
    return render_template("sales.html")


# ==========================
# Download sales JSON
# ==========================
@app.route('/download_sales')
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