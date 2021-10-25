# tolkam/lib-form

Form and fields state management with change listeners and data validation.

## Usage

````ts
import {
    events,
    Host,
    IValidator,
    THostProps,
    TSourceProps
} from '@tolkam/lib-form';

const validator: IValidator = {
    validate: (name, value, values) => new Promise((resolve) => {
        console.log('validating "%s" of %s', value, name);
        setTimeout(() => resolve(['invalid value!']), 1000);
    }),
};

const host = new Host({}, validator);
const fieldActions = host.addSource('myField', 'initialValue');

host.listen(events.ANY, (props: TSourceProps, eventName) => {
    console.log('myField on "%s": %O', eventName, props);
}, 'myField');

host.listen(events.ANY, (props: THostProps, eventName) => {
    console.log('global (form) on "%s": %O', eventName, props);
});

host.init();
fieldActions.update('vewValue');
````

## Documentation

The code is rather self-explanatory and API is intended to be as simple as possible. Please, read the sources/Docblock if you have any questions. See [Usage](#usage) for quick start.

## License

Proprietary / Unlicensed 🤷
