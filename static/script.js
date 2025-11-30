// ============================
// Custom Market Deviation Table
// ============================
var marketDeviations = {
    amazon: { min: 0.09, max: 0.15 },
    apple: { min: 0.05, max: 0.07 },
    google: { min: 0.09, max: 0.10 },
    nvidia: { min: 0.50, max: 0.60 },
    broadcom: { min: 0.25, max: 0.30 }
};

// ============================
// Seasonal Product Sale Boosts (defaults)
// ============================
// These are fallback boosts used when product_category isn't selected.
// Values are decimals (e.g., 0.10 == 10%)
var defaultSeasonalBoosts = {
    cars: { summer: 0.12, winter: 0.08, spring: 0.03, fall: 0.02 },
    toys: { summer: 0.15, winter: 0.25, fall: 0.10, spring: 0.05 },
    clothing: { spring: 0.10, fall: 0.15, winter: 0.10, summer: 0.02 },
    electronics: { winter: 0.20, summer: 0.08, fall: 0.05 },
    food: { summer: 0.10, winter: 0.15, fall: 0.02 },
    retail: { winter: 0.10, fall: 0.05 }
};

// Infer category from product name keywords if user didn't pick a category
function inferCategoryFromProductName(productName) {
    if (!productName) return null;
    var name = productName.toLowerCase();
    if (/\b(car|truck|vehicle|sedan|coupe|convertible)\b/.test(name)) return 'cars';
    if (/\b(toy|lego|action figure|doll|playset|puzzle)\b/.test(name)) return 'toys';
    if (/\b(shirt|jeans|jacket|dress|skirt|clothing|apparel)\b/.test(name)) return 'clothing';
    if (/\b(phone|laptop|tv|camera|tablet|earbuds|console|electronics)\b/.test(name)) return 'electronics';
    if (/\b(food|snack|beverage|drink|grocery|restaurant)\b/.test(name)) return 'food';
    return null;
}

// Read seasonal boost from <option data-boost='{"summer":12,...}'> if set.
// Returns decimal (e.g., 0.12) or 0 if none.
function getSeasonalBoostFromCategorySelect(productCategorySelect, season) {
    try {
        var selectedOpt = productCategorySelect && productCategorySelect.selectedOptions && productCategorySelect.selectedOptions[0];
        if (!selectedOpt) return 0;
        var boostData = selectedOpt.getAttribute('data-boost');
        if (!boostData) return 0;
        var obj = JSON.parse(boostData);
        if (!obj) return 0;
        var seasonKey = season.toLowerCase();
        if (obj[seasonKey] !== undefined) {
            return parseFloat(obj[seasonKey]) / 100;
        }
    } catch (e) {
        // ignore parse errors, fallback later
    }
    return 0;
}

// Fallback seasonal boost lookup from defaultSeasonalBoosts using category string
function getSeasonalBoostFallback(category, season) {
    if (!category) return 0;
    var cat = category.toLowerCase();
    var s = season.toLowerCase();
    if (defaultSeasonalBoosts[cat] && defaultSeasonalBoosts[cat][s]) {
        return defaultSeasonalBoosts[cat][s];
    }
    return 0;
}

