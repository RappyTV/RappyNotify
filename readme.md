# Rappy Notify
This is a simple SMS gateway for Telegram.

## Setup

### Installation

1. Clone this repository
2. Run `npm install`
3. Create a `config.json` based on the `config.json.example` file
4. Run `node index.js`

### Configuration

The `config.json` file contains the following options:

| Option | Description |
| --- | --- |
| `token` | The Telegram bot token |
| `port` | The port to run the server on |
| `logIPs` | Whether or not to log IPs in the console |
| `timeFormat` | The format of the time in the console |
| `users` | An array of users |
| `users.id` | The user's internal ID (not the telegram id!) |
| `users.aliases` | An array of aliases for the user |
| `users.conversation` | The ID of the conversation to send messages to |
| `users.auth` | An object containing authentication options for the user |
| `users.auth.active` | Whether or not the user needs to enter the key to send messages |
| `users.auth.key` | The key the user needs to enter to send messages |
| `ratelimiter` | An object containing ratelimiter options |
| `ratelimiter.enabled` | Whether or not to enable the ratelimiter |
| `ratelimiter.max` | The maximum amount of requests a user can send in the time window |
| `ratelimiter.seconds` | The length of the ratelimiter time window in seconds |

## Usage

### Sending messages
To send a message to a user, simply send a `POST` request to `/user` where `user` is the user's ID or one of their aliases. The request body should contain a JSON object with the `message` property. If the user has authentication enabled, you also need to include an `Authorization` header with the value of their key.

### Refreshing the config (Maybe for user adding and stuff)
Just send a `POST` request to `/refresh` and the config get's refreshed.