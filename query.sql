
WITH 
-- get the enum names and values
enums AS (
    SELECT jsonb_object_agg(name, values) as data FROM (
        SELECT pg_type.typname as name, jsonb_agg(pg_enum.enumlabel) as values
        FROM pg_catalog.pg_type
        INNER JOIN pg_catalog.pg_enum ON (pg_enum.enumtypid = pg_type.oid)
        GROUP BY pg_type.typname
    ) a
),
-- get the tables and their columns
tables AS (
    SELECT jsonb_agg(a.*) as data FROM (
        SELECT
            pg_class.relname as table_name,
            jsonb_agg(
                jsonb_build_object(
                    'name', pg_attribute.attname::text,
                    'type', (CASE pg_type.typcategory
                        WHEN 'S' THEN 'string'
                        WHEN 'N' THEN 'number'
                        WHEN 'D' THEN 'Date'
                        WHEN 'B' THEN 'boolean'
                        WHEN 'A' THEN 'Array'
                        WHEN 'E' THEN 'Enum'
                        ELSE 'unknown'
                    END),
                    'nullable', pg_attribute.attnotnull <> TRUE
                ) || (
					CASE pg_type.typcategory 
						WHEN 'E' THEN jsonb_build_object('subtype', pg_type.typname)
						ELSE '{}'::jsonb
					END
				)
                ORDER BY 
                    (CASE
                        WHEN pg_attribute.attname = 'id' THEN -1
                        WHEN pg_attribute.attname LIKE '%_id' THEN 1
                        ELSE 0
                    END),
                    pg_attribute.attname ASC
            ) as columns
            FROM pg_catalog.pg_class
            INNER JOIN pg_catalog.pg_attribute ON (pg_class.oid = pg_attribute.attrelid) 
            INNER JOIN pg_catalog.pg_type ON (pg_attribute.atttypid = pg_type.oid)
            WHERE pg_class.relkind = 'r' AND pg_class.relname NOT LIKE 'pg_%' AND pg_class.relname NOT LIKE 'sql_%' AND pg_attribute.attnum > -1 AND pg_attribute.atttypid <> 0
            GROUP BY pg_class.relname
    ) a
),
-- get the foreign keys
foreign_keys AS (
    SELECT jsonb_agg(a.*) as data FROM (
        SELECT DISTINCT
            src.relname as from_table,
            dest.relname as to_table,
            a.attname as from_column,
            b.attname as to_column
        FROM pg_catalog.pg_constraint
        INNER JOIN pg_catalog.pg_class src ON (pg_constraint.conrelid = src.oid)
        INNER JOIN pg_catalog.pg_class dest ON (pg_constraint.confrelid = dest.oid)
        INNER JOIN LATERAL (
            SELECT jsonb_agg(attname) as attname
                FROM unnest(pg_constraint.conkey) conkey(num)
                INNER JOIN pg_catalog.pg_attribute ON (conkey.num = pg_attribute.attnum AND pg_attribute.attrelid = src.oid)
        ) a ON TRUE
        INNER JOIN LATERAL (
            SELECT jsonb_agg(attname) as attname
                FROM unnest(pg_constraint.confkey) confkey(num)
                INNER JOIN pg_catalog.pg_attribute ON (confkey.num = pg_attribute.attnum AND pg_attribute.attrelid = dest.oid)
        ) b ON TRUE
        WHERE pg_constraint.contype = 'f' AND dest.relname NOT LIKE 'pg_%'
    ) a
)
SELECT tables.data as tables, enums.data as enums, foreign_keys.data as foreign_keys FROM tables, enums, foreign_keys
