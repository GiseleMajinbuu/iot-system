// Limpa o token e os dados da sessão assim que a página é carregada/recarregada
window.onload = () => {
    userToken = '';
    charts = {};
    console.log("Sessão limpa. Faça login novamente.");
};

let userToken = '';
let sensorChart;
let charts = {}; // Objeto para guardar as instâncias dos gráficos: { deviceID: chartInstance }
const maxDataPoints = 10; // Quantidade de pontos visíveis no gráfico

function toggleAuth(showLogin) {
    document.getElementById('register-section').classList.toggle('hidden', showLogin);
    document.getElementById('login-section').classList.toggle('hidden', !showLogin);
}


// Função de Cadastro 
async function register() {
    const nome = document.getElementById('reg-nome').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const senha = document.getElementById('reg-senha').value.trim();

    //Impede o envio se houver campos vazios
    if (!nome || !email || !senha) {
        alert("Preencha todos os campos!");
        return;
    }

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha })
    });

    if (res.ok) {
        alert("Cadastro realizado! Agora faça o login.");
        toggleAuth(true);
    } else {
        const errorMsg = await res.text();
        alert(errorMsg); // Para exibir a mensagem de erro retornada pelo servidor (ex: email já cadastrado)
    }
}

// Função de Login 
async function login() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
    });

    if (res.ok) {
        const data = await res.json();
        userToken = data.token; // Autenticação por token
        const primeiroNome = data.nome.split(' ')[0]; // Exibe apenas o primeiro nome 
        document.getElementById('user-display').innerText = primeiroNome;
        document.getElementById('register-section').classList.add('hidden');
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        loadDevices();
        // Atualiza os dados a cada 3 segundos automaticamente
        setInterval(loadDevices, 3000);
    } else {
        alert("Falha no login.");
    }
}

// Listagem e Gerenciamento de Sensores
// Atualizar a função loadDevices para alimentar o gráfico
async function loadDevices() {
    const res = await fetch('/devices', {
        headers: { 'Authorization': userToken }
    });
    const devices = await res.json();
    const list = document.getElementById('sensor-list');
    list.innerHTML = '';

    devices.forEach(dev => {
        // 1. Atualiza a tabela (código que você já tem)
        list.innerHTML += `
            <tr>
                <td>${dev.apelido}</td>
                <td><code>${dev.deviceID}</code></td>
                <td><code>${dev.devicePWD}</code></td> <td>${dev.unidade}</td>
                <td>${dev.valor || '---'}</td>
                <td><button onclick="deleteDevice('${dev.deviceID}')">Remover</button></td>
            </tr>
        `;

        // 2. Lógica do Gráfico: Se o gráfico para este ID não existe, cria um
        if (!charts[dev.deviceID]) {
            createChartInstance(dev);
        }

        // 3. Atualiza os dados do gráfico específico se houver valor
        if (dev.valor) {
            updateSpecificChart(dev.deviceID, dev.valor);
        }
    });

    // Limpeza: Remove gráficos de sensores que foram excluídos
    cleanDeletedCharts(devices);
}

function updateSpecificChart(id, value) {
    const chart = charts[id];
    const now = new Date().toLocaleTimeString();

    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > 10) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update('none'); // 'none' desativa animações de update para performance
}

function cleanDeletedCharts(currentDevices) {
    const activeIds = currentDevices.map(d => d.deviceID);
    Object.keys(charts).forEach(id => {
        if (!activeIds.includes(id)) {
            document.getElementById(`wrapper-${id}`).remove();
            delete charts[id];
        }
    });
}

// Função para criar um novo gráfico dinamicamente
function createChartInstance(dev) {
    const container = document.getElementById('charts-container');
    
    // Cria a estrutura HTML para o gráfico individual
    const chartWrapper = document.createElement('div');
    chartWrapper.id = `wrapper-${dev.deviceID}`;
    chartWrapper.style.width = '45%'; // Faz com que caibam dois lado a lado (ajuste conforme preferir)
    chartWrapper.style.minWidth = '300px';
    chartWrapper.innerHTML = `
        <h4 style="text-align:center">${dev.apelido} (${dev.unidade})</h4>
        <canvas id="chart-${dev.deviceID}"></canvas>
    `;
    container.appendChild(chartWrapper);

    const ctx = document.getElementById(`chart-${dev.deviceID}`).getContext('2d');
    
    // Cria e armazena a instância do Chart.js
    charts[dev.deviceID] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: dev.apelido,
                data: [],
                borderColor: '#' + Math.floor(Math.random()*16777215).toString(16), // Cor aleatória para cada sensor
                tension: 0.3,
                fill: false
            }]
        },
        options: { responsive: true }
    });
}

async function addDevice() {
    const apelido = document.getElementById('dev-apelido').value;
    const unidade = document.getElementById('dev-unidade').value;

    await fetch('/devices', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': userToken 
        },
        body: JSON.stringify({ apelido, unidade })
    });
    loadDevices();
}

async function deleteDevice(id) {
    if(confirm("Deseja remover este sensor?")) {
        await fetch(`/devices/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': userToken }
        });
        loadDevices();
    }
}

function logout() {
    location.reload();
}