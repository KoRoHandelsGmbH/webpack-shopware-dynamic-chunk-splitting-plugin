const WebpackCopyAfterBuildPlugin = require('@shopware-ag/webpack-copy-after-build');
const {
    toKebabCase,
    toPascalCase,
    hasProperty
} = require('../utils');

const { resolve, join } = require("path");

const PLUGIN_NAME = 'WebpackShopwareDynamicChunkSplittingPlugin';
const WEBPACK_COPY_AFTER_BUILD_PLUGIN_NAME = 'WebpackCopyAfterBuild';

class WebpackShopwareDynamicChunkSplittingPlugin {
    constructor(options) {
        this.options = options;

        if (!hasProperty(this.options, 'plugins')) {
            console.error();
            console.error(
                `[${PLUGIN_NAME}] Missing option "plugins". Please define plugin 
names which should be handled as assets, so they're not getting
merged together in an "all.js" file from Shopware.
The plugin names can either be kebab case or pascal case e.g.:

new WebpackShopwareDynamicChunkSplittingPlugin({
    plugins: [{
        'KoroProductOrigin': {
            'koro-product-origin-map': resolve(
                join(__dirname, '..', 'src/plugin/koro-product-origin-map.js')
            )
        }
    }]
});`
            );
            process.exit(1);
        }
    }
    apply(compiler) {
        const options = compiler.options;

        if (process.env.MODE === 'hot') {
            const pluginProvideDefinitions = this.options.plugins.reduce((accumulator, plugin) => {
                const name = Object.keys(plugin)[0];
                const transformedName = toKebabCase(name);
                const definition = plugin[name];

                accumulator.push(...Object.keys(definition).map((key) => {
                    return definition[key];
                }));

                return accumulator;
            }, []);

            compiler.options.entry.storefront = [...compiler.options.entry.storefront, ...pluginProvideDefinitions];
            return;
        }

        const pluginsMap = this.options.plugins.reduce((accumulator, plugin) => {
            const name = Object.keys(plugin)[0];
            const transformedName = toKebabCase(name);
            accumulator.set(transformedName, {
                ...{ mapping: plugin[name] },
                ...{ name, transformedName }
            });

            return accumulator;
        }, new Map());

        compiler.options.plugins.forEach((plugin) => {
            // We just need to go over the webpack copy after build plugin
            if (plugin.constructor.name !== WEBPACK_COPY_AFTER_BUILD_PLUGIN_NAME) {
                return;
            }

            // Find registered plugin for chunk
            const {
                success: chunkFound,
                chunkName,
                destinationPath
            } = [...pluginsMap.keys()].reduce((accumulator, name) => {
                // Jump out because we have the right plugin already
                if (accumulator.success) {
                    return accumulator;
                }

                if (plugin._filesMap.has(name)) {
                    accumulator = {
                        success: true,
                        chunkName: name,
                        destinationPath: plugin._filesMap.get(name)
                    }
                }

                return accumulator;
            }, {  success: false, chunkName: null, destinationPath: null });

            // If the chunk not found, we don't have to do anything else
            if (!chunkFound) {
                return;
            }

            const { mapping } = pluginsMap.get(chunkName);

            // Adds custom entry points
            compiler.options.entry = {
                ...compiler.options.entry,
                ...mapping
            };
            Object.keys(mapping).forEach((name) => {
                // Remap destination path
                const transformedDestinationPath = destinationPath.replace(
                    'app/storefront/dist/storefront/',
                    'public/storefront/'
                ).replace(
                    chunkName,
                    name
                );

                // Sets up copy after build plugin
                compiler.options.plugins.push(
                    new WebpackCopyAfterBuildPlugin({
                        files: [{
                            chunkName: name,
                            to: transformedDestinationPath
                        }],
                        options: {
                            absolutePath: true,
                            sourceMap: true,
                            transformer: (path) => {
                                return path.replace('static/', '');
                            }
                        }
                    })
                );
            });
        });
    }

    getConfiguration() {
        return {
            resolve: {
                alias: {
                    "@webpack-shopware-dynamic-chunk-splitting-plugin": resolve(
                        join(
                            __dirname,
                            '..',
                            "browser"
                        )
                    ),
                },
            },
        };
    }
}

module.exports = WebpackShopwareDynamicChunkSplittingPlugin;