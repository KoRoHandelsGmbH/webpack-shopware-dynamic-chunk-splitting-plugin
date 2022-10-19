const { toKebabCase } = require('../utils');

/* @array - Cache array for webpack require chunk ids */
const moduleMap = [];

/**
 * Helper method which checks if global `webpackJsonp` variable contains
 * the chunk we're looking for.
 *
 * @param {string} chunkName
 * @returns {boolean|string}
 */
const getChunkKeyByName = (chunkName) => {
    const definition = window.webpackJsonp.find((element) => {
        const name = element[0][0];
        return name === chunkName;
    });

    if (!definition) {
        return false;
    }

    return definition[definition.length - 1][0][0];
}

/**
 * Loads a dynamic component and hook it into webpack to work properly with the
 * rest of the building pipeline.
 *
 * @param {string} pluginName
 * @param {string} chunkName
 * @param {string} cacheKey
 * @param {string} [bundleLoadingPath='/bundles?12321123']
 * @returns {Promise<Error>|Promise<Module>}
 */
const loadComponent = async (pluginName, chunkName, cacheKey, bundleLoadingPath = window.dynamicLoadingBundlePath) => {
    let key;
    if (!pluginName || !pluginName.length) {
        return Promise.reject(new Error('No plugin name provided.'));
    }

    if (!chunkName || !chunkName.length) {
        return Promise.reject(new Error('No chunk name provided.'));
    }

    const transformedPluginName = toKebabCase(pluginName, false);

    if (module.hot && module.hot.active) {
        key = filePath;
        if (!key) {
            return Promise.reject(new Error('Cache key not found.'));
        }

        /* eslint-disable */
        const module = __webpack_require__(key);
        /* eslint-enable */

        let type = 'cache-hit';
        if (moduleMap.indexOf(key) === -1) {
            moduleMap.push(key);
            type = 'load';
        }

        return Promise.resolve({ ...module, ...{ type } } );
    }

    const bundlePath = `${transformedPluginName}/storefront/js/${chunkName}.js`;
    const loadingPath = bundleLoadingPath.replace(
        '/14cdd85b63697b04af2302ece9ac3239',
        `/${bundlePath}`
    );

    const script = document.createElement('script');
    let timeout;
    script.charset = 'utf-8';
    script.timeout = 120;
    script.src = loadingPath;

    return new Promise((resolve, reject) => {
        const onScriptComplete = (event) => {
            script.onload = null;
            script.onerror = null;
            script.parentNode && script.parentNode.removeChild(script);
            clearTimeout(timeout);

            if (event.type === 'timeout') {
                reject(event);
                return;
            }

            key = getChunkKeyByName(chunkName);
            if (!key) {
                reject(new Error('Cache key not found.'));
                return;
            }

            /* eslint-disable */
            const module = __webpack_require__(key);
            /* eslint-enable */
            resolve({ ...module, ...{ type: event.type } } );
        };

        timeout = window.setTimeout(() => {
            onScriptComplete({ type: 'timeout', target: script });
        }, script.timeout * 1000);

        if (getChunkKeyByName(chunkName)) {
            onScriptComplete({ type: 'cache-hit' });
            return;
        }

        script.onload = onScriptComplete;
        script.onerror = onScriptComplete;

        document.head.appendChild(script)
    });
};

module.exports = {
    getChunkKeyByName,
    loadComponent
};