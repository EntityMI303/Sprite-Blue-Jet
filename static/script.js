document.addEventListener("DOMContentLoaded", function () {
    const salesCanvas = document.getElementById("salesChart");
    const histogramCanvas = document.getElementById("histogramChart");
    const downloadCSVBtn = document.getElementById("downloadCSV");
    const salesForm = document.getElementById("salesForm");

    const pageType = document.body.dataset.page;

    // ============================
    // Helper: Get season for month
    // ============================
    function getSeasonForMonth(monthIndex) {
        const month = (monthIndex % 12) + 1;
        if ([12, 1, 2].includes(month)) return "winter";
        if ([3, 4, 5].includes(month)) return "spring";
        if ([6, 7, 8].includes(month)) return "summer";
        if ([9, 10, 11].includes(month)) return "fall";
        return "all_seasons";
    }

    // ============================
    // Calculate sales
    // ============================
    function calculateSales(data) {
        const productType = data.product_type;
        const price = parseFloat(data.price || 0);
        const marketingBudget = parseFloat(data.marketing_budget || 0);
        const timeframe = data.marketing_timeframe || "months";
        const years = parseInt(data.year || 1);
        const months = parseInt(data.month || 0);
        const monthsTotal = years * 12 + months;

        let baseMonthlySales;
        if (productType === "old") {
            baseMonthlySales = parseFloat(data.previous_sales || 0);
        } else {
            baseMonthlySales = parseFloat(data.volume || 0) * price;
        }

        // Load seasonal boosts
        let seasonalBoosts = {};
        if (data.product_category) {
            try {
                seasonalBoosts = JSON.parse(
                    document.querySelector(
                        `#product_category option[value="${data.product_category}"]`
                    )?.dataset.boost || "{}"
                );
            } catch (e) {
                seasonalBoosts = {};
            }
        }

        const labels = [];
        const previousData = [];
        const predictedData = [];
        const marketingData = [];

        const today = new Date();

        for (let i = 0; i < monthsTotal; i++) {
            const labelDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            labels.push(
                labelDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
            );

            const monthSeason = getSeasonForMonth(i);
            const seasonMultiplier = seasonalBoosts[monthSeason] ? 1 + seasonalBoosts[monthSeason] / 100 : 1;

            // Add random fluctuation ±5%
            let predictedMonthSales = baseMonthlySales * seasonMultiplier * (1 + (Math.random() * 0.1 - 0.05));

            // Apply marketing budget
            const effectiveBudget = timeframe === "years" ? marketingBudget / 12 : marketingBudget;
            const marketingMultiplier = 1 + effectiveBudget * 0.05 / 100;
            const marketingMonthSales = predictedMonthSales * marketingMultiplier;

            previousData.push(baseMonthlySales);
            predictedData.push(predictedMonthSales);
            marketingData.push(marketingMonthSales);
        }

        return { labels, previousData, predictedData, marketingData };
    }

    // ============================
    // SALES PAGE — LINE GRAPH
    // ============================
    if (pageType === "sales" && salesForm) {
        salesForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const formData = new FormData(salesForm);
            const data = Object.fromEntries(formData.entries());

            // Convert numeric values
            data.price = parseFloat(data.price || 0);
            data.marketing_budget = parseFloat(data.marketing_budget || 0);
            data.year = parseInt(data.year || 1);
            data.month = parseInt(data.month || 0);

            if (data.product_type === "old") {
                data.previous_sales = parseFloat(data.previous_sales || 0);
            } else {
                data.volume = parseInt(data.volume || 0);
            }

            const { labels, previousData, predictedData, marketingData } = calculateSales(data);

            const ctx = salesCanvas.getContext("2d");
            if (window.salesChartInstance) window.salesChartInstance.destroy();

            window.salesChartInstance = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        { label: "Previous Sales", data: previousData, borderColor: "rgba(100,149,237,1)", tension: 0.3, fill: false },
                        { label: "Predicted Sales", data: predictedData, borderColor: "rgba(60,179,113,1)", tension: 0.3, fill: false },
                        { label: "Sales with Marketing", data: marketingData, borderColor: "rgba(255,99,132,1)", tension: 0.3, fill: false }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.dataset.label}: $${context.raw.toLocaleString()}`
                            }
                        }
                    },
                    scales: {
                        x: { title: { display: true, text: "Date" } },
                        y: { title: { display: true, text: "Sales ($)" }, beginAtZero: true }
                    }
                }
            });
        });
    }

    // ============================
    // HISTOGRAM PAGE — BAR GRAPH & Feedback
    // ============================
    if (histogramCanvas) {
        const data = window.SALES_DATA;
        if (!data) return;

        const { labels, previousData, predictedData, marketingData } = calculateSales(data);

        const ctx = histogramCanvas.getContext("2d");
        if (window.histogramChartInstance) window.histogramChartInstance.destroy();

        window.histogramChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    { label: "Previous/Base", data: previousData, backgroundColor: "rgba(100,149,237,0.7)", borderRadius: 5 },
                    { label: "Predicted Sales", data: predictedData, backgroundColor: "rgba(60,179,113,0.7)", borderRadius: 5 },
                    { label: "Marketing Applied", data: marketingData, backgroundColor: "rgba(255,99,132,0.7)", borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: $${context.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: "Date" } },
                    y: { title: { display: true, text: "Sales ($)" }, beginAtZero: true }
                }
            }
        });

        // Summary feedback
        const totalPredicted = predictedData.reduce((a, b) => a + b, 0);
        const totalMarketing = marketingData.reduce((a, b) => a + b, 0);
        const feedback = document.getElementById("histogramFeedback");
        if (feedback) {
            feedback.innerHTML = `
                <p>Total predicted sales: $${Math.round(totalPredicted).toLocaleString()}</p>
                <p>Total sales with marketing: $${Math.round(totalMarketing).toLocaleString()}</p>
                <a href="index.html"><button type="button">Back to Home</button></a>
            `;
        }
    }

    // ============================
    // CSV Export
    // ============================
    downloadCSVBtn?.addEventListener("click", () => {
        let chartInstance = window.salesChartInstance || window.histogramChartInstance;
        if (!chartInstance) {
            alert("Please generate chart first.");
            return;
        }

        const datasets = chartInstance.data.datasets;
        const labels = chartInstance.data.labels;

        let csvContent = "Date," + datasets.map(ds => ds.label).join(",") + "\n";
        labels.forEach((label, i) => {
            const row = [label];
            datasets.forEach(ds => row.push(ds.data[i]));
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sales_data.csv";
        link.click();
    });
});