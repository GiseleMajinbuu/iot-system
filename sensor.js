// Execução: node sensor.js <DeviceID> <DevicePWD> <BaseURL>
const deviceID = process.argv[2];
const devicePWD = process.argv[3];
const baseURL = process.argv[4] || 'http://localhost:3000';

if (!deviceID || !devicePWD) {
    console.log("Uso: node sensor.js <DeviceID> <DevicePWD> <BaseURL>");
    process.exit(1);
}

async function sendData() {
    const valorSimulado = (Math.random() * 100).toFixed(2);
    try {
        const response = await fetch(`${baseURL}/sensor/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceID, devicePWD, valor: valorSimulado })
        });
        console.log(`[${new Date().toLocaleTimeString()}] Valor ${valorSimulado} enviado. Status: ${response.status}`);
    } catch (err) {
        console.error("Erro ao conectar ao servidor");
    }
}

// Envia dados periodicamente 
setInterval(sendData, 5000);