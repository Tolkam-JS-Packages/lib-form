export default class HostError extends Error {
    constructor(...args: any[]) {
        super(...args);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
