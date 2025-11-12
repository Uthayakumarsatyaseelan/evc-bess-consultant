let loadProfileData = []; // This will store the data from the uploaded Excel file

// Handle file upload and parse the Excel or CSV file
function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const data = e.target.result;

        // Determine the file type (Excel or CSV)
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            // Parse the data into a JSON array
            loadProfileData = XLSX.utils.sheet_to_json(sheet);
        } else if (file.name.endsWith('.csv')) {
            const textData = data.split('\n').map(line => line.split(','));

            // Parse CSV into an array of objects
            loadProfileData = textData.slice(1).map(row => ({
                Date: row[0],
                Time: row[1],
                Power_kW: parseFloat(row[2])
            }));
        }

        if (!validateData(loadProfileData)) {
            alert("The uploaded file must contain 'Date', 'Time', and 'Power_kW' columns.");
            return;
        }

        // Perform the computation and display results
        computeBESS();
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

// Validate the uploaded data structure
function validateData(data) {
    return data.every(row => row.Date && row.Time && row.Power_kW);
}

// Perform BESS calculation based on the loaded data
function computeBESS() {
    // Preprocess the data (similar to MATLAB code)
    const dateTimeData = loadProfileData.map(row => new Date(row.Date + ' ' + row.Time));
    const powerData = loadProfileData.map(row => row.Power_kW);

    const uniqueDays = getUniqueDays(dateTimeData);

    // Plot Load Profile Graph
    plotLoadProfile(dateTimeData, powerData);

    // Calculate daily peaks
    const dailyPeaks = calculateDailyPeaks(uniqueDays, dateTimeData, powerData);
    const worstDayIdx = dailyPeaks.indexOf(Math.max(...dailyPeaks));

    // Display Results Table
    displayResultsTable(dailyPeaks, worstDayIdx);
}

// Get unique days from the DateTime data
function getUniqueDays(dateTimeData) {
    const uniqueDays = [...new Set(dateTimeData.map(date => date.toLocaleDateString()))];
    return uniqueDays;
}

// Calculate daily peaks
function calculateDailyPeaks(uniqueDays, dateTimeData, powerData) {
    const dailyPeaks = [];
    uniqueDays.forEach(day => {
        const dayData = dateTimeData.filter((date, idx) => date.toLocaleDateString() === day);
        const dayPower = powerData.slice(0, dayData.length);
        const peak = Math.max(...dayPower);
        dailyPeaks.push(peak);
    });
    return dailyPeaks;
}

// Plot Load Profile Graph using Chart.js
function plotLoadProfile(dateTimeData, powerData) {
    const ctx = document.getElementById('loadProfileChart').getContext('2d');
    const labels = dateTimeData.map(date => date.toLocaleTimeString());
    const data = {
        labels: labels,
        datasets: [{
            label: 'Load Profile (kW)',
            data: powerData,
            borderColor: '#FF6600',
            borderWidth: 2,
            fill: false
        }]
    };
    const config = {
        type: 'line',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    };
    new Chart(ctx, config);
}

// Display BESS Sizing Results
function displayResultsTable(dailyPeaks, worstDayIdx) {
    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

    const units = 5;
    for (let nUnits = 1; nUnits <= units; nUnits++) {
        const threshold = 150 * nUnits;
        const peakReduction = 100 * nUnits;
        const energyShaved = peakReduction * 0.5;
        const paybackPeriod = (nUnits * 180000) / (peakReduction * 12);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${nUnits}</td>
            <td>${threshold.toFixed(2)}</td>
            <td>${peakReduction.toFixed(2)}</td>
            <td>${energyShaved.toFixed(2)}</td>
            <td>${paybackPeriod.toFixed(2)}</td>
        `;
        resultsBody.appendChild(row);
    }
}
