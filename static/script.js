document.addEventListener("DOMContentLoaded", function () {
    // ============================
    // Elements
    // ============================
    const productTypeSelect = document.getElementById("product_type");
    const previousSalesBlock = document.getElementById("previousSalesBlock");
    const volumeBlock = document.getElementById("volumeBlock");

    const productCategory = document.getElementById("product_category");
    const marketingBudgetInput = document.getElementById("marketing_budget");
    const marketingTimeframe = document.getElementById("marketing_timeframe");
    const priceInput = document.getElementById("price");
    const yearInput = document.getElementById("year");
    const monthInput = document.getElementById("month");

    const togglePredictedCheckbox = document.getElementById("togglePredicted");
    const toggleMarketingCheckbox = document.getElementById("toggleMarketing");
    const downloadCSVBtn = document.getElementById("downloadCSV");

    const salesChartCanvas = document.getElementById("salesChart");
    if (!salesChartCanvas) return; // Exit if no chart exists
    const salesChartCtx = salesChartCanvas.getContext("2d");

    // ============================
    // Toggle input fields
    // ============================
    function toggleFields() {
        if (!productTypeSelect) return;
        if (productTypeSelect.value === "old") {
            previousSalesBlock.style.display = "block";
            volumeBlock.style.display = "none";
        } else {
            previousSalesBlock.style.display = "none";
            volumeBlock.style.display = "block";
        }
    }

    if (productTypeSelect) {
        productTypeSelect.addEventListener("change", toggleFields);
        toggleFields();
    }

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
    function calculateSales() {
        const previousSales = parseFloat(document.getElementById("previous_sales")?.value) || 0;
        const projectedVolume = parseFloat(document.getElementById("volume")?.value) || 0;
        const price = parseFloat(priceInput?.value) || 0;
        const marketingBudget = parseFloat(marketingBudgetInput?.value) || 0;
        const years = parseInt(yearInput?.value) || 1;
        const months = parseInt(monthInput?.value) || 0;
        const monthsTotal = years * 12 + months;

        const baseMonthlySales = productTypeSelect.value === "old" ? previousSales : projectedVolume * price;

        // Seasonal boosts
        let seasonalBoosts = {};
        const selectedCategoryOption = productCategory?.options[productCategory.selectedIndex];
        if (selectedCategoryOption?.dataset.boost) {
            try { seasonalBoosts = JSON.parse(selectedCategoryOption.dataset.boost); }
            catch (e) { seasonalBoosts = {}; }
        }

        const predictedData = [];
        const marketingData = [];

        for (let i = 0; i < monthsTotal; i++) {
            const monthSeason = getSeasonForMonth(i);
            const seasonMultiplier = seasonalBoosts[monthSeason] ? 1 + seasonalBoosts[monthSeason] / 100 : 1;

            let marketingMultiplier = 1 + (marketingBudget * 0.05) / 100;
            if (marketingTimeframe?.value === "years") marketingMultiplier = 1 + (marketingBudget * 0.05 * 12) / 100;

            const predictedMonthSales = baseMonthlySales * seasonMultiplier;
            const marketingMonthSales = predictedMonthSales * marketingMultiplier;

            predictedData.push(predictedMonthSales);
            marketingData.push(marketingMonthSales);
        }

        return { months: monthsTotal, predictedData, marketingData };
    }

    // ============================
    // Initialize empty Chart.js chart
    // ============================
    const salesChart = new Chart(salesChartCtx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Predicted Sales",
                    data: [],
                    borderColor: "rgba(75, 192, 192, 1)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    fill: true,
                    hidden: !(togglePredictedCheckbox?.checked ?? true)
                },
                {
                    label: "Sales with Marketing",
                    data: [],
                    borderColor: "rgba(255, 99, 132, 1)",
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    fill: true,
                    hidden: !(toggleMarketingCheckbox?.checked ?? true)
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                zoom: {
                    pan: { enabled: true, mode: "x" },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }
                },
                dragData: {
                    round: 2,
                    onDragEnd: () => console.log("Data changed")
                }
            },
            scales: {
                x: { title: { display: true, text: "Months" } },
                y: { title: { display: true, text: "Sales ($)" }, beginAtZero: true }
            }
        }
    });

    // ============================
    // Update chart (after clicking Predict)
    // ============================
    function updateChart() {
        const salesData = calculateSales();
        const labels = Array.from({ length: salesData.months }, (_, i) => "Month " + (i + 1));

        salesChart.data.labels = labels;
        salesChart.data.datasets[0].data = salesData.predictedData;
        salesChart.data.datasets[0].hidden = !(togglePredictedCheckbox?.checked ?? true);
        salesChart.data.datasets[1].data = salesData.marketingData;
        salesChart.data.datasets[1].hidden = !(toggleMarketingCheckbox?.checked ?? true);
        salesChart.update();
    }

    // ============================
    // Event listeners
    // ============================
    // Only generate chart on form submission
    const salesForm = document.querySelector("form");
    salesForm?.addEventListener("submit", function (e) {
        e.preventDefault(); // prevent actual form submission
        updateChart();
    });

    togglePredictedCheckbox?.addEventListener("change", () => {
        if (salesChart.data.labels.length > 0) salesChart.update();
    });
    toggleMarketingCheckbox?.addEventListener("change", () => {
        if (salesChart.data.labels.length > 0) salesChart.update();
    });

    // ============================
    // CSV Export
    // ============================
    downloadCSVBtn?.addEventListener("click", () => {
        if (!salesChart.data.labels.length) return; // no data yet
        const labels = salesChart.data.labels;
        const predicted = salesChart.data.datasets[0].data;
        const marketing = salesChart.data.datasets[1].data;

        let csvContent = "Month,Predicted Sales,Sales with Marketing\n";
        labels.forEach((label, i) => {
            csvContent += `${label},${predicted[i]},${marketing[i]}\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sales_prediction.csv";
        link.click();
    });
});