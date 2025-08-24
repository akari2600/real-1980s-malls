#!/usr/bin/env python3
"""
Update the malls table to use publication_date instead of year
"""

import sqlite3

def update_malls_table_schema(db_path: str):
    """
    Update the malls table to use publication_date (DATE) instead of year (INTEGER)
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # First, let's see what we currently have
    cursor.execute("SELECT id, name, city, state, year, source FROM malls")
    existing_malls = cursor.fetchall()
    
    print("Current malls data:")
    for mall in existing_malls:
        print(f"  {mall}")
    
    # Create new table with publication_date
    cursor.execute("""
        CREATE TABLE malls_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            city TEXT,
            state TEXT,
            address TEXT,
            publication_date DATE,  -- Changed from year INTEGER
            levels INTEGER DEFAULT 1,
            source TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Copy data from old table to new table
    # For Northwest Mall, we know it's from Houston Post 1976-02-12
    cursor.execute("""
        INSERT INTO malls_new (id, name, city, state, address, publication_date, levels, source, notes, created_at)
        SELECT 
            id, 
            name, 
            city, 
            state, 
            address,
            CASE 
                WHEN name = 'Northwest Mall' AND city = 'Houston' THEN '1976-02-12'
                ELSE year || '-01-01'  -- Default to January 1st for other entries
            END as publication_date,
            levels,
            source,
            notes,
            created_at
        FROM malls
    """)
    
    # Drop old table and rename new one
    cursor.execute("DROP TABLE malls")
    cursor.execute("ALTER TABLE malls_new RENAME TO malls")
    
    # Verify the update
    cursor.execute("SELECT id, name, city, state, publication_date, source FROM malls")
    updated_malls = cursor.fetchall()
    
    print("\nUpdated malls data:")
    for mall in updated_malls:
        print(f"  {mall}")
    
    # Show the new table schema
    cursor.execute("PRAGMA table_info(malls)")
    schema = cursor.fetchall()
    
    print("\nNew malls table schema:")
    for column in schema:
        print(f"  {column[1]} {column[2]} {'NOT NULL' if column[3] else ''} {'PRIMARY KEY' if column[5] else ''}")
    
    conn.commit()
    conn.close()
    
    print("\nSuccessfully updated malls table to use publication_date!")

if __name__ == "__main__":
    db_path = "/Users/sara/1980s-malls.sqlite"
    update_malls_table_schema(db_path)
