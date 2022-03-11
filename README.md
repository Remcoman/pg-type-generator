# Generate Typescript types from a Postgres database

- Export tables
- Export enums
- Exports `date`, `number`, `string`, `enum`, `boolean` columns. Unknown column types are exported as `unknown`
- Exports optional columns
- Can exclude tables (see commandline options)
- Can transform column names (see commandline options)

## How to use

```
DATABASE_URL={your database connection string} pg-gen-types > types.ts
```

For a list of all possible commands:

```
pg-gen-types --help
```