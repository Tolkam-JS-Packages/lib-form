import { debounce as debounceFn } from '@tolkam/lib-utils';
import HostError from './HostError';
import State from './State';
import NullValidator from './validator/NullValidator';
import { EVENT_CLEAR, EVENT_INIT, EVENT_UPDATE, EVENT_VALIDATE } from './events';
import {
    ISourceActions,
    ISourceStates, TStateListener,
    IValidator, TEventName,
    THostState, THostErrors,
    TSourceState, TSourceErrors,
    TSourceProps, THostProps, IOptions,
} from './types';


class Host {

    /**
     * @type {IValidator}
     */
    public validator: IValidator;

    /**
     * @type {THostState}
     */
    protected hostState: THostState;

    /**
     * @type {ISourceStates}
     */
    protected sources: ISourceStates = {};

    /**
     * @type {IOptions}
     */
    protected options: Partial<IOptions> = {
        filterCriteria: [null],
        debounce: 500,
    };

    /**
     * Ids of currently running validations
     */
    protected validationIds: {[sourceName: string]: number} = {};

    /**
     * @param options
     * @param validator
     */
    public constructor(options: Partial<IOptions> = {}, validator?: IValidator) {
        this.options = {...this.options, ...options};

        this.hostState = new State<THostErrors, object>();

        this.validator = validator || new NullValidator();
    }

    /**
     * Checks if source is registered for the given name
     *
     * @param name
     *
     * @returns {boolean}
     */
    public hasSource(name: string): boolean {
        return this.sources.hasOwnProperty(name);
    }

    /**
     * Adds new source
     *
     * @param name
     * @param defaultValue
     * @param debounce
     *
     * @returns {ISourceActions}
     */
    public addSource = <V>(
        name: string,
        defaultValue: V|null = null,
        debounce?: boolean|number
    ): ISourceActions => {

        const that = this;
        const { sources, updateSourceValue } = that;
        const debouncedUpdate = debounce
            ? debounceFn(updateSourceValue, debounce === true ? that.options.debounce! : debounce)
            : updateSourceValue;

        if (that.hasSource(name)) {
            throw new HostError(`Source "${name}" is already registered`);
        }

        // store initial source state
        sources[name] = new State<TSourceErrors, V>(defaultValue);

        return {
            // subscribes to source changes
            listen: (eventName: TEventName, listener: TStateListener<TSourceProps>) =>
                sources[name].subscribe(eventName, listener),

            // updates source value
            update: (value: V|null) => {
                // set host state as busy until debounced update action is fired
                // (following update should change it to false on complete)
                that.setBusy(true);

                // perform value update
                debouncedUpdate(name, value);
            },

            // sets source busy flag
            setBusy: (busy: boolean) => that.setBusy(busy, [name]),

            // sets source errors
            setErrors: (errors: string[]) => that.setErrors({[name]: errors}),
        }
    };

    /**
     * Removes existing source
     *
     * @param name
     *
     * @returns {void}
     */
    public removeSource = (name: string): void => {
        delete this.sources[name];
    };

    /**
     * Adds state changes listener
     *
     * @param eventName
     * @param listener
     * @param name
     *
     * @returns {void}
     */
    public listen = (
        eventName: TEventName,
        listener: TStateListener<TSourceProps|THostProps>,
        name?: string
    ): () => void => {
        const state = name ? this.sources[name] : this.hostState;
        if(!state) {
            throw new HostError(
                `Failed to subscribe. No source with name "${name}" found.`
            );
        }

        return state.subscribe(eventName, listener);
    };

    /**
     * Inits sources with provided values or uses default
     *
     * @param values
     *
     * @returns {void}
     */
    public init = (values?: object): void => {
        this.eachSource((name, state) => {
            const value = values ? values[name] : values;
            state.reset();
            value && state.update({ value });

            state.emit(EVENT_INIT);
        });

        this.rebuildHostState().emit(EVENT_INIT);
    };

    /**
     * Sets source values to null
     *
     * @returns {void}
     */
    public clear = (): void => {
        this.eachSource((name, state) => {
            state.reset().update({ value: null });
            state.emit(EVENT_CLEAR);
        });

        this.rebuildHostState().emit(EVENT_CLEAR);
    };

    /**
     * Sets sources errors
     *
     * @param errors
     *
     * @returns {void}
     */
    public setErrors = (errors: THostErrors): void => {

        // set new or remove existing errors
        this.eachSource((name, state) => {
            const err = errors && errors[name] ? errors[name] : null;
            state.update({errors: err}).emit(EVENT_VALIDATE);
        });

        this.rebuildHostState().emit(EVENT_VALIDATE);
    };

