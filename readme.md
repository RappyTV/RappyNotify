# RappyNotify
This is a simple Telegram message gateway.

## Setup

### Installation

1. Clone this repository
2. Run `bun i`
3. Create a `config.json` based on the `config.json.example` file
4. Configure your custom instance of `RappyNotify`
5. Run `bun start`

### Configuration

The `config.json` file contains the following options:

| Option | Description |
| --- | --- |
| `token` | The Telegram bot token |
| `port` | The port to run the server on |
| `timeFormat` | The format of the time in the console |
| `users` | An array of users |
| `users[x].id` | The user's internal ID (not the telegram id!) |
| `users[x].aliases` | An array of aliases for the user |
| `users[x].groups` | An array of groups the user is in |
| `users[x].private` | Decides if the user info can be shown on `GET` `/:user` |
| `users[x].conversation` | The ID of the conversation to send messages to |
| `users[x].auth` | An object containing authentication options for the user |
| `users[x].auth.active` | Whether or not an auth key is needed to send messages to the user |
| `users[x].auth.key` * | The key the user needs to enter to send messages |
| `groups` | An array of groups |
| `groups[x].id` | The group's internal ID |
| `groups[x].aliases` | An array of aliases for the group |
| `groups[x].private` | Decides if the group info can be shown on `GET` `/:group` |
| `groups[x].auth` | An object containing authentication options for the group |
| `groups[x].auth.active` | Whether or not an auth key is needed to send messages to the group |
| `groups[x].auth.key` * | The auth key that is needed to send messages |

\* Is optional so you can leave it empty 
## Usage

### Sending messages
To send a message to a user or a group, simply send a `POST` request to `/:id` where `id` is a user or a group id or one of their aliases. The request body should contain a JSON object with the `message` property. If the user has authentication enabled, you also need to include an `Authorization` header with the value of their key.