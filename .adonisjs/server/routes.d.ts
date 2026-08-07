import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'dashboard': { paramsTuple?: []; params?: {} }
    'rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'dashboard': { paramsTuple?: []; params?: {} }
    'rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'dashboard': { paramsTuple?: []; params?: {} }
    'rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}