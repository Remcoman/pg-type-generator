# Generate TypeScript types from a Postgres database

- Export tables
- Export enums
- Exports `date`, `number`, `string`, `enum`, `boolean` columns. Unknown column types are exported as `unknown`
- Exports optional columns