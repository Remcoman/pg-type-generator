
export function removeId(ident) {
    return ident.replace(/_id$/, '')
}

export function pascalCase(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_[a-z]/g, (a) => a.charAt(1).toUpperCase())
}

export function camelCase(name) {
    return name.charAt(0).toLowerCase() + name.slice(1).replace(/_[a-z]/g, (a) => a.charAt(1).toUpperCase())
}

export function snakeCase(name) {
    return name.charAt(0).toLowerCase() + name.slice(1).replace(/[A-Z]/g, (a) => '_' + a.toLowerCase())
}

export function pluralize(name) {
    if(/(z|x|ch|sh|s)$/.test(name)) {
        return name + 'es'
    }
    return name + 's'
}