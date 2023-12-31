const express = require(`express`);
const http = require(`http`);
const parser = require(`body-parser`);
const moment = require(`moment`);
const TelegramAPI = require(`node-telegram-bot-api`);
const Ratelimiter = require(`./Ratelimiter`);
const app = express();
app.disable(`x-powered-by`);
app.set(`trust proxy`, true);
app.use(parser.json());

global.server = {};
server.cfg = require(`./config.json`);
server.ratelimiter = new Ratelimiter();
server.bot = new TelegramAPI(server.cfg.token, { polling: true });

server.app = http.createServer(app).listen(server.cfg.port, () => {
    console.log(`Server listening on port ${server.cfg.port}`);
});

app.use((req, res, next) => {
    const time = moment(new Date()).format(server.cfg.timeFormat);
    const ip = server.cfg.logIPs ? req.ip : `XXXXXX`;

    console.log(`[${time}] ${ip} sent ${req.method} request to ${req.path.toLowerCase()} with ${req.body.message ? `message: ${req.body.message}` : `no message`}`);
    next();
});

app.get(`/ping`, (req, res) => {
    res.send({ message: `Pong!`, version: require(`./package.json`).version });
})

app.post(`/refresh`, (req, res) => {
    if(server.cfg.adminToken?.trim() != `` && server.cfg.adminToken != req.headers.authorization) return res.status(403).send({ message: `403: You're not allowed to access this route!` });
    delete require.cache[require.resolve('./config.json')];
    server.cfg = require(`./config.json`);
    res.send({ message: `Config reloaded!` });
});

app.route(`/:user`)
.get((req, res) => {
    if(server.ratelimiter.ratelimitResponse(req, res)) return;
    const username = req.params.user.toLowerCase();
    const user = server.cfg.users.find((u) => u.id == username || u.aliases.includes(username));

    if(!user || user.private) return res.status(404).send({ message: `404: User not found!` });
    res.send({
        id: user.id,
        aliases: user.aliases,
        auth: {
            active: user.auth.active
        }
    });
})
.post((req, res) => {
    if(server.ratelimiter.ratelimitResponse(req, res)) return;
    const username = req.params.user.toLowerCase();
    const user = server.cfg.users.find((u) => u.id == username || u.aliases.includes(username));
    const message = req.body.message;

    if(!user) return res.status(404).send({ message: `404: User not found!` });
    if(user.auth.active && user.auth.key != req.headers.authorization) return res.status(403).send({ message: `403: You need to enter the key to send messages to this user!` });
    if(!message) return res.status(400).send({ message: `400: No message provided!` });
    server.bot.sendMessage(user.conversation, message);
    res.send({ message: `Message successfully sent to ${user.id}!` });
});

app.use((req, res, next) => {
    res.status(404).send({ message: `404: Not found` });
});