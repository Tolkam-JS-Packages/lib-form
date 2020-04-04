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
        [eventName: string]: TStateListener<IStateProps<E, V>>[];
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
        listeners[eventName] = listeners[eventName] || [];

        const len = listeners[eventName].push(listener);

        return (): void => {
            listeners[eventName].splice(len-1, 1);
        };
    }

    /**
     * Emits change
     *
     * @param eventName
     */
    public emit(eventName: TEventName): void {
        const { listeners } = this;
        const eventListeners = [listeners[eventName], listeners[EVENT_ANY]].filter(Boolean);

        for(const group of eventListeners) {
            for(const listener of group) {
                listener(this.getProps(), eventName);
            }
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