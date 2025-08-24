#!/usr/bin/env python3
"""
Populate Northwest Mall directory data from the 1976 Houston Post directory
"""

import sqlite3
from typing import List, Dict

def get_northwest_mall_stores() -> List[Dict]:
    """
    Return all store data from the Northwest Mall directory
    Based on the directory image from Houston Post 1976-02-12
    """
    stores = [
        # Department Stores
        {"store_number": "63", "store_name": "Beall", "phone": "688-4848", "category": "Department Stores", "is_anchor": True},
        {"store_number": None, "store_name": "Foley's", "phone": "683-5470", "category": "Department Stores", "is_anchor": True},
        {"store_number": None, "store_name": "JC Penney", "phone": "681-5441", "category": "Department Stores", "is_anchor": True},
        {"store_number": "41", "store_name": "Palais Royal", "phone": "681-5881", "category": "Department Stores"},
        {"store_number": "18", "store_name": "Woolworth", "phone": "682-2509", "category": "Department Stores"},
        
        # Men's and Women's Apparel
        {"store_number": "67", "store_name": "The Gap", "phone": "686-1620", "category": "Men's and Women's Apparel"},
        {"store_number": "49", "store_name": "Gingiss Formal Wear", "phone": "688-5986", "category": "Men's Apparel"},
        {"store_number": "40", "store_name": "Leopold Price & Rolle", "phone": "681-0308", "category": "Men's Apparel"},
        
        # Men's Apparel
        {"store_number": "39", "store_name": "Chess King", "phone": "682-9449", "category": "Men's Apparel"},
        {"store_number": "61", "store_name": "J. Riggings", "phone": "688-5874", "category": "Men's Apparel"},
        
        # Women's Apparel
        {"store_number": "38", "store_name": "Betty's Maternities", "phone": "681-7150", "category": "Women's Apparel"},
        {"store_number": "14", "store_name": "Carrel Image", "phone": "957-4693", "category": "Women's Apparel"},
        {"store_number": "62", "store_name": "Casual Corner", "phone": "688-1378", "category": "Women's Apparel"},
        {"store_number": "43", "store_name": "S-T-R-E-T-C-H", "phone": "686-0579", "category": "Women's Apparel"},
        {"store_number": "27", "store_name": "Lady Ors", "phone": "686-1413", "category": "Women's Apparel"},
        {"store_number": "25", "store_name": "Lane Bryant", "phone": "681-4671", "category": "Women's Apparel"},
        {"store_number": "16", "store_name": "Lerner", "phone": "686-4101", "category": "Women's Apparel"},
        {"store_number": "15", "store_name": "The Limited", "phone": "688-6957", "category": "Women's Apparel"},
        {"store_number": "23A", "store_name": "Limited Express", "phone": "688-8434", "category": "Women's Apparel"},
        {"store_number": "59", "store_name": "Margos", "phone": "681-3537", "category": "Women's Apparel"},
        {"store_number": "17", "store_name": "Sassaby", "phone": "688-8404", "category": "Women's Apparel"},
        {"store_number": "65", "store_name": "Susie's Casuals", "phone": "682-6620", "category": "Women's Apparel"},
        
        # Shoes
        {"store_number": "68", "store_name": "Baker Shoes", "phone": "682-1487", "category": "Shoes"},
        {"store_number": "37", "store_name": "Flag Brothers", "phone": "681-7292", "category": "Shoes"},
        {"store_number": "56", "store_name": "Florsheim Shoes", "phone": "681-2177", "category": "Shoes"},
        {"store_number": "58", "store_name": "Footlocker", "phone": "682-3413", "category": "Shoes"},
        {"store_number": "69", "store_name": "Jarman Shoes", "phone": "682-2717", "category": "Shoes"},
        {"store_number": "66", "store_name": "Kinney Shoes", "phone": "688-8147", "category": "Shoes"},
        {"store_number": "64", "store_name": "Naturalizer Shoes", "phone": "683-9398", "category": "Shoes"},
        {"store_number": "46", "store_name": "Thom McAn", "phone": "682-7320", "category": "Shoes"},
        {"store_number": "24", "store_name": "Thom McAn", "phone": "682-1480", "category": "Shoes"},
        {"store_number": "11", "store_name": "Lady Footlocker", "phone": "688-7659", "category": "Shoes"},
        
        # Specialty Stores
        {"store_number": "26", "store_name": "Frame It", "phone": "683-9813", "category": "Specialty Stores"},
        {"store_number": "13", "store_name": "General Nutrition", "phone": "956-2050", "category": "Specialty Stores"},
        {"store_number": "54", "store_name": "Good Goods", "phone": "681-4519", "category": "Specialty Stores"},
        {"store_number": "19", "store_name": "H & H Music", "phone": "681-4841", "category": "Specialty Stores"},
        {"store_number": "12", "store_name": "Happy Happy Hallmark", "phone": "686-0685", "category": "Specialty Stores"},
        {"store_number": "44", "store_name": "Hastings Records", "phone": "686-4391", "category": "Specialty Stores"},
        {"store_number": "53", "store_name": "Heritage MFG", "phone": "688-6128", "category": "Specialty Stores"},
        {"store_number": "30", "store_name": "Hickory-Lindquist", "phone": "688-9385", "category": "Specialty Stores"},
        {"store_number": "51", "store_name": "Photos to Go", "phone": "956-2039", "category": "Specialty Stores"},
        {"store_number": "9", "store_name": "Personal Properties", "phone": "683-7147", "category": "Specialty Stores"},
        {"store_number": "47", "store_name": "Pipe Pub", "phone": "686-8325", "category": "Specialty Stores"},
        {"store_number": "55", "store_name": "Pets-N-Things", "phone": "682-2585", "category": "Specialty Stores"},
        {"store_number": "35", "store_name": "Radio Shack", "phone": "686-9264", "category": "Specialty Stores"},
        {"store_number": "20", "store_name": "Ritz Camera", "phone": "956-0683", "category": "Specialty Stores"},
        {"store_number": "79", "store_name": "Things Remembered", "phone": "686-1928", "category": "Specialty Stores"},
        {"store_number": "28", "store_name": "Wicks-N-Sticks", "phone": "680-2996", "category": "Specialty Stores"},
        
        # Gifts, Books & Toys
        {"store_number": "23", "store_name": "B. Dalton Books", "phone": "686-8404", "category": "Gifts, Books & Toys", "subcategory": "Bookstore"},
        {"store_number": "21", "store_name": "Circus World", "phone": "686-2127", "category": "Gifts, Books & Toys"},
        {"store_number": "78", "store_name": "Waldenbooks", "phone": "682-2237", "category": "Gifts, Books & Toys", "subcategory": "Bookstore"},
        
        # Services
        {"store_number": "85", "store_name": "Americana Insurance", "phone": "681-1234", "category": "Services"},
        {"store_number": "29", "store_name": "Barchus Barber", "phone": "680-3166", "category": "Services"},
        {"store_number": "32", "store_name": "Boyd's House of Travel", "phone": "688-8366", "category": "Services"},
        {"store_number": "34", "store_name": "Houston Consumer Research", "phone": "956-7655", "category": "Services"},
        {"store_number": "86", "store_name": "Skillmaster Homes", "phone": "680-2222", "category": "Services"},
        {"store_number": "42", "store_name": "Texas State Optical", "phone": "681-2467", "category": "Services"},
        {"store_number": "22", "store_name": "Visible Changes", "phone": "680-0308", "category": "Services"},
        
        # Food Court
        {"store_number": "5", "store_name": "Adam's Deli", "phone": "681-8970", "category": "Food Court"},
        {"store_number": "3", "store_name": "Baskin Robbins", "phone": "682-1742", "category": "Food Court"},
        {"store_number": "4", "store_name": "Chick-Fil-A", "phone": "680-9172", "category": "Food Court"},
        {"store_number": "72", "store_name": "Chili Parlor", "phone": "680-2282", "category": "Food Court"},
        {"store_number": "76", "store_name": "Corn Dog", "phone": "680-8144", "category": "Food Court"},
        {"store_number": "77", "store_name": "El Chico", "phone": "688-0184", "category": "Food Court"},
        {"store_number": "73", "store_name": "Elise French Bakery", "phone": "683-8772", "category": "Food Court"},
        {"store_number": "71", "store_name": "Gyros Corner", "phone": "680-2282", "category": "Food Court"},
        {"store_number": "6", "store_name": "Orange Julius", "phone": "680-8578", "category": "Food Court"},
        {"store_number": "70", "store_name": "Great American Chocolate Chip Cookie Co.", "phone": "680-0077", "category": "Food Court"},
        {"store_number": "1", "store_name": "Piccadilly Cafeteria", "phone": "686-7996", "category": "Food Court"},
        {"store_number": "2", "store_name": "Pizza House", "phone": "682-2500", "category": "Food Court"},
        {"store_number": "75", "store_name": "Sesame Hut", "phone": "682-2905", "category": "Food Court"},
        {"store_number": "8", "store_name": "Splash", "phone": "686-1537", "category": "Food Court"},
        {"store_number": "74", "store_name": "Tasty Chow", "phone": "680-1589", "category": "Food Court"},
        {"store_number": "82", "store_name": "Tropik Sun Fruit and Nuts", "phone": "688-8805", "category": "Food Court"},
        
        # Jewelry & Accessories
        {"store_number": "87", "store_name": "Afterthoughts", "phone": "686-9903", "category": "Jewelry & Accessories"},
        {"store_number": "10", "store_name": "Corrigan's", "phone": "681-3514", "category": "Jewelry & Accessories"},
        {"store_number": "57", "store_name": "Gordon Jewelers", "phone": "688-6695", "category": "Jewelry & Accessories"},
        {"store_number": "81", "store_name": "King Solomon's", "phone": "682-3139", "category": "Jewelry & Accessories"},
        {"store_number": "80", "store_name": "Piercing Pagoda", "phone": "681-2033", "category": "Jewelry & Accessories"},
        {"store_number": "48", "store_name": "Rings & Things", "phone": "681-5178", "category": "Jewelry & Accessories"},
        {"store_number": "60", "store_name": "Sweeney's", "phone": "680-0395", "category": "Jewelry & Accessories"},
        {"store_number": "45", "store_name": "Zales", "phone": "681-4878", "category": "Jewelry & Accessories"},
        
        # Entertainment
        {"store_number": "52", "store_name": "The Gold Mine", "phone": "686-1961", "category": "Entertainment", "subcategory": "Arcade"},
        {"store_number": "84", "store_name": "Northwest 4 Theatre", "phone": "681-3577", "category": "Entertainment", "subcategory": "Movie Theater"},
    ]
    
    return stores

