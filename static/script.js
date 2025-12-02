// Utility function to convert chart data to CSV
function exportToCSV(labels, predictedData, marketingData) {
    let csvContent = "Month,Predicted Sales,Sales Based On Market Investments\n";
    for (let i = 0; i < labels.length; i++) {
        const row = [
            labels[i],
            predictedData[i] || "",
            marketingData[i] || ""
        ].join(",");
        csvContent += row + "\n";
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sales_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener("DOMContentLoaded", function () {
    // ============================
    // SALES PAGE LOGIC
    // ============================
    const form = document.querySelector("form");
    const chartCanvas = document.getElementById("salesChart");

    const togglePredicted = document.getElementById("togglePredicted");
    const toggleMarketing = document.getElementById("toggleMarketing");
    const downloadBtn = document.getElementById("downloadCSV");

    // Product type toggle blocks
    const productType = document.getElementById("product_type");
    const previousSalesBlock = document.getElementById("previousSalesBlock");
    const volumeBlock = document.getElementById("volumeBlock");

    function toggleProductFields() {
        if (productType.value === "old") {
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

    let labels = [];
    let predictedData = [];
    let marketingData = [];

    if (form && chartCanvas) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            await fetch("/sales", { method: "POST", body: formData });

            const year = parseInt(data.year);
            const month = parseInt(data.month);
            const marketingBudget = parseFloat(data.marketing_budget);
            const timeframe = data.marketing_timeframe;

            let baseSales = 0;
            if (data.product_type === "old") {
                baseSales = parseFloat(data.previous_sales);
            } else {
                const volume = parseInt(data.volume);
                const price = parseFloat(data.price);
                baseSales = volume * price;
            }

            // Total months to predict
            const monthsAhead = month === 0 ? (year * 12) : Math.ceil(year * 12 + month);
            labels = [];
            predictedData = [];
            marketingData = [];

            // Linear growth rate per month
            let growthRate = 0.02; // 2% per month linear growth
            for (let i = 0; i < monthsAhead; i++) {
                const monthLabel = new Date().setMonth(new Date().getMonth() + i);
                labels.push(new Date(monthLabel).toLocaleString('default', { month: 'short', year: 'numeric' }));

                // Linear growth
                let predictedSales = baseSales * (1 + growthRate * (i + 1));

                // Slight random fluctuation ±2%
                predictedSales *= 1 + (Math.random() * 0.04 - 0.02);
                predictedData.push(parseFloat(predictedSales.toFixed(2)));

                // Marketing boost (linear effect)
                let marketingBoost = predictedSales;
                if (!isNaN(marketingBudget) && marketingBudget > 0) {
                    let marketingFactor = 0.1; // 10% max effect
                    marketingFactor *= timeframe === "months" ? 1 : 0.6; // adjust for timeframe
                    marketingBoost = predictedSales * (1 + marketingFactor * (marketingBudget / 10000));
                }
                marketingBoost *= 1 + (Math.random() * 0.02 - 0.01); // ±1% random
                marketingData.push(parseFloat(marketingBoost.toFixed(2)));
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
                            backgroundColor: 'rgba(0,0,255,0.1)',
                            tension: 0.3
                        },
                        {
                            label: 'Sales Based On Market Investments',
                            data: marketingData,
                            borderColor: 'orange',
                            backgroundColor: 'rgba(255,165,0,0.1)',
                            tension: 0.3
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
                                    return `${context.dataset.label}: $${context.parsed.y}`;
                                }
                            }
                        },
                        zoom: { zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }, pan: { enabled: true, mode: 'xy' } },
                        dragData: {
                            round: 2,
                            showTooltip: true,
                            onDragEnd: function (e, datasetIndex, index, value) {
                                window.salesChartInstance.data.datasets[datasetIndex].data[index] = value;
                                window.salesChartInstance.update();
                                fetch("/update-sales-data", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        labels: labels,
                                        predicted: window.salesChartInstance.data.datasets[0].data,
                                        marketing: window.salesChartInstance.data.datasets[1].data
                                    })
                                });
                            }
                        }
                    }
                }
            });
        });

        if (togglePredicted) {
            togglePredicted.addEventListener("change", function () {
                if (window.salesChartInstance) {
                    window.salesChartInstance.setDatasetVisibility(0, togglePredicted.checked);
                    window.salesChartInstance.update();
                }
            });
        }

        if (toggleMarketing) {
            toggleMarketing.addEventListener("change", function () {
                if (window.salesChartInstance) {
                    window.salesChartInstance.setDatasetVisibility(1, toggleMarketing.checked);
                    window.salesChartInstance.update();
                }
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener("click", function () {
                if (labels.length > 0) {
                    exportToCSV(labels, predictedData, marketingData);
                } else {
                    alert("No data available to export. Please run a prediction first.");
                }
            });
        }
    }

    // ============================
    // IMPROVEMENT GUIDE PAGE LOGIC
    // ============================
    const improvementCanvas = document.getElementById("improvementChart");
    if (improvementCanvas) {
        const ctx = improvementCanvas.getContext('2d');
        const previousSales = parseFloat(improvementCanvas.dataset.previous || 0);
        let predictedSales = parseFloat(improvementCanvas.dataset.predicted || 0);
        const marketingImpact = parseFloat(improvementCanvas.dataset.marketing || 0);
        const timeframe = improvementCanvas.dataset.timeframe || "";

        let chartData = [];
        if (previousSales === 0) { // New product
            chartData = [0, predictedSales, marketingImpact];
        } else { // Old product
            chartData = [previousSales, predictedSales, marketingImpact];
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Previous Sales', `Predicted Sales (${timeframe}) - if previous sales/Projected Units`, 'Marketing Budget'],
                datasets: [{ label: 'Comparison ($)', data: chartData, backgroundColor: ['blue', 'purple', 'orange'] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) { return `$${context.parsed.y}`; }
                        }
                    },
                    legend: { display: false }
                },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Amount ($)' } } }
            }
        });
    }
});