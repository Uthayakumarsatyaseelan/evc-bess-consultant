window.onload = function() {
    document.getElementById('processBtn').addEventListener('click', processFile);
};

function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        let data = e.target.result;
        let workbook;
        try {
            if (file.name.endsWith('.csv')) {
                const text = data;
                const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
                const header = rows[0].split(',');
                const jsonData = rows.slice(1).map(r => {
                    const vals = r.split(',');
                    const obj = {};
                    header.forEach((h, i) => obj[h.trim()] = vals[i].trim());
                    return obj;
                });
                computeBESS(jsonData);
            } else {
                workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
                computeBESS(jsonData);
            }
        } catch (err) {
            console.error("Error reading file:", err);
            alert("Failed to parse the file. Please ensure it is a valid Excel (.xlsx/.xls) or CSV file with columns Date, Time, Power_kW");
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

function validateData(data) {
    if (!data || data.length === 0) return false;
    const required = ['Date', 'Time', 'Power_kW'];
    return required.every(col => data[0].hasOwnProperty(col));
}

function computeBESS(data) {
    if (!validateData(data)) {
        alert("The file must contain columns named exactly: Date, Time, Power_kW");
        return;
    }

    // Group the data by Date, and convert Time to hours
    const groupedData = groupDataByDate(data);

    // Plot load profile graph for each day
    plotLoadProfile(groupedData);
}

function groupDataByDate(data) {
    const grouped = {};
    data.forEach(row => {
        const date = row.Date;
        const time = row.Time;
        const power = parseFloat(row.Power_kW);

        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push({ time, power });
    });
    return grouped;
}

function plotLoadProfile(groupedData) {
    const ctx = document.getElementById('loadProfileChart').getContext('2d');

    const labels = [];
    const datasets = [];
    const peakStart = 14; // 2 PM
    const peakEnd = 22; // 10 PM

    for (const date in groupedData) {
        const timeArr = groupedData[date].map(item => item.time);
        const powerArr = groupedData[date].map(item => item.power);

        // Format time labels for the x-axis (ensure it's time of day, e.g., HH:mm)
        const formattedTimeLabels = timeArr.map(time => {
            const [hour, minute] = time.split(':');
            return `${hour}:${minute}`;
        });

        // Create a dataset for each day
        datasets.push({
            label: date,
            data: powerArr,
            borderColor: '#FF6600',
            borderWidth: 2,
            fill: false,
        });

        // Add labels for time on x-axis (formatted time)
        labels.push(...formattedTimeLabels);
    }

    // Highlight peak hours region (2 PM to 10 PM)
    const backgroundColor = Array(labels.length).fill('rgba(255, 182, 193, 0.3)');
    for (let hour = peakStart; hour < peakEnd; hour++) {
        const startIdx = labels.findIndex(label => label.startsWith(`${hour}:`));
        if (startIdx !== -1) {
            backgroundColor[startIdx] = 'rgba(255, 0, 0, 0.3)';
        }
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        maxRotation: 90,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Power (kW)'
                    }
                }
            },
            plugins: {
                annotation: {
                    annotations: [{
                        type: 'box',
                        yMin: 0,
                        yMax: Math.max(...groupedData[Object.keys(groupedData)[0]].map(item => item.power)),
                        xMin: peakStart,
                        xMax: peakEnd,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 0, 0, 0.3)',
                        borderWidth: 1
                    }]
                }
            }
        }
    });
}