def populate_northwest_mall_stores(db_path: str):
    """
    Populate all Northwest Mall stores in the database
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get the mall ID for Northwest Mall
    cursor.execute("SELECT id FROM malls WHERE name = 'Northwest Mall' AND city = 'Houston'")
    result = cursor.fetchone()
    
    if not result:
        print("Error: Northwest Mall not found in database!")
        return
    
    mall_id = result[0]
    
    # Clear existing stores for this mall (in case we're re-running)
    cursor.execute("DELETE FROM mall_stores WHERE mall_id = ?", (mall_id,))
    
    # Get all store data
    stores = get_northwest_mall_stores()
    
    # Insert all stores
    insert_query = """
        INSERT INTO mall_stores 
        (mall_id, store_number, store_name, phone, category, subcategory, is_anchor, level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    for store in stores:
        cursor.execute(insert_query, (
            mall_id,
            store.get('store_number'),
            store['store_name'],
            store.get('phone'),
            store.get('category'),
            store.get('subcategory'),
            store.get('is_anchor', False),
            1  # All stores are on level 1 for this single-story mall
        ))
    
    conn.commit()
    
    # Print summary
    cursor.execute("SELECT COUNT(*) FROM mall_stores WHERE mall_id = ?", (mall_id,))
    total_stores = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM mall_stores WHERE mall_id = ? AND is_anchor = 1", (mall_id,))
    anchor_stores = cursor.fetchone()[0]
    
    cursor.execute("SELECT category, COUNT(*) FROM mall_stores WHERE mall_id = ? GROUP BY category ORDER BY COUNT(*) DESC", (mall_id,))
    categories = cursor.fetchall()
    
    print(f"Successfully populated Northwest Mall with {total_stores} stores")
    print(f"Anchor stores: {anchor_stores}")
    print("\nStores by category:")
    for category, count in categories:
        print(f"  {category}: {count}")
    
    # Show entertainment venues specifically
    cursor.execute("SELECT store_name, subcategory FROM mall_stores WHERE mall_id = ? AND category = 'Entertainment'", (mall_id,))
    entertainment = cursor.fetchall()
    print(f"\nEntertainment venues:")
    for name, subcat in entertainment:
        print(f"  {name} ({subcat})")
    
    conn.close()

if __name__ == "__main__":
    db_path = "/Users/sara/1980s-malls.sqlite"
    populate_northwest_mall_stores(db_path)