    /**
     * Sets host, sources or both into busy state
     *
     * @param specificSources
     * @param busy
     *
     * @returns {void}
     */
    public setBusy = (busy: boolean, specificSources?: string[]): void => {

        if(!specificSources) {
            this.rebuildHostState().update({busy}).emit(EVENT_VALIDATE);
            return;
        }

        let hasChanges = false;
        this.eachSource((name, state) => {
            if(specificSources && specificSources.indexOf(name) !== -1) {
                state.update({busy}).emit(EVENT_VALIDATE);
                hasChanges = true;
            }
        });

        hasChanges && this.rebuildHostState().emit(EVENT_VALIDATE);
    };

    /**
     * Gets current host state
     *
     * @return {THostState}
     */
    public getState = (): THostState => {
        return this.hostState;
    };

    /**
     * Validates host state
     *
     * @returns {Promise<THostProps>}
     */
    public validate = (callback?: (props: THostProps) => void, sourceName?: string): void => {
        const that = this;
        const { hostState, rebuildHostState, sources } = that;

        hostState.update({busy: true}).emit(EVENT_VALIDATE);

        // validate only specific source or all
        const toValidate = sourceName
            ? {[sourceName]: sources[sourceName]}
            : sources;

        that.applyValidator(toValidate)
            .then((errors) => {
                this.eachSource((name, state) => {
                    if(errors.hasOwnProperty(name)) {
                        state.update({errors: errors[name]}).emit(EVENT_VALIDATE);
                    }
                });

                rebuildHostState().emit(EVENT_VALIDATE, sourceName);
                callback && callback(hostState.getProps());
            });
    };


    /**
     * Updates source state value
     *
     * @param name
     * @param value
     */
    protected updateSourceValue = (name: string, value: unknown): void => {
        const { validationIds, rebuildHostState } = this;
        const validationId = validationIds[name] = Math.random();
        let pending = false;

        const state = this.sources[name].update({
            value,
            busy: true,
            touched: true
        });

        state.emit(EVENT_UPDATE);
        rebuildHostState().emit(EVENT_UPDATE, name);

        this.applyValidator({[name]: state})
            .then(errors => {
                pending = validationIds[name] !== validationId;

                // emit only if no pending validations left (only the last validation result)
                if(!pending) {
                    state.update({errors: errors[name]});
                }
            })
            .catch(err => {
                // on errors always mark state as failed
                state.update({errors: ['🤒']});
                console.error(err);
            })
            .finally(() => {
                if(!pending) {
                    state.update({busy: false}).emit(EVENT_UPDATE);
                    rebuildHostState().emit(EVENT_UPDATE, name);
                }
            });
    };

    /**
     * Rebuilds current host state from source states
     *
     * @returns {THostState}
     */
    protected rebuildHostState = (): THostState => {
        const filterCriteria = this.options.filterCriteria;
        const value = {};
        let errors: THostErrors = null;
        let touched = false, busy = false;

        this.eachSource((name, state) => {
            value[name] = state.value;

            if(state.touched) {
                touched = true;
            }

            if(state.busy) {
                busy = true;
            }

            if(state.errors) {
                errors = errors || {};
                errors[name] = state.errors;
            }
        });

        // filter values
        if(filterCriteria!.length) {
            for(const name in value) {
                if(filterCriteria!.indexOf(value[name]) >= 0) {
                    delete value[name];
                }
            }
        }

        return this.hostState.update({value, errors, touched, busy});
    };

    /**
     * Iterates over sources
     *
     * @param callback
     */
    protected eachSource(callback: (name: string, state: TSourceState) => void): void {
        const sources = this.sources;
        for(const name in sources) {
            callback(name, sources[name]);
        }
    }

    /**
     * Validates sources values
     *
     * @param sources
     *
     * @returns {Promise<{[name: string]: TSourceErrors}>}
     */
    protected applyValidator(sources: ISourceStates): Promise<{[name: string]: TSourceErrors}> {
        const queue: Promise<{[name: string]: TSourceErrors}>[] = [];

        for(const name in sources) {
            const state = sources[name];
            const p = this.validator.validate(name, state.value, this.hostState.value || {})
                .then((errors) => {
                    return {[name]: errors};
                });

            queue.push(p);
        }

        // single source
        if(queue.length === 1) {
            return queue[0];
        }

        // resolve all promises and build new sources object
        // from array of individual {name: errors} pairs
        return Promise
            .all(queue)
            .then((arr) => arr.reduce((prev, cur) => ({...prev, ...cur}), {}));
    }
}

export { Host }
