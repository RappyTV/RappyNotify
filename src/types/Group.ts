import type { Sendable } from "./Sendable"

export type Group = Sendable & {
    type: 'group';
    members: string[];
}