// ============================
// Seasonal/Product Category Boosts
// ============================
var productCategoryBoosts = {
    cars: 0.10,        // 10% boost
    toys: 0.20,
    clothing: 0.15,
    electronics: 0.10,
    food: 0.05,
    retail: 0.08
};

// ============================
// CSV export util
// ============================
function exportToCSV(labels, predictedData, cumulativeData) {
    var csvContent = "Month,Predicted Sales,Cumulative Sales\n";
    for (var i = 0; i < labels.length; i++) {
        var row = [
            labels[i],
            predictedData[i] !== undefined ? predictedData[i] : "",
            cumulativeData[i] !== undefined ? cumulativeData[i] : ""
        ].join(",");
        csvContent += row + "\n";
    }
    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sales_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================
// Helper - random between
// ============================
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// ============================
// DOM Ready
// ============================
document.addEventListener("DOMContentLoaded", function () {

    var form = document.querySelector("form");
    var chartCanvas = document.getElementById("salesChart");
    var calendarOutput = document.getElementById("salesCalendar");
    var downloadBtn = document.getElementById("downloadCSV");
    var toggleCumulative = document.getElementById("toggleCumulative");
    var productType = document.getElementById("product_type");
    var previousSalesBlock = document.getElementById("previousSalesBlock");
    var volumeBlock = document.getElementById("volumeBlock");
    var productCategorySelect = document.getElementById("product_category");

    // Toggle fields based on product type
    function toggleProductFields() {
        if (productType && productType.value === "old") {
            previousSalesBlock.style.display = "block";
            volumeBlock.style.display = "none";
        } else {
            previousSalesBlock.style.display = "none";
            volumeBlock.style.display = "block";
        }
    }
    if (productType) {
        productType.addEventListener("change", toggleProductFields);
        toggleProductFields();
    }

    var labels = [];
    var predictedData = [];
    var cumulativeData = [];

    if (form && chartCanvas) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            var formData = new FormData(form);
            var data = {};
            formData.forEach(function (v, k) { data[k] = v; });

            // Base sales
            var currentSales = 0;
            if (data.product_type === "old") {
                currentSales = parseFloat(data.previous_annual_sales || "0") || 0;
            } else {
                var volume = parseInt(data.volume || "0", 10) || 0;
                var price = parseFloat(data.price || "0") || 0;
                currentSales = volume * price;
            }

            var years = parseInt(data.year || "0", 10) || 0;
            var months = parseInt(data.month || "0", 10) || 0;
            var monthsAhead = months === 0 ? (years * 12) : (years * 12 + months);
            if (monthsAhead <= 0) monthsAhead = 6; // fallback

            labels = [];
            predictedData = [];
            cumulativeData = [];

            // Seasonal boost based on category
            var productCategory = (data.product_category || "").toLowerCase();
            var seasonalBoost = productCategoryBoosts[productCategory] || 0;

            var today = new Date();
            var runningSales = currentSales;
            var cumulative = 0;

            for (var i = 0; i < monthsAhead; i++) {
                var label = new Date(today.getFullYear(), today.getMonth() + i, 1)
                    .toLocaleString('default', { month: 'short', year: 'numeric' });
                labels.push(label);

                // Monthly fluctuation with small randomness
                runningSales = runningSales * (0.95 + Math.random() * 0.15);

                // Apply seasonal/product category boost
                var predictedValue = runningSales * (1 + seasonalBoost);
                predictedData.push(parseFloat(predictedValue.toFixed(2)));

                cumulative += predictedValue;
                cumulativeData.push(parseFloat(cumulative.toFixed(2)));
            }

            if (window.salesChartInstance) window.salesChartInstance.destroy();

            window.salesChartInstance = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Predicted Sales',
                            data: predictedData,
                            borderColor: 'blue',
                            backgroundColor: 'rgba(54,162,235,0.2)',
                            tension: 0.3,
                            pointRadius: 3
                        },
                        {
                            label: 'Cumulative Sales',
                            data: cumulativeData,
                            borderColor: 'green',
                            backgroundColor: 'rgba(75,192,192,0.2)',
                            tension: 0.3,
                            pointRadius: 3,
                            hidden: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return `$${context.parsed.y}`;
                                }
                            }
                        },
                        legend: { display: true }
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Sales ($)' } },
                        x: { title: { display: true, text: 'Month' } }
                    }
                }
            });

            if (calendarOutput) {
                calendarOutput.innerText =
                    "Sales prediction for " + (data.product || "your product") +
                    " over the next " + years + " years and " + months + " months.";
            }

            // Toggle cumulative dataset visibility
            if (toggleCumulative) {
                toggleCumulative.addEventListener("change", function () {
                    if (window.salesChartInstance) {
                        window.salesChartInstance.setDatasetVisibility(1, toggleCumulative.checked);
                        window.salesChartInstance.update();
                    }
                });
            }

            if (downloadBtn) {
                downloadBtn.addEventListener("click", function () {
                    if (labels.length > 0) exportToCSV(labels, predictedData, cumulativeData);
                    else alert("No data available to export. Run prediction first.");
                }, { once: true });
            }
        });
    }
});