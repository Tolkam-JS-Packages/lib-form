import { IValidator, TSourceErrors } from '../types';

export default class NullValidator implements IValidator {

    /**
     * @inheritDoc
     */
    public validate(): Promise<TSourceErrors | null> {
        return Promise.resolve(null);
    };
}