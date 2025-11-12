// Sample Load Profile Data (Replace with dynamic loading of CSV)
let loadProfileData = [
    { time: '00:00', power: 20 },
    { time: '01:00', power: 25 },
    { time: '02:00', power: 30 },
    { time: '03:00', power: 40 },
    // Add more data as per your dataset
];

// Function to simulate the BESS sizing calculation
function runBESSCalculation() {
    let units = 5;
    let results = [];
    for (let nUnits = 1; nUnits <= units; nUnits++) {
        let threshold = 150 * nUnits; // Example calculation
        let peakReduction = 100 * nUnits; // Example calculation
        let energyShaved = peakReduction * 0.5; // Example calculation
        let paybackPeriod = (nUnits * 180000) / (peakReduction * 12); // Example calculation

        results.push({
            units: nUnits,
            threshold: threshold,
            peakReduction: peakReduction,
            energyShaved: energyShaved,
            paybackPeriod: paybackPeriod
        });
    }

    populateResultsTable(results);
}

// Function to populate results table
function populateResultsTable(results) {
    let resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = ''; // Clear existing results
    results.forEach(result => {
        let row = document.createElement('tr');
        row.innerHTML = `
            <td>${result.units}</td>
            <td>${result.threshold.toFixed(2)}</td>
            <td>${result.peakReduction.toFixed(2)}</td>
            <td>${result.energyShaved.toFixed(2)}</td>
            <td>${result.paybackPeriod.toFixed(2)}</td>
        `;
        resultsBody.appendChild(row);
    });
}

// Function to plot Load Profile Chart
function plotLoadProfile() {
    let ctx = document.getElementById('loadProfileChart').getContext('2d');
    let labels = loadProfileData.map(data => data.time);
    let data = loadProfileData.map(data => data.power);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Load Profile (kW)',
                data: data,
                borderColor: '#FF6600',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Call the function to plot Load Profile Chart on page load
plotLoadProfile();
