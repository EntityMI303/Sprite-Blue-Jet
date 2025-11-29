// Utility function to convert chart data to CSV
function exportToCSV(labels, predictedData, actualData, marketingData) {
    let csvContent = "Month,Predicted Sales,Actual Sales,Marketing Impact\n";
    for (let i = 0; i < labels.length; i++) {
        const row = [
            labels[i],
            predictedData[i] || "",
            actualData[i] || "",
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
    const calendarOutput = document.getElementById("salesCalendar");

    const togglePredicted = document.getElementById("togglePredicted");
    const toggleActual = document.getElementById("toggleActual");
    const toggleMarketing = document.getElementById("toggleMarketing");
    const downloadBtn = document.getElementById("downloadCSV");

    let labels = [];
    let predictedData = [];
    let actualData = [];
    let marketingData = [];

    if (form && chartCanvas) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            await fetch("/predict-future-sales", {
                method: "POST",
                body: formData
            });

            const previous_sales = parseFloat(data.previous_sales);
            const product = data.product;
            const season = data.season;
            const year = parseInt(data.year);
            const month = parseInt(data.month);
            const marketingBudget = parseFloat(data.marketing_budget);

            const seasonAdjustments = {
                spring: 15,
                summer: 10,
                fall: 20,
                winter: 25,
                all_seasons: 0
            };

            // Only months (3,6,9) and years are considered now
            let totalDays = (month * 30) + (year * 365) + seasonAdjustments[season];
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + totalDays);

            calendarOutput.innerText =
                `Sales prediction for ${product} launches on ${futureDate.toDateString()} (adjusted for ${season}).`;

            const monthsAhead = Math.ceil(totalDays / 30);
            labels = [];
            predictedData = [];
            actualData = [];
            marketingData = [];
            let currentSales = previous_sales;

            for (let i = 0; i < monthsAhead; i++) {
                const monthLabel = new Date(today.getFullYear(), today.getMonth() + i, 1)
                    .toLocaleString('default', { month: 'short', year: 'numeric' });
                labels.push(monthLabel);

                currentSales *= (0.95 + Math.random() * 0.2);
                predictedData.push(parseFloat(currentSales.toFixed(2)));

                const actualSales = currentSales * (0.9 + Math.random() * 0.2);
                actualData.push(parseFloat(actualSales.toFixed(2)));

                const marketingBoost = marketingBudget * (0.01 + Math.random() * 0.05);
                marketingData.push(parseFloat((currentSales + marketingBoost).toFixed(2)));
            }

            if (window.salesChartInstance) {
                window.salesChartInstance.destroy();
            }

            window.salesChartInstance = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Predicted Sales',
                            data: predictedData,
                            borderColor: 'blue',
                            backgroundColor: 'blue',
                            tension: 0.3
                        },
                        {
                            label: 'Actual Sales',
                            data: actualData,
                            borderColor: 'green',
                            backgroundColor: 'green',
                            tension: 0.3
                        },
                        {
                            label: 'Marketing Impact',
                            data: marketingData,
                            borderColor: 'orange',
                            backgroundColor: 'orange',
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                label: function (context) {
                                    return `${context.dataset.label}: $${context.parsed.y}`;
                                }
                            }
                        },
                        zoom: {
                            zoom: {
                                wheel: { enabled: true },
                                pinch: { enabled: true },
                                mode: 'xy'
                            },
                            pan: {
                                enabled: true,
                                mode: 'xy'
                            }
                        },
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
                                        actual: window.salesChartInstance.data.datasets[1].data,
                                        marketing: window.salesChartInstance.data.datasets[2].data
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

        if (toggleActual) {
            toggleActual.addEventListener("change", function () {
                if (window.salesChartInstance) {
                    window.salesChartInstance.setDatasetVisibility(1, toggleActual.checked);
                    window.salesChartInstance.update();
                }
            });
        }

        if (toggleMarketing) {
            toggleMarketing.addEventListener("change", function () {
                if (window.salesChartInstance) {
                    window.salesChartInstance.setDatasetVisibility(2, toggleMarketing.checked);
                    window.salesChartInstance.update();
                }
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener("click", function () {
                if (labels.length > 0) {
                    exportToCSV(labels, predictedData, actualData, marketingData);
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
        const predictedSales = parseFloat(improvementCanvas.dataset.predicted || 0);
        const actualSales = parseFloat(improvementCanvas.dataset.actual || 0);
        const marketingImpact = parseFloat(improvementCanvas.dataset.marketing || 0);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Previous Sales', 'Predicted Sales', 'Actual Sales', 'Marketing Impact'],
                datasets: [{
                    label: 'Comparison ($)',
                    data: [previousSales, predictedSales, actualSales, marketingImpact],
                    backgroundColor: ['blue', 'purple', 'green', 'orange']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `$${context.parsed.y}`;
                            }
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount ($)' }
                    }
                }
            }
        });
    }
});