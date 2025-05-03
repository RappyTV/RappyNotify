import chalk from "chalk";
import moment from "moment";
import { timeFormat } from "../../config.json";

export default class Logger {
    private static getTimestamp() {
        return chalk.gray(`[${moment(new Date()).format(timeFormat)}]`);
    }
    
    public static debug(...text: any) {
        console.log(Logger.getTimestamp(), chalk.blueBright('[DEBUG]'), ...text);
    }

    public static info(...text: any) {
        console.log(Logger.getTimestamp(), chalk.blue('[INFO]'), ...text);
    }

    public static warn(...text: any) {
        console.log(Logger.getTimestamp(), chalk.yellow('[WARN]'), ...text);
    }

    public static error(...text: any) {
        console.log(Logger.getTimestamp(), chalk.red('[ERROR]'), ...text);
    }
}