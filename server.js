const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Pasta pública 

const SECRET_KEY = "ufsc_web_key";
let users = []; // { email, senha, nome, sensores: [] } 

// --- Middleware de Autenticação ---
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Rotas do Cliente ---
app.post('/register', (req, res) => {
    const { email, nome, senha } = req.body; 
    //Validação de campos obrigatórios
    if (!email || !nome || !senha) {
        return res.status(400).send("Todos os campos são obrigatórios");
    }
    
    // verifica se ja existe um usuario com o mesmo email
    const usuarioExistente = users.find(u => u.email === email);
    
    if (usuarioExistente) {
        return res.status(400).send("Email já cadastrado");
    }
    
    //se o email for unico, o usuario é criado e adicionado a lista de usuarios
    users.push({ email, nome, senha, sensores: [] });
    res.status(201).send("Usuário cadastrado");
    
});

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const user = users.find(u => u.email === email && u.senha === senha);
    if (user) {
        const token = jwt.sign({ email: user.email }, SECRET_KEY);
        res.json({ token, nome:user.nome }); // Retorna token e nome para exibição
    } else {
        res.status(401).send("Email ou senha estão incorretos");
    }
});

app.get('/devices', authenticateToken, (req, res) => {
    const user = users.find(u => u.email === req.user.email);
    
    // Se o servidor reiniciou ou o usuário sumiu da memória
    if (!user) {
        return res.status(404).send("Usuário não encontrado. Por favor, faça login novamente.");
    }
    
    res.json(user.sensores);
});

app.post('/devices', authenticateToken, (req, res) => {
    const user = users.find(u => u.email === req.user.email);
    const { apelido, unidade } = req.body;
    const newDevice = {
        deviceID: crypto.randomBytes(4).toString('hex'), // 
        devicePWD: crypto.randomBytes(4).toString('hex'), // 
        apelido,
        unidade,
        valor: null // 
    };
    user.sensores.push(newDevice);
    res.status(201).json(newDevice);
});

app.put('/devices/:id', authenticateToken, (req, res) => {
    const user = users.find(u => u.email === req.user.email);
    const sensor = user.sensores.find(s => s.deviceID === req.params.id);
    if (sensor) sensor.apelido = req.body.apelido; 
    res.send("Apelido atualizado");
});

app.delete('/devices/:id', authenticateToken, (req, res) => {
    const user = users.find(u => u.email === req.user.email);
    user.sensores = user.sensores.filter(s => s.deviceID !== req.params.id); 
    res.send("Removido");
});

// --- Rota para o Dispositivo Sensor ---
app.post('/sensor/data', (req, res) => {
    const { deviceID, devicePWD, valor } = req.body; // 
    for (let u of users) {
        let s = u.sensores.find(s => s.deviceID === deviceID && s.devicePWD === devicePWD);
        if (s) {
            s.valor = valor; 
            return res.send("Dados recebidos");
        }
    }
    res.status(401).send("Falha na autenticação do sensor");
});

const port = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`));
}

module.exports = app;