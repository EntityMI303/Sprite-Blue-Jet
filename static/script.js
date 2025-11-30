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
    const seasonSelect = document.getElementById("season");

    const togglePredictedCheckbox = document.getElementById("togglePredicted");
    const toggleMarketingCheckbox = document.getElementById("toggleMarketing");
    const downloadCSVBtn = document.getElementById("downloadCSV");

    const salesChartCtx = document.getElementById("salesChart").getContext("2d");

    // ============================
    // Toggle input fields
    // ============================
    function toggleFields() {
        if (productTypeSelect.value === "old") {
            previousSalesBlock.style.display = "block";
            volumeBlock.style.display = "none";
        } else {
            previousSalesBlock.style.display = "none";
            volumeBlock.style.display = "block";
        }
    }

    productTypeSelect.addEventListener("change", toggleFields);
    toggleFields(); // initialize

    // ============================
    // Helper: Get seasonal boost for a month
    // ============================
    function getSeasonForMonth(monthIndex) {
        const month = (monthIndex % 12) + 1; // 1–12
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
        let previousSales = parseFloat(document.getElementById("previous_sales").value) || 0;
        let projectedVolume = parseFloat(document.getElementById("volume").value) || 0;
        let price = parseFloat(priceInput.value) || 0;
        let marketingBudget = parseFloat(marketingBudgetInput.value) || 0;
        let years = parseInt(yearInput.value) || 1;
        let months = parseInt(monthInput.value) || 0;

        let monthsTotal = years * 12 + months;

        // Base monthly sales
        let baseMonthlySales = productTypeSelect.value === "old" ? previousSales : projectedVolume * price;

        // Seasonal boost data
        let seasonalBoosts = {};
        const selectedCategoryOption = productCategory.options[productCategory.selectedIndex];
        if (selectedCategoryOption && selectedCategoryOption.dataset.boost) {
            try {
                seasonalBoosts = JSON.parse(selectedCategoryOption.dataset.boost);
            } catch (e) {
                seasonalBoosts = {};
            }
        }

        // Calculate predicted sales per month
        let predictedData = [];
        let marketingData = [];

        for (let i = 0; i < monthsTotal; i++) {
            let monthSeason = getSeasonForMonth(i);

            // Seasonal multiplier
            let seasonMultiplier = seasonalBoosts[monthSeason] ? (1 + seasonalBoosts[monthSeason] / 100) : 1;

            // Marketing multiplier (simple proportional)
            let marketingMultiplier = 1 + (marketingBudget * 0.05) / 100;
            if (marketingTimeframe.value === "years") {
                marketingMultiplier = 1 + (marketingBudget * 0.05 * 12) / 100;
            }

            let predictedMonthSales = baseMonthlySales * seasonMultiplier;
            let marketingMonthSales = predictedMonthSales * marketingMultiplier;

            predictedData.push(predictedMonthSales);
            marketingData.push(marketingMonthSales);
        }

        return {
            months: monthsTotal,
            predictedData: predictedData,
            marketingData: marketingData
        };
    }

    // ============================
    // Chart.js Initialization
    // ============================
    let salesChart = new Chart(salesChartCtx, {
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
                    hidden: !togglePredictedCheckbox.checked
                },
                {
                    label: "Sales with Marketing",
                    data: [],
                    borderColor: "rgba(255, 99, 132, 1)",
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    fill: true,
                    hidden: !toggleMarketingCheckbox.checked
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
                    onDragEnd: function () {
                        console.log("Data changed");
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: "Months" } },
                y: { title: { display: true, text: "Sales ($)" }, beginAtZero: true }
            }
        }
    });

    // ============================
    // Update chart
    // ============================
    function updateChart() {
        const salesData = calculateSales();
        const labels = [];
        for (let i = 1; i <= salesData.months; i++) labels.push("Month " + i);

        salesChart.data.labels = labels;
        salesChart.data.datasets[0].data = salesData.predictedData;
        salesChart.data.datasets[0].hidden = !togglePredictedCheckbox.checked;
        salesChart.data.datasets[1].data = salesData.marketingData;
        salesChart.data.datasets[1].hidden = !toggleMarketingCheckbox.checked;
        salesChart.update();
    }

    // ============================
    // Event listeners
    // ============================
    togglePredictedCheckbox.addEventListener("change", updateChart);
    toggleMarketingCheckbox.addEventListener("change", updateChart);
    document.querySelector("form").addEventListener("input", updateChart);
    updateChart();

    // ============================
    // CSV Export
    // ============================
    downloadCSVBtn.addEventListener("click", function () {
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