document.addEventListener("DOMContentLoaded", function () {
    const histogramCanvas = document.getElementById("histogramChart");
    const downloadCSVBtn = document.getElementById("downloadCSV");
    const form = document.getElementById("salesForm");
    const productType = document.getElementById("product_type");
    const previousSalesBlock = document.getElementById("previousSalesBlock");
    const volumeBlock = document.getElementById("volumeBlock");

    // Hide chart until prediction is triggered
    if (histogramCanvas) {
        histogramCanvas.style.display = "none";
    }

    // ============================
    // Toggle product blocks
    // ============================
    function toggleBlocks() {
        if (productType.value === "old") {
            previousSalesBlock.style.display = "block";
            volumeBlock.style.display = "none";
        } else {
            previousSalesBlock.style.display = "none";
            volumeBlock.style.display = "block";
        }
    }
    productType.addEventListener("change", toggleBlocks);
    toggleBlocks(); // run once on load

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
    // Seasonal Boosts (data-driven)
    // ============================
    function seasonalBoosts(category, season) {
        let boosts = {};
        try {
            const option = document.querySelector(`#product_category option[value="${category}"]`);
            if (option && option.dataset.boost) {
                boosts = JSON.parse(option.dataset.boost);
            }
        } catch (e) {
            boosts = {};
        }
        return boosts[season] ? 1 + boosts[season] / 100 : 1;
    }

    // ============================
    // Calculate sales
    // ============================
    function calculateSales(formData) {
        const productType = formData.get("product_type");
        const previousSales = parseFloat(formData.get("previous_sales") || 0);
        const projectedVolume = parseFloat(formData.get("volume") || 0);
        const price = parseFloat(formData.get("price") || 0);
        const marketingBudget = parseFloat(formData.get("marketing_budget") || 0);
        const years = parseInt(formData.get("year") || 1);
        const months = parseInt(formData.get("month") || 0);
        const monthsTotal = years * 12 + months;
        const category = formData.get("product_category");

        const baseMonthlySales = productType === "old" ? previousSales : projectedVolume * price;

        const labels = [];
        const previousData = [];
        const predictedData = [];
        const marketingData = [];
        const today = new Date();

        for (let i = 0; i < monthsTotal; i++) {
            const labelDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            labels.push(labelDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            const monthSeason = getSeasonForMonth(i);
            const seasonMultiplier = seasonalBoosts(category, monthSeason);

            let predictedMonthSales = baseMonthlySales * seasonMultiplier;
            predictedMonthSales *= 1 + (Math.random() * 0.1 - 0.05); // +/-5% noise

            const marketingMultiplier = 1 + (marketingBudget * 0.05) / 100;
            const marketingMonthSales = predictedMonthSales * marketingMultiplier;

            previousData.push(baseMonthlySales);
            predictedData.push(predictedMonthSales);
            marketingData.push(marketingMonthSales);
        }

        return { labels, previousData, predictedData, marketingData };
    }

    // ============================
    // Build chart only on Predict button click
    // ============================
    form?.addEventListener("submit", function (e) {
        e.preventDefault();

        // Show chart canvas
        histogramCanvas.style.display = "block";

        const formData = new FormData(form);
        const { labels, previousData, predictedData, marketingData } = calculateSales(formData);
        const ctx = histogramCanvas.getContext("2d");

        // Destroy old chart if exists
        if (window.histogramChartInstance) {
            window.histogramChartInstance.destroy();
        }

        window.histogramChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Previous Sales",
                        data: previousData,
                        backgroundColor: "rgba(100,149,237,0.6)",
                        hoverBackgroundColor: "rgba(100,149,237,1)",
                        borderRadius: 4
                    },
                    {
                        label: "Predicted Sales",
                        data: predictedData,
                        backgroundColor: "rgba(60,179,113,0.6)",
                        hoverBackgroundColor: "rgba(60,179,113,1)",
                        borderRadius: 4
                    },
                    {
                        label: "Sales with Marketing",
                        data: marketingData,
                        backgroundColor: "rgba(255,99,132,0.6)",
                        hoverBackgroundColor: "rgba(255,99,132,1)",
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: true
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: $${context.raw.toLocaleString()}`;
                            }
                        }
                    },
                    legend: {
                        position: "bottom",
                        labels: {
                            boxWidth: 20,
                            padding: 15
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: "Date" } },
                    y: { title: { display: true, text: "Sales ($)" }, beginAtZero: true }
                },
                hover: {
                    mode: "dataset",
                    animationDuration: 400
                }
            }
        });

        // ============================
        // Add legend note below chart
        // ============================
        let legendNote = document.getElementById("chartLegendNote");
        if (!legendNote) {
            legendNote = document.createElement("p");
            legendNote.id = "chartLegendNote";
            legendNote.style.marginTop = "10px";
            legendNote.style.fontSize = "0.9em";
            legendNote.style.color = "#555";
            histogramCanvas.parentNode.appendChild(legendNote);
        }
        legendNote.innerHTML = "Legend: <span style='color:cornflowerblue;'>■ Previous Sales</span> | <span style='color:mediumseagreen;'>■ Predicted Sales</span> | <span style='color:tomato;'>■ Sales with Marketing</span>";
    });

    // ============================
    // CSV Export
    // ============================
    downloadCSVBtn?.addEventListener("click", () => {
        if (!window.histogramChartInstance) {
            alert("Please run a prediction first to generate data.");
            return;
        }

        const datasets = window.histogramChartInstance.data.datasets;
        const labels = window.histogramChartInstance.data.labels;
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