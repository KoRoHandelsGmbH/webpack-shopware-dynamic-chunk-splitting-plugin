const toKebabCase = (val, separator = true) => {
    const replacement = (separator ? '$1-$2' : '$1$2');
    return val.replace(/([a-z])([A-Z])/g, replacement).toLowerCase();
}

const hasProperty = (target, key) => {
    return Object.prototype.hasOwnProperty.call(target, key);
};

module.exports = {
    toKebabCase,
    hasProperty
};