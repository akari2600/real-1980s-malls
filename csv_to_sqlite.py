#!/usr/bin/env python3
"""
Migrate the parsed arcade directory CSV to SQLite database
"""

import sqlite3
import csv
import os
from typing import List, Dict

def create_arcade_table(cursor):
    """
    Create the arcade_directory table with appropriate schema
    """
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS arcade_directory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT NOT NULL,
            address TEXT,
            mall_center TEXT,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            zip TEXT,
            mall BOOLEAN NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create indexes for common queries
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_state ON arcade_directory(state)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_mall ON arcade_directory(mall)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_city_state ON arcade_directory(city, state)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_business_name ON arcade_directory(business_name)')

def convert_csv_to_sqlite(csv_file: str, sqlite_file: str):
    """
    Convert CSV file to SQLite database
    """
    # Remove existing database if it exists
    if os.path.exists(sqlite_file):
        os.remove(sqlite_file)
        print(f"Removed existing database: {sqlite_file}")
    
    # Connect to SQLite database
    conn = sqlite3.connect(sqlite_file)
    cursor = conn.cursor()
    
    # Create table
    create_arcade_table(cursor)
    
    # Read CSV and insert data
    with open(csv_file, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        insert_query = '''
            INSERT INTO arcade_directory 
            (business_name, address, mall_center, city, state, zip, mall)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        '''
        
        records_inserted = 0
        for row in reader:
            # Convert mall boolean
            mall_bool = row['mall'].lower() == 'true'
            
            cursor.execute(insert_query, (
                row['business_name'],
                row['address'] if row['address'] else None,
                row['mall_center'] if row['mall_center'] else None,
                row['city'],
                row['state'],
                row['zip'] if row['zip'] else None,
                mall_bool
            ))
            records_inserted += 1
    
    # Commit changes
    conn.commit()
    
    # Print summary statistics
    cursor.execute('SELECT COUNT(*) FROM arcade_directory')
    total_records = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM arcade_directory WHERE mall = 1')
    mall_records = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(DISTINCT state) FROM arcade_directory')
    unique_states = cursor.fetchone()[0]
    
    cursor.execute('SELECT state, COUNT(*) as count FROM arcade_directory GROUP BY state ORDER BY count DESC LIMIT 10')
    top_states = cursor.fetchall()
    
    print(f"Successfully migrated {records_inserted} records to {sqlite_file}")
    print(f"Total records: {total_records}")
    print(f"Mall locations: {mall_records}")
    print(f"Non-mall locations: {total_records - mall_records}")
    print(f"Unique states: {unique_states}")
    print("\nTop 10 states by number of arcade locations:")
    for state, count in top_states:
        print(f"  {state}: {count}")
    
    # Sample queries to verify data
    print("\nSample mall locations:")
    cursor.execute('''
        SELECT business_name, mall_center, city, state 
        FROM arcade_directory 
        WHERE mall = 1 AND mall_center IS NOT NULL 
        LIMIT 5
    ''')
    for row in cursor.fetchall():
        print(f"  {row[0]} at {row[1]} in {row[2]}, {row[3]}")
    
    conn.close()

if __name__ == "__main__":
    csv_file = "1991-arcade-directory-parsed.csv"
    sqlite_file = "1991-arcade-directory-parsed.sqlite"
    
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found!")
        exit(1)
    
    convert_csv_to_sqlite(csv_file, sqlite_file)
    print(f"\nDatabase created: {sqlite_file}")
    print("Ready for MCP server integration!")

