/* Declara el módulo `.vue` para que TypeScript lo reconozca */
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<object, object, unknown>
    export default component
}
