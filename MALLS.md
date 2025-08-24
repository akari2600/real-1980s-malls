# 1980s Mall Database System

## Overview

This database system captures detailed information about shopping malls from the 1980s era, specifically designed to support VRChat world recreation projects. The system stores mall directories, store inventories, and arcade locations with precise temporal accuracy.

**Database Location**: `/Users/sara/1980s-malls.sqlite`

## Database Schema

### 1. `malls` Table
Stores high-level information about each shopping mall.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique mall identifier |
| `name` | TEXT NOT NULL | Mall name (e.g., "Northwest Mall") |
| `city` | TEXT | City location |
| `state` | TEXT | State abbreviation |
| `address` | TEXT | Physical address if available |
| `publication_date` | DATE | Exact date of directory publication |
| `levels` | INTEGER | Number of floors/levels (default: 1) |
| `source` | TEXT | Source publication (e.g., "Houston Chronicle 1987-08-16") |
| `notes` | TEXT | Additional context, name changes, etc. |
| `created_at` | TIMESTAMP | Record creation timestamp |

### 2. `mall_stores` Table
Stores detailed information about individual stores within each mall.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique store record identifier |
| `mall_id` | INTEGER | Foreign key to `malls.id` |
| `store_number` | TEXT | Store number from directory (e.g., "52", "A-15") |
| `store_name` | TEXT NOT NULL | Business name |
| `phone` | TEXT | Phone number from directory |
| `category` | TEXT | Standardized store category |
| `subcategory` | TEXT | More specific classification |
| `is_anchor` | BOOLEAN | Whether this is an anchor store |
| `level` | INTEGER | Floor level (1=ground floor) |
| `created_at` | TIMESTAMP | Record creation timestamp |

### 3. `arcade_directory` Table
Contains comprehensive 1991 arcade industry data (7,524 records) for research purposes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique record identifier |
| `business_name` | TEXT NOT NULL | Arcade business name |
| `address` | TEXT | Street address |
| `mall_center` | TEXT | Mall or shopping center name |
| `city` | TEXT NOT NULL | City location |
| `state` | TEXT NOT NULL | State abbreviation |
| `zip` | TEXT | ZIP code |
| `mall` | BOOLEAN | Whether located in a mall |
| `created_at` | TIMESTAMP | Record creation timestamp |

## Store Categories

The system uses standardized categories to ensure consistency across different mall directories:

- **Department Stores** - Anchor stores like JC Penney, Sears, Macy's
- **Men's Apparel** - Male clothing stores
- **Women's Apparel** - Female clothing stores  
- **Men's and Women's Apparel** - Unisex clothing (e.g., The Gap)
- **Shoes** - Footwear retailers
- **Food Court** - Restaurants and food vendors
- **Entertainment** - Arcades, movie theaters
- **Specialty Stores** - Electronics, cameras, music, etc.
- **Gifts, Books & Toys** - BookstoreS, toy stores, gift shops
- **Jewelry & Accessories** - Jewelry stores, accessories
- **Services** - Insurance, travel, optical, hair salons

## Current Data

### Northwest Mall (Houston, TX)
- **Publication Date**: August 16, 1987
- **Source**: Houston Chronicle
- **Total Stores**: 84
- **Anchor Stores**: 3 (Beall, Foley's, JC Penney)
- **Levels**: 1 (single-story mall)

**Key Entertainment Venues**:
- Store #52: **The Gold Mine** (Arcade)
- Store #84: **Northwest 4 Theatre** (Movie Theater)

**Essential 1980s Stores**:
- Store #35: **Radio Shack** (Electronics)
- Store #23: **B. Dalton Books** (Bookstore)
- Store #78: **Waldenbooks** (Bookstore)
- Store #44: **Hastings Records** (Music Store)

## Usage Examples

### Basic Queries

**List all stores in a mall:**
```sql
SELECT m.name as mall_name, ms.store_number, ms.store_name, ms.category 
FROM malls m 
JOIN mall_stores ms ON m.id = ms.mall_id 
WHERE m.name = 'Northwest Mall'
ORDER BY CAST(ms.store_number AS INTEGER);
```

**Find all arcades across malls:**
```sql
SELECT m.name, m.city, m.state, ms.store_name, ms.store_number
FROM malls m
JOIN mall_stores ms ON m.id = ms.mall_id
WHERE ms.subcategory = 'Arcade';
```

**Get mall summary statistics:**
```sql
SELECT 
    m.name,
    m.publication_date,
    COUNT(ms.id) as total_stores,
    COUNT(CASE WHEN ms.is_anchor THEN 1 END) as anchor_stores
FROM malls m
LEFT JOIN mall_stores ms ON m.id = ms.mall_id
GROUP BY m.id;
```

### Research Queries

**Find stores by category:**
```sql
SELECT ms.category, COUNT(*) as count
FROM mall_stores ms
JOIN malls m ON ms.mall_id = m.id
WHERE m.name = 'Northwest Mall'
GROUP BY ms.category
ORDER BY count DESC;
```

**Cross-reference with arcade database:**
```sql
SELECT 
    ms.store_name as mall_arcade,
    ad.business_name as directory_arcade,
    m.city, m.state
FROM malls m
JOIN mall_stores ms ON m.id = ms.mall_id
LEFT JOIN arcade_directory ad ON (
    ad.city = m.city AND 
    ad.state = m.state AND
    ad.mall = 1
)
WHERE ms.subcategory = 'Arcade';
```

## MCP Server Integration

The database is accessible through an MCP (Model Context Protocol) server for programmatic queries:

**Configuration** (in `.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["-y", "mcp-sqlite", "/Users/sara/1980s-malls.sqlite"]
    }
  }
}
```

**Available Tools**:
- `query` - Execute custom SQL queries
- `create_record` - Insert new records
- `read_records` - Query with filters
- `update_records` - Modify existing data
- `delete_records` - Remove records

## Data Population Workflow

1. **Create mall entry** with precise publication date and source
2. **Run Python script** to bulk-populate stores from directory
3. **Standardize categories** to ensure consistency across malls
4. **Verify data** through MCP server queries

## Future Enhancements

- **Geospatial data**: Store coordinates for spatial mall layouts
- **Multi-level support**: Enhanced floor/level tracking for complex malls
- **Store chains**: Link individual stores to parent companies
- **Temporal tracking**: Version control for stores that change over time
- **Image integration**: Link to store photos and directory scans

## Research Applications

This database enables comprehensive research for VRChat world recreation:

- **Store authenticity**: Research actual 1980s store layouts and inventory
- **Temporal accuracy**: Recreate malls as they existed on specific dates  
- **Chain analysis**: Understand which stores were common in the era
- **Regional variations**: Compare mall compositions across different areas
- **Entertainment focus**: Identify arcade and entertainment venue patterns

The system provides the foundation for creating historically accurate virtual recreations of 1980s American shopping mall culture.

