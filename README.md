# Webpack - Dynamic chunk splitting plugin for Shopware 6

<div align="center">

![NPM](https://img.shields.io/npm/l/@korodrogerie/webpack-shopware-dynamic-chunk-splitting-plugin) ![npm (scoped)](https://img.shields.io/npm/v/@korodrogerie/webpack-shopware-dynamic-chunk-splitting-plugin) ![node version](https://img.shields.io/badge/node-v16-brightgreen) ![npm](https://img.shields.io/npm/dm/@korodrogerie/webpack-shopware-dynamic-chunk-splitting-plugin)
</div>

Webpack plugin which allows you to mark certain files as entry points for dynamic imports which allows you to dynamically import components.

## Installation

```bash
npm install --save-dev @korodrogerie/webpack-shopware-dynamic-chunk-splitting-plugin
```

## Usage

Install the NPM package and create a new file called `app/storefront/build/webpack.config.js` and import webpack plugin from the NPM package:

```js
const { WebpackShopwareDynamicChunkSplittingPlugin } = require('@korodrogerie/webpack-shopware-dynamic-chunk-splitting-plugin');

module.exports = ({ config }) => {
    config.plugins.push(new WebpackShopwareDynamicChunkSplittingPlugin({
        plugins: [{
            // Plugin name
            'KoroProductOrigin': {
                // Chunk name and absolute path to the file which should be its own
                // entry point.
                'koro-product-origin-map': resolve(
                    join(__dirname, '..', 'src/plugin/koro-product-origin-map.js')
                )
            }
        }]
    }));
}
```

Next up, we're having to include the browser library to load components dynamically:

```js
return {
    resolve: {
        alias: {
            '@webpack-shopware-dynamic-chunk-splitting-plugin': resolve(
                join(
                    __dirname,
                    '..',
                    'node_modules',
                    '@korodrogerie',
                    'webpack-shopware-dynamic-chunk-splitting-plugin',
                    'src',
                    'browser'
                )
            )
        },
    },
};
```

Within your Shopware 6 storefront JavaScript files you can import the component using your plugin name and the chunk name you defined in your Webpack config:

```js
loadComponent(
    'KoroProductOrigin',
    'koro-product-origin-map'
).then(({ default: KoroProductOriginMap, type }) => {
    if (type === 'cache-hit') {
        return;
    }

    PluginManager.register(
        'KoroWorldMap',
        KoroProductOriginMap,
        element
    );
    PluginManager.initializePlugin('KoroWorldMap', element);
});
```

Last but not least, create a new template file `views/storefront/base.html.twig` and populate the bundle loading path:

```twig
{% sw_extends '@Storefront/storefront/base.html.twig' %}

{% block base_body_script %}
    <script type="text/javascript">
        if (!window.hasOwnProperty('dynamicLoadingBundlePath')) {
            window.dynamicLoadingBundlePath = '{{ asset('/bundles/14cdd85b63697b04af2302ece9ac3239') }}';
        }
    </script>
    {{ parent() }}
{% endblock %}
```

## `loadComponent` method in browser

The `loadComponent` method is used to dynamically import custom entry points for plugins. It takes the following arguments:

* `pluginName` - Name of your plugin
* `chunkName` - Chunk name which can be freely choosen in the webpack config
* `bundleLoadingPath` - Base loading path. It points to your `public/bundles` directory.

The method returns a promise with the loaded plugin class and a type:

```js
loadComponent(
    'KoroProductOrigin', 
    'koro-product-origin-map'
).then(({ default: KoroProductOriginMap, type }) => {});
```

Usign object destructring you're getting `default` which is the plugin class and `type` which represents the type of the operation. The following types can occur:

* `load` - First load of the component
* `timeout` - Loading the component run into a 120 second timeout.
* `cache-hit` - Component got loaded already and is in Webpack's global cache object e.g. `webpackJsonp`
* `missing` -  A 404 got returned from the HTTP request

## How it works

The Webpack plugin injects a new entry point using the provided chunk name pointing to an absolute path to a file within your plugin. Usually it's a plugin class. Additionally the webpack plugin registeres a new instance of Shopware's `WebpackCopyAfterBuild` plugin to copy over the new file for the defined entry point to the destination `src/public/storefront/js`. This way the file isn't getting collected by Shopware's theme compilation process.

The browser library provides replicates Webpack's `loadScript` method. Based on the provided arguments `pluginName` and `chunkName` the correct path to your newly built JavaScript file gets created and a `script` element gets injected into the `head` element of your document. A `onload` handler does a lookup on the object `webpackJsonp` to make sure the chunk got loaded correctly. Next up, we're using Webpack's special method `__webpack_require__` which takes a `moduleId` to wire up the loaded plugin into Webpack's dependency lookup tree.

## License

Licensed under MIT

Copyright (c) 2020-present [Koro Handels GmbH](https://github.com/KoRoHandelsGmbH/)