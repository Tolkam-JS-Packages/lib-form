export const EVENT_ANY = '*' as const;
export const EVENT_CLEAR = 'clear' as const;
export const EVENT_INIT = 'init' as const;
export const EVENT_UPDATE = 'update' as const;
export const EVENT_VALIDATE = 'validate' as const;

export const events = {
    ANY: EVENT_ANY,
    CLEAR: EVENT_CLEAR,
    INIT: EVENT_INIT,
    UPDATE: EVENT_UPDATE,
    VALIDATE: EVENT_VALIDATE,
};