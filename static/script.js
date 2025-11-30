document.addEventListener("DOMContentLoaded", function () {
    const histogramCanvas = document.getElementById("histogramChart");
    const downloadCSVBtn = document.getElementById("downloadCSV");

    // Use window.SALES_DATA passed from HTML
    const data = window.SALES_DATA || null;
    if (!data) return;

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
        const previousSales = parseFloat(data.previous_sales || 0);
        const projectedVolume = parseFloat(data.volume || 0);
        const price = parseFloat(data.price || 0);
        const marketingBudget = parseFloat(data.marketing_budget || 0);
        const years = parseInt(data.year || 1);
        const months = parseInt(data.month || 0);
        const monthsTotal = years * 12 + months;

        const baseMonthlySales = productType === "old" ? previousSales : projectedVolume * price;

        let seasonalBoosts = {};
        if (data.product_category) {
            try {
                seasonalBoosts = JSON.parse(document.querySelector(`#product_category option[value="${data.product_category}"]`)?.dataset.boost || '{}');
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
            labels.push(labelDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            const monthSeason = getSeasonForMonth(i);
            const seasonMultiplier = seasonalBoosts[monthSeason] ? 1 + seasonalBoosts[monthSeason] / 100 : 1;

            let predictedMonthSales = baseMonthlySales * seasonMultiplier;
            predictedMonthSales *= 1 + (Math.random() * 0.1 - 0.05);

            const marketingMultiplier = 1 + (marketingBudget * 0.05) / 100;
            const marketingMonthSales = predictedMonthSales * marketingMultiplier;

            previousData.push(baseMonthlySales);
            predictedData.push(predictedMonthSales);
            marketingData.push(marketingMonthSales);
        }

        return { labels, previousData, predictedData, marketingData };
    }

    // ============================
    // Initialize Histogram Chart
    // ============================
    const { labels, previousData, predictedData, marketingData } = calculateSales(data);
    const ctx = histogramCanvas.getContext("2d");

    const histogramChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                { label: "Previous Sales", data: previousData, backgroundColor: "rgba(100,149,237,0.6)" },
                { label: "Predicted Sales", data: predictedData, backgroundColor: "rgba(60,179,113,0.6)" },
                { label: "Sales with Marketing", data: marketingData, backgroundColor: "rgba(255,99,132,0.6)" }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: $${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: "Date" } },
                y: { title: { display: true, text: "Sales ($)" }, beginAtZero: true }
            }
        }
    });

    // ============================
    // CSV Export
    // ============================
    downloadCSVBtn?.addEventListener("click", () => {
        const datasets = histogramChart.data.datasets;
        let csvContent = "Date," + datasets.map(ds => ds.label).join(",") + "\n";

        labels.forEach((label, i) => {
            const row = [label];
            datasets.forEach(ds => row.push(ds.data[i]));
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sales_histogram.csv";
        link.click();
    });

});