/**
 * 可选 SDK 的类型声明
 * 这些包不是强制依赖，通过动态 import() 按需加载，
 * 因此这里声明为 any 以避免 TS 报错。
 */
declare module '@lancedb/lancedb' {
  export function connect(uri: string): Promise<any>
}
declare module '@qdrant/js-client-rest' {
  export const QdrantClient: new (config: any) => any
}
declare module '@pinecone-database/pinecone' {
  export const Pinecone: new (config: any) => any
}
declare module 'weaviate-ts-client' {
  export function client(config: any): any
  export class ApiKey {
    constructor(key: string)
  }
}
declare module '@zilliz/milvus2-sdk-node' {
  export const MilvusClient: new (config: any) => any
}
declare module 'pg' {
  export const Pool: new (config: any) => any
}
declare module 'mongodb' {
  export const MongoClient: new (uri: string) => any
}
declare module 'redis' {
  export function createClient(config?: any): any
}
declare module '@elastic/elasticsearch' {
  export const Client: new (config: any) => any
}
