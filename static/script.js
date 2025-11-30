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
    const histogramCanvas = document.getElementById("histogramChart");

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
        const labels = [];
        const previousData = [];

        const today = new Date();

        for (let i = 0; i < monthsTotal; i++) {
            // Actual month/year label
            const labelDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            labels.push(labelDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            // Seasonal multiplier
            const monthSeason = getSeasonForMonth(i);
            const seasonMultiplier = seasonalBoosts[monthSeason] ? 1 + seasonalBoosts[monthSeason] / 100 : 1;

            // Base predicted sales
            let predictedMonthSales = baseMonthlySales * seasonMultiplier;

            // Random fluctuations ±5%
            predictedMonthSales *= 1 + (Math.random() * 0.1 - 0.05);

            // Marketing multiplier
            let marketingMultiplier = 1 + (marketingBudget * 0.05) / 100;
            if (marketingTimeframe?.value === "years") marketingMultiplier = 1 + (marketingBudget * 0.05 * 12) / 100;
            const marketingMonthSales = predictedMonthSales * marketingMultiplier;

            predictedData.push(predictedMonthSales);
            marketingData.push(marketingMonthSales);
            previousData.push(baseMonthlySales);
        }

        return { labels, predictedData, marketingData, previousData };
    }

    // ============================
    // Initialize Charts
    // ============================
    let salesChart, histogramChart;

    function initCharts() {
        if (salesChartCanvas) {
            const ctx = salesChartCanvas.getContext("2d");
            salesChart = new Chart(ctx, {
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
        }

        if (histogramCanvas) {
            const ctx = histogramCanvas.getContext("2d");
            histogramChart = new Chart(ctx, {
                type: "bar",
                data: { labels: [], datasets: [] },
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
        }
    }

    initCharts();

    // ============================
    // Update charts
    // ============================
    function updateCharts() {
        const { labels, predictedData, marketingData, previousData } = calculateSales();

        if (salesChart) {
            salesChart.data.labels = labels;
            salesChart.data.datasets[0].data = predictedData;
            salesChart.data.datasets[0].hidden = !(togglePredictedCheckbox?.checked ?? true);
            salesChart.data.datasets[1].data = marketingData;
            salesChart.data.datasets[1].hidden = !(toggleMarketingCheckbox?.checked ?? true);
            salesChart.update();
        }

        if (histogramChart) {
            histogramChart.data.labels = labels;
            histogramChart.data.datasets = [
                { label: "Previous Sales", data: previousData, backgroundColor: "rgba(100,149,237,0.6)" },
                { label: "Predicted Sales", data: predictedData, backgroundColor: "rgba(60,179,113,0.6)" },
                { label: "Sales with Marketing", data: marketingData, backgroundColor: "rgba(255,99,132,0.6)" }
            ];
            histogramChart.update();
        }
    }

    // ============================
    // Event listeners
    // ============================
    const salesForm = document.querySelector("form");
    salesForm?.addEventListener("submit", function (e) {
        e.preventDefault();
        updateCharts();
    });

    togglePredictedCheckbox?.addEventListener("change", updateCharts);
    toggleMarketingCheckbox?.addEventListener("change", updateCharts);

    // ============================
    // CSV Export
    // ============================
    downloadCSVBtn?.addEventListener("click", () => {
        if (!salesChart || !salesChart.data.labels.length) return;

        const labels = salesChart.data.labels;
        const predicted = salesChart.data.datasets[0].data;
        const marketing = salesChart.data.datasets[1].data;

        let csvContent = "Date,Predicted Sales,Sales with Marketing\n";
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