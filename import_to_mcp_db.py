#!/usr/bin/env python3
"""
Import CSV data into the MCP server's database using SQL INSERT statements
"""

import csv

def generate_insert_statements(csv_file: str, output_file: str):
    """
    Generate SQL INSERT statements from CSV data
    """
    with open(csv_file, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        with open(output_file, 'w', encoding='utf-8') as sqlfile:
            for row in reader:
                # Escape single quotes in text fields
                business_name = row['business_name'].replace("'", "''")
                address = row['address'].replace("'", "''") if row['address'] else ''
                mall_center = row['mall_center'].replace("'", "''") if row['mall_center'] else ''
                city = row['city'].replace("'", "''")
                state = row['state'].replace("'", "''")
                zip_code = row['zip'].replace("'", "''") if row['zip'] else ''
                mall_bool = 1 if row['mall'].lower() == 'true' else 0
                
                # Generate INSERT statement
                sql = f"""INSERT INTO arcade_directory (business_name, address, mall_center, city, state, zip, mall) VALUES ('{business_name}', {f"'{address}'" if address else 'NULL'}, {f"'{mall_center}'" if mall_center else 'NULL'}, '{city}', '{state}', {f"'{zip_code}'" if zip_code else 'NULL'}, {mall_bool});"""
                
                sqlfile.write(sql + '\n')
    
    print(f"Generated SQL INSERT statements in {output_file}")

if __name__ == "__main__":
    csv_file = "1991-arcade-directory-parsed.csv"
    output_file = "insert_arcade_data.sql"
    generate_insert_statements(csv_file, output_file)
    print(f"Run the SQL statements in {output_file} to import the data")

