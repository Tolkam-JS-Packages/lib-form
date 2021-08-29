import { IState, TStateListener, IStateProps, TEventName } from './types';
import { EVENT_ANY } from './events';

const defaults = {
    value: null,
    errors: null,
    touched: false,
    busy: false,
};

export default class State<E, V> implements IState<E, V> {

    /**
     *  @type {object}
     */
    protected listeners: {
        [eventName: string]: Set<TStateListener<IStateProps<E, V>>>;
    } = {};

    /**
     * @type {IStateProps<E, V>}
     */
    protected props: IStateProps<E, V>;

    /**
     * @param defaultValue
     */
    public constructor(protected defaultValue: V | null = null) {
        this.props = { ...defaults, value: defaultValue };
    }

    /**
     * Gets value
     *
     * @returns {string}
     */
    public get value(): V | null {
        return this.props.value;
    }

    /**
     * Gets errors
     *
     * @returns {IErrors|null}
     */
    public get errors(): E | null {
        return this.props.errors;
    }

    /**
     * Gets touched flag
     *
     * @returns {boolean}
     */
    public get touched(): boolean {
        return this.props.touched;
    }

    /**
     * Gets busy flag
     *
     * @returns {boolean}
     */
    public get busy(): boolean {
        return this.props.busy;
    }

    /**
     * Subscribes to changes
     *
     * @param eventName
     * @param listener
     */
    public subscribe(eventName: TEventName, listener: TStateListener<IStateProps<E, V>>): () => void {
        const { listeners } = this;
        listeners[eventName] = listeners[eventName] || new Set();

        listeners[eventName].add(listener);
        return (): void => {
            listeners[eventName].delete(listener);
        };
    }

    /**
     * Emits change
     *
     * @param eventName
     * @param issuer
     */
    public emit(eventName: TEventName, issuer?: string): void {
        const { listeners } = this;
        let eventListeners = [listeners[eventName], listeners[EVENT_ANY]];

        // keep unique and not empty
        eventListeners = eventListeners
            .filter((v, k) => v != null && eventListeners.indexOf(v) === k);

        for(const group of eventListeners) {
            group.forEach((listener) => listener(this.getProps(), eventName, issuer));
        }
    }

    /**
     * Updates state
     *
     * @param props
     *
     * @returns {this}
     */
    public update(props: Partial<IStateProps<E, V>>): this {
        const that = this;
        that.props = { ...that.props, ...props };

        return that;
    }

    /**
     * Resets to default
     *
     * @returns {this}
     */
    public reset(): this {
        return this.update({ ...defaults, value: this.defaultValue });
    }

    /**
     * Gets public props
     *
     * @returns {IStateProps<E, V>}
     */
    public getProps(): IStateProps<E, V> {
        return { ...this.props };
    }
}
