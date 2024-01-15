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

function validateConfig() {
    const allIds = [];
    for(const user of server.cfg.users) {
        if(allIds.includes(user.id.toLowerCase()) || allIds.some((id) => user.aliases.includes(id.toLowerCase()))) {
            console.log(`[ERROR] Duplicate ID or alias in user ${user.id.toLowerCase()}!`);
            return false;
        }
        allIds.push(user.id.toLowerCase(), ...user.aliases.map((a) => a.toLowerCase()));
    }
    for(const group of server.cfg.groups) {
        if(allIds.includes(group.id.toLowerCase()) || allIds.some((id) => group.aliases.includes(id.toLowerCase()))) {
            console.log(`[ERROR] Duplicate ID or alias in group ${group.id.toLowerCase()}!`);
            return false;
        }
        allIds.push(group.id.toLowerCase(), ...group.aliases.map((a) => a.toLowerCase()));

        const users = [];
        for(const user of group.users) {
            const data = server.cfg.users.find((u) => u.id.toLowerCase() == user.id.toLowerCase() || u.aliases.includes(user.id.toLowerCase()));
            if(!data) {
                console.log(`[ERROR] Unknown user ID or alias "${user.id.toLowerCase()}" in group ${group.id.toLowerCase()}!`);
                return false;
            }
            if(users.some((u) => u.id.toLowerCase() == data.id.toLowerCase() || data.aliases.includes(u.id.toLowerCase()))) {
                console.log(`[ERROR] Duplicate user ID or alias in ${group.id.toLowerCase()}: ${user.id.toLowerCase()}!`);
                return false;
            }
            users.push(data);
        }
    }

    return true;
}

server.app = http.createServer(app).listen(server.cfg.port, () => {
    console.log(`Server listening on port ${server.cfg.port}`);
    if(!validateConfig()) process.exit(1);
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

app.route(`/:id`)
.get((req, res) => {
    if(server.ratelimiter.ratelimitResponse(req, res)) return;
    const id = req.params.id.toLowerCase();
    const user = server.cfg.users.find((u) => u.id.toLowerCase() == id || u.aliases.includes(id));
    const group = server.cfg.groups.find((g) => g.id.toLowerCase() == id || g.aliases.includes(id));

    if((!user || user.private) && (!group || group.private)) return res.status(404).send({ message: `404: User or group not found!` });
    if(user) {
        res.send({
            id: user.id,
            aliases: user.aliases,
            auth: {
                active: user.auth.active
            },
            type: `user`
        });
    } else {
        res.send({
            id: group.id,
            aliases: group.aliases,
            size: group.users.length,
            users: group.users.map((u) => u.private ? `<hidden>` : u.id),
            auth: {
                active: group.auth.active
            },
            type: `group`
        });
    }
})
.post((req, res) => {
    if(server.ratelimiter.ratelimitResponse(req, res)) return;
    const id = req.params.id.toLowerCase();
    const user = server.cfg.users.find((u) => u.id.toLowerCase() == id || u.aliases.includes(id));
    const group = server.cfg.groups.find((g) => g.id.toLowerCase() == id || g.aliases.includes(id));
    const message = req.body.message;

    if(!user && !group) return res.status(404).send({ message: `404: User or group not found!` });
    if(!message) return res.status(400).send({ message: `400: No message provided!` });
    if(user) {
        if(user.auth.active && user.auth.key != req.headers.authorization) return res.status(403).send({ message: `403: You need to enter the key to send messages to this user!` });
        server.bot.sendMessage(user.conversation, message);
        res.send({ message: `Message successfully sent to ${user.id}!` });
    } else {
        if(group.auth.active && group.auth.key != req.headers.authorization) return res.status(403).send({ message: `403: You need to enter the key to send messages to this group!` });
        group.users.forEach((user) => {
            const { conversation } = server.cfg.users.find((u) => u.id == user.id || u.aliases.includes(user.id));
            server.bot.sendMessage(conversation, message);
        });
        res.send({ message: `Message successfully sent to ${group.users.length} users!` });
    }
});

app.use((req, res, next) => {
    res.status(404).send({ message: `404: Not found` });
});