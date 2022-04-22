#!/usr/bin/env node

import pg from  'pg'
import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { createFormatter } from './formatting.mjs'
import { snakeCase, pascalCase, pluralize, removeId, camelCase } from './string-utils.mjs'

if(!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL env!')
    process.exit(1)
}

const args = yargs(hideBin(process.argv))
    .option('exclude-table', {
        type: 'array',
        default: [],
        coerce: value => value.map(pattern => new RegExp(pattern, 'i')),
        alias: 'excludeTable'
    })
    .option('one2many-relations', {
        type: 'string',
        choices: ['none', 'simple', 'links'],
        default: 'none',
        alias: 'oneToManyRelations'
    })
    .option('one2one-relations', {
        type: 'string',
        choices: ['none', 'simple', 'links'],
        default: 'none',
        alias: 'oneToOneRelations'
    })
    .option('column-transform', {
        type: 'string',
        choices: ['none', 'pascal_case', 'snake_case', 'camel_case'],
        default: 'none',
        alias: 'columnTransform'
    })
    .help()
    .argv

const __filename = fileURLToPath(import.meta.url)

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
})

await client.connect()

const sql = fs.readFileSync(path.resolve(path.dirname(__filename), 'query.sql'), 'utf8')
const { tables, enums, foreign_keys } = await client.query(sql).then(result => result.rows[0])

const formatter = createFormatter()

for(let [name, values] of Object.entries(enums)) {
    formatter.writeLine(`export enum ${name} {`)
    formatter.startIndent()
    for(let value of values) {
        formatter.writeLine(`${value},`)
    }
    formatter.endIndent()
    formatter.writeLine('};')
    formatter.writeLine('')
}

const tables_filtered = tables.filter(({ table_name }) => !args.excludeTable.some(regex => regex.test(table_name)))

for(let { table_name, columns } of tables_filtered) {
    const name = pascalCase(table_name);

    formatter.writeLine(`export type ${name} = {`)
    formatter.startIndent()

    formatter.writeLine(`__tableName: '${table_name}',`)

    for(let col of columns) {
        const colName = transform(args.columnTransform, col.name);
        formatter.writeLine(`${colName}${col.nullable ? '?' : ''}: ${col.type},`)
    }

    let links = [];
    
    if(args.oneToOneRelations !== 'none') {
        const oneToOneReferences = foreign_keys.filter(key => key.from_table === table_name & key.from_column.length === 1)

        if(oneToOneReferences.length) {
            if(args.oneToOneRelations === 'simple') {
                formatter.writeLine('')
                for(let foreignKey of oneToOneReferences) {
                    formatter.writeLine(`${transform(args.columnTransform, removeId(foreignKey.from_column[0]))}?: ${foreignKey.to_table},`)
                }
            } else if(args.oneToOneRelations === 'links') {
                links = [
                    ...links,
                    ...oneToOneReferences.map(foreignKey => ({
                        type: 'one',
                        destTable: foreignKey.to_table,
                        destColumn: foreignKey.to_column,
                        srcColumn: foreignKey.from_column
                    }))
                ]
            }
        }
    }

    if(args.oneToManyRelations !== 'none') {
        const oneToManyReferences = foreign_keys.filter(key => key.to_table === table_name)
        if(oneToManyReferences.length) {
            if(args.oneToManyRelations === 'simple') {
                formatter.writeLine('')
                for(let foreignKey of oneToManyReferences) {
                    formatter.writeLine(`${pluralize(transform(args.columnTransform, foreignKey.from_table))}?: ${foreignKey.from_table}[],`)
                }
            } else if(args.oneToManyRelations === 'links') {
                links = [
                    ...links, 
                    ...oneToManyReferences.map(foreignKey => ({
                        type: 'many',
                        destTable: foreignKey.from_table,
                        destColumn: foreignKey.from_column,
                        srcColumn: foreignKey.to_column 
                    }))
                ]
            }
        }
    }

    if(links.length) {
        formatter.writeLine('__links: ')
        formatter.startIndent()
        formatter.join(links, ({ type, destTable, destColumn, srcColumn }) => {
            formatter.writeLine(`{ type: '${type}', destTable: '${destTable}', destColumn: '${destColumn}', srcColumn: '${srcColumn}' }`)
        }, ' |')
        formatter.endIndent()
        formatter.write(',')
    }
    
    formatter.endIndent()
    formatter.writeLine('};')
    formatter.writeLine('')
}

formatter.writeLine('export type Tables = ')
formatter.startIndent()
for(let [index, { table_name }] of tables_filtered.entries()) {
    formatter.writeLine(`${pascalCase(table_name)}${index < tables_filtered.length - 1 ? ' |' : ''}`)
}
formatter.endIndent()

function transform(type, value) {
    switch(type) {
        case 'pascal_case': {
            return pascalCase(value)
        }
        case 'snake_case': {
            return snakeCase(value)
        }
        case 'camel_case': {
            return camelCase(value)
        }
    }
    return value
}

await client.end()

process.stdout.write(formatter.toString())
