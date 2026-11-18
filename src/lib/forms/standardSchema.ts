import type { TypedSchema, TypedSchemaError } from 'vee-validate'

/** Minimal subset of the Standard Schema v1 spec (https://standardschema.dev). */
interface StandardSchema<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly validate: (
      value: unknown
    ) => StandardResult<Output> | Promise<StandardResult<Output>>
    readonly types?: { readonly input: Input; readonly output: Output }
  }
}
type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardIssue> }
interface StandardIssue {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>
}
type InferInput<S> = S extends StandardSchema<infer I, unknown> ? I : never
type InferOutput<S> = S extends StandardSchema<unknown, infer O> ? O : never

/**
 * Adapt a Standard Schema (e.g. a Zod 4 schema from `astro/zod`) into
 * vee-validate's TypedSchema. vee-validate 4.15 has no native Standard
 * Schema support, and @vee-validate/zod targets Zod 3.
 */
export function toTypedSchema<S extends StandardSchema>(
  schema: S
): TypedSchema<InferInput<S>, InferOutput<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema['~standard'].validate(values)
      if (!result.issues)
        return { value: result.value as InferOutput<S>, errors: [] }

      const byPath = new Map<string, string[]>()
      for (const issue of result.issues) {
        const path = toPath(issue.path)
        byPath.set(path, [...(byPath.get(path) ?? []), issue.message])
      }
      const errors: TypedSchemaError[] = [...byPath].map(([path, errors]) => ({
        path,
        errors,
      }))
      return { errors }
    },
  }
}

function toPath(path: StandardIssue['path']): string {
  if (!path) return ''
  return path
    .map((seg) => (typeof seg === 'object' && seg !== null ? seg.key : seg))
    .reduce<string>(
      (acc, key) =>
        typeof key === 'number'
          ? `${acc}[${key}]`
          : acc
            ? `${acc}.${String(key)}`
            : String(key),
      ''
    )
}
