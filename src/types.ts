export interface IStateProps<E, V> {
    readonly value: V | null;
    readonly errors: E | null;
    readonly touched: boolean;
    readonly busy: boolean;
}

export interface IState<E, V> extends IStateProps<E, V> {
    reset(): this;
    update(props: Partial<IStateProps<E, V>>): this;
    getProps(): IStateProps<E, V>;
    subscribe(eventName: TEventName, listener: TStateListener<IStateProps<E, V>>): () => void;
    emit(eventName: TEventName, issuer?: string): void;
}

export type THostErrors = {[name: string]: string[]|null} | null;
export type TSourceErrors = string[] | null;

export type THostProps<V = {[name: string]: any}> = IStateProps<THostErrors, V>;
export type TSourceProps = IStateProps<TSourceErrors, any>;

export type THostState = IState<THostErrors, object>;
export type TSourceState = IState<TSourceErrors, any>;

export type TEventName = '*' | 'init' | 'clear' | 'update' | 'validate';

export type TStateListener<P> = (props: P, eventName: TEventName, issuer?: string) => void;

export interface ISourceStates {
    [name: string]: TSourceState;
}

export interface ISourceActions {
    listen: (eventName: TEventName, listener: TStateListener<TSourceProps>) => () => void;
    init: (value: any) => void;
    update: (value: any) => void;
    setBusy: (busy: boolean) => void;
    setErrors: (errors: string[]) => void;
}

export interface IValidator {
    validate: (name:  string|number, value: any, hostValues: {[name: string]: any}) => Promise<TSourceErrors|null>;
}

export interface IOptions {
    // filter from host state values of provided types
    filterCriteria: unknown[];

    // default debounce for all sources
    debounce?: number;
}
