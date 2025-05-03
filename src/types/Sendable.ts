export type Sendable = {
    id: string;
    aliases: string[];
    type: 'user' | 'group';
    private: boolean;
    auth: {
        active: boolean;
        key: string;
    }
}