// ============================
// CSV export util
// ============================
function exportToCSV(labels, predictedData, marketingData) {
    var csvContent = "Month,Predicted Sales,Sales Based On Market Investments\n";
    for (var i = 0; i < labels.length; i++) {
        var row = [
            labels[i],
            predictedData[i] !== undefined ? predictedData[i] : "",
            marketingData[i] !== undefined ? marketingData[i] : ""
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

    // Form + UI elements
    var form = document.querySelector("form");
    var chartCanvas = document.getElementById("salesChart");
    var calendarOutput = document.getElementById("salesCalendar");

    var togglePredicted = document.getElementById("togglePredicted");
    var toggleMarketing = document.getElementById("toggleMarketing");
    var downloadBtn = document.getElementById("downloadCSV");

    var productType = document.getElementById("product_type");
    var previousSalesBlock = document.getElementById("previousSalesBlock");
    var volumeBlock = document.getElementById("volumeBlock");

    var investmentCompany = document.getElementById("investment_company");
    var productCategorySelect = document.getElementById("product_category"); // may be null if not in HTML
    var seasonSelect = document.getElementById("season");

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

    // Chart instance holder
    var labels = [];
    var predictedData = [];
    var marketingData = [];

    // Setup improvement chart if present (kept from original script)
    (function initImprovementChart() {
        var improvementCanvas = document.getElementById("improvementChart");
        if (!improvementCanvas) return;
        var ctx = improvementCanvas.getContext('2d');

        var previousSales = parseFloat(improvementCanvas.dataset.previous || 0);
        var predictedSales = parseFloat(improvementCanvas.dataset.predicted || 0);
        var marketingImpact = parseFloat(improvementCanvas.dataset.marketing || 0);
        var timeframe = improvementCanvas.dataset.timeframe || "";

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [
                    'Previous Sales',
                    'Predicted Sales (' + timeframe + ')',
                    'Sales Calculated with Marketing Investments'
                ],
                datasets: [{
                    label: 'Comparison ($)',
                    data: [previousSales, predictedSales, marketingImpact],
                    backgroundColor: ['blue', 'purple', 'orange']
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
    })();

    // Main form submission and prediction flow
    if (form && chartCanvas) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            // read form
            var formData = new FormData(form);
            var data = {};
            formData.forEach(function (v, k) { data[k] = v; });

            // Keep existing POST behavior
            try {
                await fetch("/sales", { method: "POST", body: formData });
            } catch (err) {
                // don't fail the UI if POST fails; proceed with local simulation
                console.warn("Warning: /sales POST failed or blocked:", err);
            }

            // parse inputs
            var product = (data.product || "").toString().trim();
            var season = (data.season || "all_seasons").toString().toLowerCase();
            var selectedCompany = (data.investment_company || "").toString().toLowerCase();
            var years = parseInt(data.year || "0", 10) || 0;
            var months = parseInt(data.month || "0", 10) || 0;
            var marketingBudget = parseFloat(data.marketing_budget || "0") || 0;
            var timeframe = (data.marketing_timeframe || "months").toString();

            // compute base currentSales
            var currentSales = 0;
            if (data.product_type === "old") {
                currentSales = parseFloat(data.previous_sales || "0") || 0;
            } else {
                var volume = parseInt(data.volume || "0", 10) || 0;
                var price = parseFloat(data.price || "0") || 0;
                currentSales = volume * price;
            }

            // season adjustments added into totalDays as original
            var seasonAdjustments = {
                spring: 15,
                summer: 10,
                fall: 20,
                winter: 25,
                all_seasons: 0
            };

            var totalDays = (months * 30) + (years * 365) + (seasonAdjustments[season] || 0);
            var today = new Date();
            var futureDate = new Date();
            futureDate.setDate(today.getDate() + totalDays);

            if (calendarOutput) {
                calendarOutput.innerText =
                    "Sales prediction for " + (product || "your product") +
                    " launches on " + futureDate.toDateString() +
                    " (adjusted for " + season + ").";
            }

            // monthsAhead calculation (preserve original logic)
            var monthsAhead = months === 0 ? (years * 12) : Math.ceil(totalDays / 30);
            if (monthsAhead <= 0) monthsAhead = Math.max(6, years * 12); // safe fallback

            // prepare arrays
            labels = [];
            predictedData = [];
            marketingData = [];

            // determine seasonal boost per month:
            // first try category select, else infer by product name and use defaultSeasonalBoosts
            var seasonalBoostValue = 0;
            if (productCategorySelect) {
                seasonalBoostValue = getSeasonalBoostFromCategorySelect(productCategorySelect, season);
            }
            if (seasonalBoostValue === 0) {
                // infer category from product name
                var inferred = inferCategoryFromProductName(product);
                seasonalBoostValue = getSeasonalBoostFromCategorySelect({ selectedOptions: [{ getAttribute: function () { return null; } }] }, season);
                // fallback to default table
                if (!seasonalBoostValue && inferred) seasonalBoostValue = getSeasonalBoostFallback(inferred, season);
            }

            // function to compute market investment boost (random between min/max)
            function computeMarketBoostMultiplier(companyKey) {
                if (!companyKey) return 0;
                var entry = marketDeviations[companyKey];
                if (!entry) return 0;
                var b = randomBetween(entry.min, entry.max); // decimal fraction, e.g., 0.09
                return b;
            }

            // loop months and compute series
            var runningSales = currentSales; // start with baseline
            for (var i = 0; i < monthsAhead; i++) {
                var label = new Date(today.getFullYear(), today.getMonth() + i, 1)
                    .toLocaleString('default', { month: 'short', year: 'numeric' });
                labels.push(label);

                // simulate base monthly fluctuation
                // keep some randomness but bounded for realism
                runningSales = runningSales * (0.95 + Math.random() * 0.20); // between -5% and +15% approx

                // apply seasonal boost (multiplicative)
                var seasonalApplied = seasonalBoostValue || 0;
                var afterSeasonal = runningSales * (1 + seasonalApplied);

                // predicted (no marketing/mkt investments applied)
                var predictedValue = parseFloat(afterSeasonal.toFixed(2));
                predictedData.push(predictedValue);

                // marketing budget -> translate to monthly incremental sales (simple model)
                var marketingBoostAmount = 0;
                if (marketingBudget > 0) {
                    if (timeframe === "months") {
                        // marketingBudget is already for months - apply a small percent conversion
                        // marketingEffectPct random between 1% and 5% of marketing budget turned into sales this month
                        var marketingEffectPct = (0.01 + Math.random() * 0.05);
                        marketingBoostAmount = marketingBudget * marketingEffectPct;
                    } else {
                        // timeframe years -> distribute budget across months
                        var perMonthBudget = (marketingBudget / Math.max(1, years * 12));
                        var marketingEffectPctY = (0.01 + Math.random() * 0.05);
                        marketingBoostAmount = perMonthBudget * marketingEffectPctY;
                    }
                }

                // market investment boost from selected company (percentage of afterSeasonal)
                var marketBoostAmount = 0;
                if (selectedCompany && marketDeviations[selectedCompany]) {
                    var marketPct = computeMarketBoostMultiplier(selectedCompany); // decimal like 0.09
                    marketBoostAmount = afterSeasonal * marketPct;
                }

                // Final marketing / investment adjusted sales for this month
                var finalMarketingSales = afterSeasonal + marketingBoostAmount + marketBoostAmount;
                marketingData.push(parseFloat(finalMarketingSales.toFixed(2)));
            }

            // render chart (destroy previous if exists)
            if (window.salesChartInstance) {
                try { window.salesChartInstance.destroy(); } catch (e) { /* ignore */ }
            }

            window.salesChartInstance = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Predicted Sales',
                            data: predictedData,
                            borderColor: 'rgba(54,162,235,1)',
                            backgroundColor: 'rgba(54,162,235,0.15)',
                            tension: 0.3,
                            pointRadius: 3
                        },
                        {
                            label: 'Sales Based On Market Investments',
                            data: marketingData,
                            borderColor: 'rgba(255,159,64,1)',
                            backgroundColor: 'rgba(255,159,64,0.15)',
                            tension: 0.3,
                            pointRadius: 3
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
                                    return context.dataset.label + ': $' + context.parsed.y;
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
                                // update dataset value and push to backend
                                window.salesChartInstance.data.datasets[datasetIndex].data[index] = value;
                                window.salesChartInstance.update();

                                // optional: persist updated values to server
                                try {
                                    fetch("/update-sales-data", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            labels: labels,
                                            predicted: window.salesChartInstance.data.datasets[0].data,
                                            marketing: window.salesChartInstance.data.datasets[1].data
                                        })
                                    });
                                } catch (err) {
                                    console.warn("Failed to POST updated sales data:", err);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Sales ($)' }
                        },
                        x: {
                            title: { display: true, text: 'Month' }
                        }
                    }
                }
            });

            // wire toggles if present
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

            // wire CSV download
            if (downloadBtn) {
                downloadBtn.addEventListener("click", function () {
                    if (labels.length > 0) {
                        exportToCSV(labels, predictedData, marketingData);
                    } else {
                        alert("No data available to export. Please run a prediction first.");
                    }
                }, { once: true }); // once: true avoids adding multiple handlers repeatedly
            }
        });
    } // end if form/chartCanvas

}); // end DOMContentLoaded