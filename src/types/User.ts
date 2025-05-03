import type { Sendable } from "./Sendable"

export type User = Sendable & {
    type: 'user';
    conversation: string;
    groups: string[];
}