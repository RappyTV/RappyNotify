
/**
 * @singleton
 * @class Ratelimiter
 * @description This class is used to store the rate limit information
 */

class Ratelimiter {
    /**
     * @type {Map<string, { requests: number, timestamp: number }>}
     */
    ips = new Map();
    maxRequests = server.cfg.ratelimiter.max;
    timeWindow = server.cfg.ratelimiter.seconds * 1000;

    constructor() {
        this.ips = new Map();
        this.maxRequests = server.cfg.ratelimiter.max;
        this.timeWindow = server.cfg.ratelimiter.seconds * 1000;
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @returns 
     */

    ratelimitResponse(req, res) {
        if(!server.cfg.ratelimiter.enabled) return false;
        const bypass = req.headers["x-ratelimit-bypass"];
        if(bypass && server.cfg.ratelimiter.bypassTokens.includes(bypass)) return false;
        const ratelimitData = this.getRateLimitInfo(req.ip);
        res.setHeader(`X-RateLimit-Limit`, this.maxRequests);
        if(!ratelimitData.limited) res.setHeader(`X-RateLimit-Remaining`, ratelimitData.remaining); // ik this looks weird but the order of the headers is important
        res.setHeader(`X-RateLimit-Reset`, ratelimitData.reset / 1000);
        if(ratelimitData.limited) {
            res.status(429).send({ error: `You're being ratelimited! Please try again in ${Math.ceil(ratelimitData.reset / 1000)} seconds!` });
            return true;
        }
        return false;
    }

    /**
     * 
     * @param {string} ip 
     * @returns {{ reset: number } & ({ limited: true } | { limited: false, remaining: number })}
     */

    getRateLimitInfo(ip) {
        const player = this.ips.get(ip);
        if(!player) {
            this.ips.set(ip, {
                requests: 1,
                timestamp: Date.now()
            });
            return {
                remaining: this.maxRequests - 1,
                reset: this.timeWindow,
                limited: false
            };
        };
        if(Date.now() - player.timestamp >= this.timeWindow) {
            this.ips.delete(ip);
            return this.getRateLimitInfo(ip);
        }
        return {
            limited: player.requests++ >= this.maxRequests,
            remaining: this.maxRequests - player.requests,
            reset: player.timestamp + this.timeWindow - Date.now()
        };
    }
}

module.exports = Ratelimiter;