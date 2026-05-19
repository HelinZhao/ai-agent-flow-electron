/**
 * JSON Schema → Zod Schema 转换器
 * 将 MCP 工具返回的 JSON Schema 参数定义转换为 Zod 对象，
 * 用于创建 DynamicStructuredTool 时的参数校验。
 */
import { z } from 'zod'

function zodTypeFromJsonSchema(schema: any): z.ZodTypeAny {
  if (schema === null || schema === undefined) {
    return z.any()
  }

  // 处理 oneOf/anyOf → 取第一个或 any
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    return zodTypeFromJsonSchema(schema.oneOf[0])
  }
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    return zodTypeFromJsonSchema(schema.anyOf[0])
  }
  if (schema.allOf && Array.isArray(schema.allOf)) {
    return z.object(
      Object.assign({}, ...schema.allOf.map((s: any) => {
        const converted = zodTypeFromJsonSchema(s)
        return converted instanceof z.ZodObject ? converted.shape : {}
      }))
    )
  }

  const type = schema.type

  // const（枚举值）
  if (schema.const !== undefined) {
    return z.literal(schema.const)
  }

  // enum
  if (schema.enum && Array.isArray(schema.enum)) {
    // z.enum needs at least 2 values, fallback to z.any() for single-value enum
    if (schema.enum.length >= 2) {
      return z.enum(schema.enum.map(String) as [string, ...string[]])
    }
    if (schema.enum.length === 1) {
      return z.literal(schema.enum[0])
    }
  }

  switch (type) {
    case 'string': {
      let s = z.string()
      if (schema.minLength !== undefined) s = s.min(schema.minLength)
      if (schema.maxLength !== undefined) s = s.max(schema.maxLength)
      if (schema.pattern !== undefined) s = s.regex(new RegExp(schema.pattern))
      return s
    }
    case 'number': {
      let n = z.number()
      if (schema.minimum !== undefined) n = n.min(schema.minimum)
      if (schema.maximum !== undefined) n = n.max(schema.maximum)
      return n
    }
    case 'integer': {
      let n = z.number().int()
      if (schema.minimum !== undefined) n = n.min(schema.minimum)
      if (schema.maximum !== undefined) n = n.max(schema.maximum)
      return n
    }
    case 'boolean':
      return z.boolean()
    case 'array': {
      if (schema.items) {
        const itemType = Array.isArray(schema.items)
          ? z.union(schema.items.map((i: any) => zodTypeFromJsonSchema(i)))
          : zodTypeFromJsonSchema(schema.items)
        return z.array(itemType)
      }
      return z.array(z.any())
    }
    case 'object':
      return zodObjectFromJsonSchema(schema)
    default:
      return z.any()
  }
}

export function zodObjectFromJsonSchema(schema: any): z.ZodObject<any> {
  if (!schema || !schema.properties) {
    return z.object({})
  }

  const shape: Record<string, z.ZodTypeAny> = {}
  const requiredFields = new Set<string>(
    Array.isArray(schema.required) ? schema.required : []
  )

  for (const [key, propSchema] of Object.entries<any>(schema.properties)) {
    const zodType = zodTypeFromJsonSchema(propSchema)
    if (requiredFields.has(key)) {
      shape[key] = zodType
    } else {
      shape[key] = zodType.optional()
      // Apply default value if present
      if (propSchema.default !== undefined) {
        shape[key] = shape[key].default(propSchema.default)
      }
    }
  }

  return z.object(shape)
}
