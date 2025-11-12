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
                // parse CSV manually
                const text = data;
                const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
                const header = rows[0].split(',');
                const jsonData = rows.slice(1).map(r => {
                    const vals = r.split(',');
                    const obj = {};
                    header.forEach((h,i) => obj[h.trim()] = vals[i].trim());
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
    const required = ['Date','Time','Power_kW'];
    return required.every(col => data[0].hasOwnProperty(col));
}

function computeBESS(data) {
    if (!validateData(data)) {
        alert("The file must contain columns named exactly: Date, Time, Power_kW");
        return;
    }

    // parse DateTime and Power arrays
    const dateTimeArr = data.map(r => new Date(r.Date + ' ' + r.Time));
    const powerArr = data.map(r => parseFloat(r.Power_kW));

    // Plot load profile
    plotLoadProfile(dateTimeArr, powerArr);

    // Compute unique days
    const dayMap = {};
    dateTimeArr.forEach((dt, idx) => {
        const dayString = dt.toDateString();
        if (!dayMap[dayString]) {
            dayMap[dayString] = [];
        }
        dayMap[dayString].push(powerArr[idx]);
    });

    const dailyPeaks = [];
    for (const day in dayMap) {
        const pArr = dayMap[day];
        const peak = Math.max(...pArr);
        dailyPeaks.push(peak);
    }

    const P_max = Math.max(...powerArr);

    // BESS specs
    const bessPowerPerUnit_kW = 125;
    const bessEnergyPerUnit_kWh = 261;
    const costPerUnit_RM = 180000;
    const demandChargeRate_RMpkWperMonth = 97.06;
    const maxDepthOfDischarge = 0.85;
    const powerMargin = 0;

    const units = 5;
    const thresholds = [];
    const peakReductions = [];
    const energyShaved = [];
    const annualSavings = [];
    const paybackYears = [];

    for (let nUnits = 1; nUnits <= units; nUnits++) {
        // Note: For simplicity we use a placeholder threshold method
        const threshold = P_max * (1 - 0.1 * nUnits);
        thresholds.push(threshold);
        const reduction = P_max - threshold;
        peakReductions.push(reduction);
        const shavedEnergy = reduction * 0.25 * 24; // simplistic
        energyShaved.push(shavedEnergy);
        const annualSave = reduction * demandChargeRate_RMpkWperMonth * 12;
        annualSavings.push(annualSave);
        const payback = (nUnits * costPerUnit_RM) / annualSave;
        paybackYears.push(payback);
    }

    // Populate results UI
    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';
    for (let i = 0; i < units; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i+1}</td>
            <td>${thresholds[i].toFixed(2)}</td>
            <td>${peakReductions[i].toFixed(2)}</td>
            <td>${energyShaved[i].toFixed(2)}</td>
            <td>${paybackYears[i].toFixed(2)}</td>
        `;
        resultsBody.appendChild(row);
    }
}

function plotLoadProfile(dateTimeArr, powerArr) {
    const ctx = document.getElementById('loadProfileChart').getContext('2d');
    const labels = dateTimeArr.map(dt => dt.toLocaleTimeString());
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Power (kW)',
                data: powerArr,
                borderColor: '#FF6600',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
