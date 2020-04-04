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
    emit(eventName: TEventName): void;
}

export type THostErrors = {[name: string]: string[]|null} | null;
export type TSourceErrors = string[] | null;

export type THostProps = IStateProps<THostErrors, object>;
export type TSourceProps = IStateProps<TSourceErrors, any>;

export type THostState = IState<THostErrors, object>;
export type TSourceState = IState<TSourceErrors, any>;

export type TEventName = '*' | 'init' | 'clear' | 'update' | 'validate';

export type TStateListener<P> = (props: P, eventName: TEventName) => void;

export interface ISourceStates {
    [name: string]: TSourceState;
}

export interface ISourceActions {
    listen: (eventName: TEventName, listener: TStateListener<TSourceProps>) => () => void;
    update: (value: any) => void;
    setBusy: (busy: boolean) => void;
    setErrors: (errors: string[]) => void;
}

export interface IValidator {
    validate: (name:  string|number, value: any) => Promise<TSourceErrors|null>;
}

export interface IOptions {
    // filter from host state values of provided types
    filterCriteria: unknown[];

    // default debounce for all sources
    debounce?: number;
}