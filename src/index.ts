import config from "../config.json";
import TelegramAPI from "node-telegram-bot-api";
import Logger from "./libs/Logger";
import Elysia, { t, ValidationError } from "elysia";
import { version } from "../package.json";
import type { User } from "./types/User";
import type { Group } from "./types/Group";

const users: Map<string, User> = new Map();
const groups: Map<string, Group> = new Map();

for(const user of config.users) {
    const id = user.id.toLowerCase();
    if(id.length == 0) continue;
    users.set(id, {
        id,
        aliases: user.aliases.filter((a: string) => a.length > 0).map((a: string) => a.toLowerCase()),
        type: 'user',
        private: user.private,
        auth: user.auth,
        conversation: user.conversation,
        groups: user.groups.filter((g: string) => g.length > 0).map((g: string) => g.toLowerCase())
    })
}
for(const group of config.groups) {
    const id = group.id.toLowerCase();
    if(id.length == 0) continue;
    groups.set(id, {
        id,
        aliases: group.aliases.filter((a: string) => a.length > 0).map((a: string) => a.toLowerCase()),
        type: 'group',
        private: group.private,
        auth: group.auth,
        members: users.values().filter((user) => user.groups.includes(id)).map((user) => user.id).toArray()
    })
}

function validateConfig(): boolean {
    const allIds: string[] = [];
    for(const [id, user] of users) {
        if(allIds.includes(id) || allIds.some((id) => user.aliases.includes(id))) {
            Logger.error(`Duplicate ID or alias in user ${id}!`);
            return false;
        }
        allIds.push(id, ...user.aliases);

        for(const group of user.groups) {
            if(!groups.keys().some((g) => g == group)) {
                Logger.error(`Group ${group} not found for user ${id}!`);
                return false;
            }
        }
    }
    for(const [id, group] of groups) {
        if(allIds.includes(id) || allIds.some((id) => group.aliases.includes(id))) {
            Logger.error(`Duplicate ID or alias in group ${id}!`);
            return false;
        }
        allIds.push(id, ...group.aliases);
    }

    return true;
}

function getSendable(resolvable: string): User | Group | undefined {
    const id = resolvable.toLowerCase();
    if(users.has(id)) return users.get(id);
    if(groups.has(id)) return groups.get(id);
    for(const user of users.values()) {
        if(user.aliases.includes(id)) return user;
    }
    for(const group of groups.values()) {
        if(group.aliases.includes(id)) return group;
    }
    return undefined;
}

export const bot = new TelegramAPI(config.token, { polling: true });
new Elysia()
    .onTransform(({ request, path }) =>
        Logger.debug(`Received ${request.method} request to ${path}.`)
    )
    .onStart(() => {
        if(!validateConfig()) return process.exit(1);
        Logger.info(`Elysia listening on port ${config.port}!`);
    })
    .onError(({ code, error, set, path }) => {
        if(code == 'VALIDATION') {
            set.status = 422;
            error = error as ValidationError;
            return { error: error.message.trim() };
        } else if(code == 'NOT_FOUND') {
            set.status = 404;
            return { error: 'Not found!' };
        } else {
            set.status = 500;
            Logger.error(`An error ocurred on route ${path}: ${error}`);
            return { error: 'An unknown error occurred! Please try again later.' };
        }
    })
    .get('/ping', () => ({ message: 'Pong!', version }))
    .get('/:id', ({ params: { id }, error }) => {
        const data = getSendable(id);
    
        if(!data || data.private) return error(404, { message: 'User or group not found!' });
        if(data.type == 'user') {
            return {
                id: data.id,
                aliases: data.aliases,
                auth: {
                    active: data.auth.active
                },
                type: data.type
            };
        } else {
            return {
                id: data.id,
                aliases: data.aliases,
                size: data.members.length,
                auth: {
                    active: data.auth.active
                },
                type: data.type
            };
        }
    }, {
        response: {
            200: t.Object({ id: t.String(), aliases: t.Array(t.String()), size: t.Optional(t.Number()), auth: t.Object({ active: t.Boolean() }), type: t.String() }, { description: 'The useer or group info' }),
            404: t.Object({ message: t.String() }, { description: 'The user or group was not found' })
        },
        params: t.Object({ id: t.String({ description: 'The user or group ID you want to get info of' }) }),
        headers: t.Object({ authorization: t.Optional(t.String({ description: 'Your authentication token' })) }),
    }).post('/:id', ({ headers, params: { id }, body: { message }, error }) => {
        const sendable = getSendable(id);
        message = message.trim();
    
        if(!sendable) return error(404, { message: 'User or group not found!' });
        if(!message) return error(422, { message: `No message provided!` });
        if(sendable.auth.active && sendable.auth.key != headers.authorization) return error(403, { message: 'You are not allowed to send messages to this user or group!' });
        if(sendable.type == 'user') {
            bot.sendMessage(sendable.conversation, message);
            return { message: `The message was successfully sent!` };
        } else {
            let users = 0;
            for(const member of sendable.members) {
                const user = getSendable(member);
                if(!user || user.type != 'user') continue;
                if(user.conversation) bot.sendMessage(user.conversation, message);
                users++;
            }
            return { message: `The message was successfully sent to ${users} users!` };
        }
    }, {
        response: {
            200: t.Object({ message: t.String() }, { description: 'The message was sent successfully' }),
            403: t.Object({ message: t.String() }, { description: 'You\'re not allowed to send messages to this user or group' }),
            404: t.Object({ message: t.String() }, { description: 'The user or group was not found' }),
            422: t.Object({ message: t.String() }, { description: 'The request was invalid' }),
        },
        body: t.Object({ message: t.String({ description: 'The message you want to send' }) }, { error: 'Body needs to be an object', additionalProperties: true }),
        params: t.Object({ id: t.String({ description: 'The user or group ID you want to send a message to' }) }),
        headers: t.Object({ authorization: t.Optional(t.String({ description: 'Your authentication token' })) })
    })
    .listen(config.port);