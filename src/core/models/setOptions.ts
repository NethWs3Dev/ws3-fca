const utils = require('../../utils');
import { LoginOptions } from "../../types";

/**
 * Sets global options for the API.
 *
 * @param globalOptions - The global options object to modify.
 * @param options - New options to apply.
 */
async function setOptions(
  globalOptions: LoginOptions,
  options: LoginOptions
): Promise<void> {
    const optionHandlers = {
        proxy(value: string) {
            globalOptions.proxy = value;
            utils.setProxy(value);
        },
        randomUserAgent(value: boolean) {
            globalOptions.randomUserAgent = value;
            if (value) {
                globalOptions.userAgent = utils.randomUserAgent();
            }
        },
        bypassRegion(value: string) {
            if (value){
                value = value.toUpperCase();
            } 
            globalOptions.bypassRegion = value;
        }
    };

    Object.entries(options).forEach(([key, value]: [string, VoidFunction]) => {
        if (optionHandlers[key]) optionHandlers[key](value);
    });
}

module.exports = setOptions;
